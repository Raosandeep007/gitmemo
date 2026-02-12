import { OWNER, octokit, REPO } from "@/github";
import type { User, UserStats } from "@/types/github";
import { UserRole, UserState } from "@/types/github";

export const userService = {
  async getCurrentUser(): Promise<User> {
    const { data } = await octokit.rest.users.getAuthenticated();
    console.log("data:", data);

    return {
      name: `users/${data.login}`,
      username: data.login,
      displayName: data.name || data.login,
      email: data.email || "",
      avatarUrl: data.avatar_url,
      description: data.bio || "",
      role: UserRole.ADMIN,
      state: UserState.NORMAL,
    };
  },

  async getUserStats(username?: string): Promise<UserStats> {
    // Get all labels for tag counts
    const { data: labels } = await octokit.rest.issues.listLabelsForRepo({
      owner: OWNER,
      repo: REPO,
      per_page: 100,
    });

    const tagCount: Record<string, number> = {};
    for (const label of labels) {
      if (label.name.startsWith("tag:")) {
        // Use a rough estimate — exact count requires listing issues per label
        tagCount[label.name.slice(4)] = 1;
      }
    }

    // GitHub API returns total_count in search but not in list
    // We use the array length from per_page=1 as an indicator
    // For accurate counts we'd need to use the search API
    const { data: searchOpen } =
      await octokit.rest.search.issuesAndPullRequests({
        q: `repo:${OWNER}/${REPO} is:issue is:open`,
      });
    const { data: searchClosed } =
      await octokit.rest.search.issuesAndPullRequests({
        q: `repo:${OWNER}/${REPO} is:issue is:closed -label:deleted`,
      });
    const { data: recentIssues } = await octokit.rest.issues.listForRepo({
      owner: OWNER,
      repo: REPO,
      state: "all",
      per_page: 100,
      ...(username ? { creator: username } : {}),
    });
    const memoDisplayTimestamps = recentIssues
      .filter((issue) => !issue.pull_request)
      .map((issue) => new Date(issue.created_at));

    return {
      memoCount: searchOpen.total_count,
      archivedMemoCount: searchClosed.total_count,
      tagCount,
      memoTypeStats: {
        linkCount: 0,
        codeCount: 0,
        todoCount: 0,
      },
      memoDisplayTimestamps,
    };
  },
};
