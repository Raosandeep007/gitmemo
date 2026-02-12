import { Octokit } from "@octokit/rest";

const STORAGE_KEYS = {
  token: "VITE_GITHUB_TOKEN",
  owner: "VITE_GITHUB_OWNER",
  repo: "VITE_GITHUB_REPO",
} as const;

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

const readFromStorage = (): GitHubConfig => {
  if (typeof window === "undefined") {
    return { token: "", owner: "", repo: "" };
  }

  return {
    token: localStorage.getItem(STORAGE_KEYS.token) ?? "",
    owner: localStorage.getItem(STORAGE_KEYS.owner) ?? "",
    repo: localStorage.getItem(STORAGE_KEYS.repo) ?? "",
  };
};

const writeToStorage = (config: GitHubConfig) => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEYS.token, config.token.trim());
  localStorage.setItem(STORAGE_KEYS.owner, config.owner.trim());
  localStorage.setItem(STORAGE_KEYS.repo, config.repo.trim());
};

const clearStorage = () => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.owner);
  localStorage.removeItem(STORAGE_KEYS.repo);
};

const config = readFromStorage();

export let GITHUB_TOKEN = config.token;
export let OWNER = config.owner;
export let REPO = config.repo;

export let octokit = new Octokit({ auth: GITHUB_TOKEN || undefined });

export const hasGitHubConfig = (): boolean => {
  return Boolean(GITHUB_TOKEN && OWNER && REPO);
};

export const getGitHubConfig = (): GitHubConfig => ({
  token: GITHUB_TOKEN,
  owner: OWNER,
  repo: REPO,
});

export const setGitHubConfig = (nextConfig: GitHubConfig) => {
  const normalized = {
    token: nextConfig.token.trim(),
    owner: nextConfig.owner.trim(),
    repo: nextConfig.repo.trim(),
  };

  writeToStorage(normalized);

  GITHUB_TOKEN = normalized.token;
  OWNER = normalized.owner;
  REPO = normalized.repo;
  octokit = new Octokit({ auth: GITHUB_TOKEN || undefined });
};

export const clearGitHubConfig = () => {
  clearStorage();

  GITHUB_TOKEN = "";
  OWNER = "";
  REPO = "";
  octokit = new Octokit({});
};
