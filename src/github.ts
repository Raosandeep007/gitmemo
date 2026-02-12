import { Octokit } from "@octokit/rest";

export const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN as string;
export const OWNER = import.meta.env.VITE_GITHUB_OWNER as string;
export const REPO = import.meta.env.VITE_GITHUB_REPO as string;

if (!GITHUB_TOKEN || !OWNER || !REPO) {
  throw new Error("Missing required environment variables: VITE_GITHUB_TOKEN, VITE_GITHUB_OWNER, VITE_GITHUB_REPO");
}

export const octokit = new Octokit({ auth: GITHUB_TOKEN });
