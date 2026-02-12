import { OWNER, octokit, REPO } from "@/github";
import type {
  Attachment,
  GitHubReactionContent,
  ListMemosRequest,
  ListMemosResponse,
  Location,
  Memo,
  MemoComment,
  MemoReaction,
  MemoRelation,
} from "@/types/github";
import { MemoState, Visibility } from "@/types/github";

// ============================================================================
// Frontmatter helpers — store metadata in issue body as YAML frontmatter
// ============================================================================

interface MemoFrontmatter {
  visibility?: string;
  location?: Location;
  relations?: MemoRelation[];
  attachments?: string[]; // attachment names
}

function encodeFrontmatter(meta: MemoFrontmatter): string {
  const lines: string[] = ["---"];
  if (meta.visibility) lines.push(`visibility: ${meta.visibility}`);
  if (meta.location) {
    lines.push(`location_lat: ${meta.location.latitude}`);
    lines.push(`location_lng: ${meta.location.longitude}`);
  }
  if (meta.relations && meta.relations.length > 0) {
    lines.push(`relations: ${JSON.stringify(meta.relations)}`);
  }
  if (meta.attachments && meta.attachments.length > 0) {
    lines.push(`attachments: ${JSON.stringify(meta.attachments)}`);
  }
  lines.push("---");
  return lines.join("\n");
}

function parseFrontmatter(body: string): {
  meta: MemoFrontmatter;
  content: string;
} {
  const match = body.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, content: body };

  const frontmatterStr = match[1];
  const content = match[2];
  const meta: MemoFrontmatter = {};

  for (const line of frontmatterStr.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();

    if (key === "visibility") meta.visibility = val;
    if (key === "location_lat")
      meta.location = {
        ...(meta.location || { latitude: 0, longitude: 0 }),
        latitude: Number(val),
      };
    if (key === "location_lng")
      meta.location = {
        ...(meta.location || { latitude: 0, longitude: 0 }),
        longitude: Number(val),
      };
    if (key === "relations") {
      try {
        meta.relations = JSON.parse(val);
      } catch {
        /* skip */
      }
    }
    if (key === "attachments") {
      try {
        meta.attachments = JSON.parse(val);
      } catch {
        /* skip */
      }
    }
  }

  return { meta, content };
}

// ============================================================================
// Issue → Memo converter
// ============================================================================

function extractTags(labels: Array<{ name?: string }>): string[] {
  return labels
    .map((l) => l.name || "")
    .filter((name) => name.startsWith("tag:"))
    .map((name) => name.slice(4));
}

function isPinned(labels: Array<{ name?: string }>): boolean {
  return labels.some((l) => l.name === "pinned");
}

function deriveProperty(content: string) {
  return {
    hasLink: /(https?:\/\/|www\.)/i.test(content),
    hasTaskList: /(^|\n)\s*-\s\[[xX ]\]\s+/.test(content),
    hasCode: /```[\s\S]*?```|`[^`]+`/.test(content),
  };
}

// biome-ignore lint/suspicious/noExplicitAny: GitHub API response type
function issueToMemo(issue: any): Memo {
  const body = issue.body || "";
  const { meta, content } = parseFrontmatter(body);

  const reactions: MemoReaction[] = [];
  // Reactions are fetched separately when needed

  return {
    name: `memos/${issue.number}`,
    uid: issue.number,
    title: issue.title || "",
    content,
    tags: extractTags(issue.labels || []),
    state: issue.state === "open" ? MemoState.NORMAL : MemoState.ARCHIVED,
    pinned: isPinned(issue.labels || []),
    creator: `users/${issue.user?.login || ""}`,
    createTime: new Date(issue.created_at),
    updateTime: new Date(issue.updated_at),
    reactions,
    attachments: (meta.attachments || []).map((name: string) => ({
      name,
      filename: name.replace("attachments/", ""),
      externalLink: `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${name}`,
      type: "",
      size: 0,
      sha: "",
    })),
    relations: meta.relations || [],
    location: meta.location,
    visibility: (meta.visibility as Visibility) || Visibility.PRIVATE,
    displayTime: new Date(issue.created_at),
    snippet: content.slice(0, 200),
    property: deriveProperty(content),
    parent: undefined,
  };
}

// ============================================================================
// Build issue body from memo data
// ============================================================================

function buildIssueBody(content: string, meta: MemoFrontmatter): string {
  const hasMeta =
    meta.visibility || meta.location || (meta.relations && meta.relations.length > 0) || (meta.attachments && meta.attachments.length > 0);
  if (!hasMeta) return content;
  return `${encodeFrontmatter(meta)}\n${content}`;
}

function buildLabels(tags: string[], pinned: boolean): string[] {
  const labels = tags.map((t) => `tag:${t}`);
  if (pinned) labels.push("pinned");
  return labels;
}

// ============================================================================
// Ensure labels exist in repo
// ============================================================================

async function ensureLabels(labels: string[]): Promise<void> {
  for (const label of labels) {
    try {
      await octokit.rest.issues.getLabel({
        owner: OWNER,
        repo: REPO,
        name: label,
      });
    } catch {
      await octokit.rest.issues.createLabel({
        owner: OWNER,
        repo: REPO,
        name: label,
        color: label === "pinned" ? "e4e669" : "0075ca",
      });
    }
  }
}

// ============================================================================
// Parse page token (we use page number as token)
// ============================================================================

function parsePageToken(token: string): number {
  const page = parseInt(token, 10);
  return Number.isNaN(page) ? 1 : page;
}

// ============================================================================
// Parse filter string — simple CEL-like filter parsing
// ============================================================================

interface ParsedFilter {
  tags?: string[];
  creator?: string;
  contentSearch?: string;
  hasLink?: boolean;
  hasCode?: boolean;
  hasTodo?: boolean;
  pinned?: boolean;
}

function parseFilter(filter: string): ParsedFilter {
  const result: ParsedFilter = {};
  if (!filter) return result;

  // Extract tag filters like: tag in ["tag1", "tag2"]
  const tagMatch = filter.match(/tag\s+in\s+\[([^\]]+)\]/);
  if (tagMatch) {
    result.tags = tagMatch[1].split(",").map((t) => t.trim().replace(/"/g, ""));
  }

  // Extract creator filter
  const creatorMatch = filter.match(/creator\s*==\s*"([^"]+)"/);
  if (creatorMatch) {
    result.creator = creatorMatch[1];
  }

  // Extract content search
  const contentMatch = filter.match(/content\.contains\("([^"]+)"\)/);
  if (contentMatch) {
    result.contentSearch = contentMatch[1];
  }

  // Extract pinned filter
  if (filter.includes("pinned == true")) {
    result.pinned = true;
  }

  return result;
}

// ============================================================================
// Public API
// ============================================================================

export const memoService = {
  async listMemos(request: Partial<ListMemosRequest> = {}): Promise<ListMemosResponse> {
    const pageSize = request.pageSize || 20;
    const page = request.pageToken ? parsePageToken(request.pageToken) : 1;
    const parsedFilter = parseFilter(request.filter || "");

    const state = request.state === MemoState.ARCHIVED ? "closed" : "open";
    const labels = parsedFilter.tags?.map((t) => `tag:${t}`).join(",") || undefined;

    const { data } = await octokit.rest.issues.listForRepo({
      owner: OWNER,
      repo: REPO,
      state: state as "open" | "closed",
      labels,
      per_page: pageSize,
      page,
      sort: "updated",
      direction: "desc",
    });

    // Filter out pull requests (GitHub API returns PRs in issues endpoint)
    const issues = data.filter((issue) => !issue.pull_request);

    let memos = issues.map(issueToMemo);

    // Apply client-side filters that GitHub API can't handle
    if (parsedFilter.contentSearch) {
      const search = parsedFilter.contentSearch.toLowerCase();
      memos = memos.filter((m) => m.content.toLowerCase().includes(search));
    }
    if (parsedFilter.creator) {
      memos = memos.filter((m) => m.creator === parsedFilter.creator);
    }
    if (parsedFilter.pinned) {
      memos = memos.filter((m) => m.pinned);
    }

    const nextPageToken = issues.length === pageSize ? String(page + 1) : "";

    return { memos, nextPageToken };
  },

  async getMemo(nameOrNumber: string | number): Promise<Memo> {
    const issueNumber = typeof nameOrNumber === "number" ? nameOrNumber : parseInt(String(nameOrNumber).replace("memos/", ""), 10);

    const { data } = await octokit.rest.issues.get({
      owner: OWNER,
      repo: REPO,
      issue_number: issueNumber,
    });

    const memo = issueToMemo(data);

    // Fetch reactions
    const { data: reactions } = await octokit.rest.reactions.listForIssue({
      owner: OWNER,
      repo: REPO,
      issue_number: issueNumber,
    });

    memo.reactions = reactions.map((r) => ({
      name: `memos/${issueNumber}/reactions/${r.id}`,
      creator: `users/${r.user?.login || ""}`,
      reactionType: r.content,
      contentId: `memos/${issueNumber}`,
    }));

    return memo;
  },

  async createMemo(memo: {
    content: string;
    visibility?: Visibility;
    attachments?: Attachment[];
    relations?: MemoRelation[];
    location?: Location;
    tags?: string[];
    pinned?: boolean;
  }): Promise<Memo> {
    // Extract tags from content (lines starting with #tag)
    const contentTags = extractTagsFromContent(memo.content);
    const allTags = [...new Set([...(memo.tags || []), ...contentTags])];

    const labels = buildLabels(allTags, memo.pinned || false);
    if (labels.length > 0) {
      await ensureLabels(labels);
    }

    const body = buildIssueBody(memo.content, {
      visibility: memo.visibility,
      location: memo.location,
      relations: memo.relations,
      attachments: memo.attachments?.map((a) => a.name),
    });

    // Use first line as title, or truncate content
    const title = memo.content.split("\n")[0].slice(0, 100) || "Untitled memo";

    const { data } = await octokit.rest.issues.create({
      owner: OWNER,
      repo: REPO,
      title,
      body,
      labels,
    });

    return issueToMemo(data);
  },

  async updateMemo(name: string, update: Partial<Memo> & { visibility?: Visibility }, updateMask?: string[]): Promise<Memo> {
    const issueNumber = parseInt(name.replace("memos/", ""), 10);

    // Fetch current issue to merge
    const { data: current } = await octokit.rest.issues.get({
      owner: OWNER,
      repo: REPO,
      issue_number: issueNumber,
    });

    const currentMemo = issueToMemo(current);
    const fields = updateMask || Object.keys(update);

    const newContent = fields.includes("content") ? (update.content ?? currentMemo.content) : currentMemo.content;
    const newVisibility = fields.includes("visibility")
      ? (update.visibility ?? (currentMemo as Memo & { visibility: Visibility }).visibility)
      : (currentMemo as Memo & { visibility: Visibility }).visibility;
    const newLocation = fields.includes("location") ? update.location : currentMemo.location;
    const newRelations = fields.includes("relations") ? (update.relations ?? currentMemo.relations) : currentMemo.relations;
    const newAttachments = fields.includes("attachments") ? (update.attachments ?? currentMemo.attachments) : currentMemo.attachments;
    const newPinned = fields.includes("pinned") ? (update.pinned ?? currentMemo.pinned) : currentMemo.pinned;

    // Extract tags from content
    const contentTags = extractTagsFromContent(newContent);
    const allTags = [...new Set([...(update.tags || []), ...contentTags])];

    const labels = buildLabels(allTags, newPinned);
    if (labels.length > 0) {
      await ensureLabels(labels);
    }

    const body = buildIssueBody(newContent, {
      visibility: newVisibility,
      location: newLocation,
      relations: newRelations,
      attachments: newAttachments.map((a) => a.name),
    });

    const title = newContent.split("\n")[0].slice(0, 100) || "Untitled memo";

    // Handle state change
    let state: "open" | "closed" | undefined;
    if (fields.includes("state") && update.state) {
      state = update.state === MemoState.ARCHIVED ? "closed" : "open";
    }

    const { data } = await octokit.rest.issues.update({
      owner: OWNER,
      repo: REPO,
      issue_number: issueNumber,
      title,
      body,
      labels,
      state,
    });

    return issueToMemo(data);
  },

  async deleteMemo(name: string): Promise<void> {
    const issueNumber = parseInt(name.replace("memos/", ""), 10);

    // GitHub REST API doesn't support deleting issues directly.
    // We close it and add a "deleted" label to mark it as deleted.
    await ensureLabels(["deleted"]);
    await octokit.rest.issues.update({
      owner: OWNER,
      repo: REPO,
      issue_number: issueNumber,
      state: "closed",
      labels: ["deleted"],
    });
  },

  async archiveMemo(name: string): Promise<Memo> {
    const issueNumber = parseInt(name.replace("memos/", ""), 10);
    const { data } = await octokit.rest.issues.update({
      owner: OWNER,
      repo: REPO,
      issue_number: issueNumber,
      state: "closed",
    });
    return issueToMemo(data);
  },

  async restoreMemo(name: string): Promise<Memo> {
    const issueNumber = parseInt(name.replace("memos/", ""), 10);
    const { data } = await octokit.rest.issues.update({
      owner: OWNER,
      repo: REPO,
      issue_number: issueNumber,
      state: "open",
    });
    return issueToMemo(data);
  },

  // ============================================================================
  // Comments
  // ============================================================================

  async listMemoComments(name: string): Promise<MemoComment[]> {
    const issueNumber = parseInt(name.replace("memos/", ""), 10);
    const { data } = await octokit.rest.issues.listComments({
      owner: OWNER,
      repo: REPO,
      issue_number: issueNumber,
    });

    return data.map((c) => {
      const content = c.body || "";
      return {
        name: `memos/${issueNumber}/comments/${c.id}`,
        id: c.id,
        uid: c.id,
        title: content.split("\n")[0].slice(0, 100) || "Comment",
        content,
        snippet: content.slice(0, 200),
        tags: [],
        state: MemoState.NORMAL,
        pinned: false,
        creator: `users/${c.user?.login || ""}`,
        createTime: new Date(c.created_at),
        updateTime: new Date(c.updated_at),
        displayTime: new Date(c.created_at),
        reactions: [],
        attachments: [],
        relations: [],
        location: undefined,
        visibility: Visibility.PRIVATE,
        property: deriveProperty(content),
        parent: name,
      };
    });
  },

  async createMemoComment(name: string, body: string): Promise<MemoComment> {
    const issueNumber = parseInt(name.replace("memos/", ""), 10);
    const { data } = await octokit.rest.issues.createComment({
      owner: OWNER,
      repo: REPO,
      issue_number: issueNumber,
      body,
    });

    const content = data.body || "";
    return {
      name: `memos/${issueNumber}/comments/${data.id}`,
      id: data.id,
      uid: data.id,
      title: content.split("\n")[0].slice(0, 100) || "Comment",
      content,
      snippet: content.slice(0, 200),
      tags: [],
      state: MemoState.NORMAL,
      pinned: false,
      creator: `users/${data.user?.login || ""}`,
      createTime: new Date(data.created_at),
      updateTime: new Date(data.updated_at),
      displayTime: new Date(data.created_at),
      reactions: [],
      attachments: [],
      relations: [],
      location: undefined,
      visibility: Visibility.PRIVATE,
      property: deriveProperty(content),
      parent: name,
    };
  },

  // ============================================================================
  // Reactions
  // ============================================================================

  async listMemoReactions(name: string): Promise<MemoReaction[]> {
    const issueNumber = parseInt(name.replace("memos/", ""), 10);
    const { data } = await octokit.rest.reactions.listForIssue({
      owner: OWNER,
      repo: REPO,
      issue_number: issueNumber,
    });

    return data.map((r) => ({
      name: `memos/${issueNumber}/reactions/${r.id}`,
      creator: `users/${r.user?.login || ""}`,
      reactionType: r.content,
      contentId: `memos/${issueNumber}`,
    }));
  },

  async upsertMemoReaction(name: string, reactionType: string): Promise<MemoReaction> {
    const issueNumber = parseInt(name.replace("memos/", ""), 10);
    const { data } = await octokit.rest.reactions.createForIssue({
      owner: OWNER,
      repo: REPO,
      issue_number: issueNumber,
      content: reactionType as GitHubReactionContent,
    });

    return {
      name: `memos/${issueNumber}/reactions/${data.id}`,
      creator: `users/${data.user?.login || ""}`,
      reactionType: data.content,
      contentId: name,
    };
  },

  async deleteMemoReaction(reactionName: string): Promise<void> {
    // Parse: "memos/{issue}/reactions/{reactionId}"
    const parts = reactionName.split("/");
    const issueNumber = parseInt(parts[1], 10);
    const reactionId = parseInt(parts[3], 10);

    await octokit.rest.reactions.deleteForIssue({
      owner: OWNER,
      repo: REPO,
      issue_number: issueNumber,
      reaction_id: reactionId,
    });
  },
};

// ============================================================================
// Helpers
// ============================================================================

/** Extract #tags from markdown content */
function extractTagsFromContent(content: string): string[] {
  const tags: string[] = [];
  // Match #tag patterns (not inside code blocks)
  const matches = content.match(/(?:^|\s)#([a-zA-Z0-9_\-/]+)/g);
  if (matches) {
    for (const match of matches) {
      const tag = match.trim().slice(1); // Remove leading # and whitespace
      if (tag && !tags.includes(tag)) {
        tags.push(tag);
      }
    }
  }
  return tags;
}
