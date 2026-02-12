import { OWNER, octokit, REPO } from "@/github";
import type { Attachment } from "@/types/github";

const ATTACHMENTS_DIR = "attachments";

function fileToAttachment(file: {
  name?: string;
  path?: string;
  sha?: string;
  size?: number;
  download_url?: string | null;
}): Attachment {
  const filename = file.name || "";
  const timestampPart = filename.split("_")[0];
  const timestamp = Number(timestampPart);
  return {
    name: `attachments/${filename}`,
    filename,
    externalLink:
      file.download_url ||
      `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${file.path || ""}`,
    type: "", // MIME type not available from GitHub API listing
    size: file.size || 0,
    sha: file.sha || "",
    createTime:
      !Number.isNaN(timestamp) && timestamp > 0
        ? new Date(timestamp)
        : undefined,
  };
}

export const attachmentService = {
  async listAttachments(): Promise<Attachment[]> {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: ATTACHMENTS_DIR,
      });

      if (!Array.isArray(data)) return [];
      return data.map(fileToAttachment);
    } catch (e: unknown) {
      // Directory doesn't exist yet
      if (
        e &&
        typeof e === "object" &&
        "status" in e &&
        (e as { status: number }).status === 404
      )
        return [];
      throw e;
    }
  },

  async createAttachment(file: File): Promise<Attachment> {
    const buffer = await file.arrayBuffer();
    const content = btoa(
      new Uint8Array(buffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        "",
      ),
    );

    // Generate unique filename to avoid collisions
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name}`;
    const path = `${ATTACHMENTS_DIR}/${filename}`;

    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path,
      message: `Upload attachment: ${file.name}`,
      content,
    });

    return {
      name: `attachments/${filename}`,
      filename,
      externalLink: `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${path}`,
      type: file.type,
      size: file.size,
      sha: data.content?.sha || "",
      createTime: new Date(),
    };
  },

  async deleteAttachment(name: string, sha: string): Promise<void> {
    const filename = name.replace("attachments/", "");
    const path = `${ATTACHMENTS_DIR}/${filename}`;

    // If no sha provided, fetch it first
    let fileSha = sha;
    if (!fileSha) {
      const { data } = await octokit.rest.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path,
      });
      if (!Array.isArray(data)) {
        fileSha = data.sha;
      }
    }

    await octokit.rest.repos.deleteFile({
      owner: OWNER,
      repo: REPO,
      path,
      message: `Delete attachment: ${filename}`,
      sha: fileSha,
    });
  },

  getAttachmentUrl(name: string): string {
    const filename = name.replace("attachments/", "");
    return `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${ATTACHMENTS_DIR}/${filename}`;
  },
};
