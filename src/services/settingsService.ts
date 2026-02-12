import { OWNER, octokit, REPO } from "@/github";
import type { Shortcut, UserSettings } from "@/types/github";
import { Visibility } from "@/types/github";

const SETTINGS_PATH = ".memos/settings.json";
const SHORTCUTS_PATH = ".memos/shortcuts.json";

const DEFAULT_SETTINGS: UserSettings = {
  locale: "en",
  appearance: "system",
  theme: "system",
  memoVisibility: Visibility.PRIVATE,
};

// ============================================================================
// Generic JSON file helpers
// ============================================================================

async function readJsonFile<T>(
  path: string,
  defaultValue: T,
): Promise<{ data: T; sha: string }> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path,
    });

    if (Array.isArray(data) || data.type !== "file" || !data.content) {
      return { data: defaultValue, sha: "" };
    }

    const content = atob(data.content);
    return { data: JSON.parse(content), sha: data.sha };
  } catch (e: unknown) {
    if (
      e &&
      typeof e === "object" &&
      "status" in e &&
      (e as { status: number }).status === 404
    ) {
      return { data: defaultValue, sha: "" };
    }
    throw e;
  }
}

async function writeJsonFile<T>(
  path: string,
  data: T,
  sha: string,
  message: string,
): Promise<string> {
  const content = btoa(JSON.stringify(data, null, 2));

  const params: {
    owner: string;
    repo: string;
    path: string;
    message: string;
    content: string;
    sha?: string;
  } = {
    owner: OWNER,
    repo: REPO,
    path,
    message,
    content,
  };
  if (sha) params.sha = sha;

  const { data: result } =
    await octokit.rest.repos.createOrUpdateFileContents(params);
  return result.content?.sha || "";
}

// ============================================================================
// Settings API
// ============================================================================

export const settingsService = {
  async getSettings(): Promise<UserSettings> {
    const { data } = await readJsonFile<UserSettings>(
      SETTINGS_PATH,
      DEFAULT_SETTINGS,
    );
    const merged = { ...DEFAULT_SETTINGS, ...data };
    return {
      ...merged,
      theme: merged.theme ?? merged.appearance ?? "system",
      appearance: merged.appearance ?? merged.theme ?? "system",
    };
  },

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const { data: current, sha } = await readJsonFile<UserSettings>(
      SETTINGS_PATH,
      DEFAULT_SETTINGS,
    );
    const updated = {
      ...DEFAULT_SETTINGS,
      ...current,
      ...settings,
      theme:
        settings.theme ??
        settings.appearance ??
        current.theme ??
        current.appearance ??
        "system",
      appearance:
        settings.appearance ??
        settings.theme ??
        current.appearance ??
        current.theme ??
        "system",
    };
    await writeJsonFile(SETTINGS_PATH, updated, sha, "Update user settings");
    return updated;
  },

  // ============================================================================
  // Shortcuts API
  // ============================================================================

  async getShortcuts(): Promise<Shortcut[]> {
    const { data } = await readJsonFile<Shortcut[]>(SHORTCUTS_PATH, []);
    return data;
  },

  async createShortcut(shortcut: {
    title: string;
    filter: string;
  }): Promise<Shortcut> {
    const { data: shortcuts, sha } = await readJsonFile<Shortcut[]>(
      SHORTCUTS_PATH,
      [],
    );
    const id = crypto.randomUUID();
    const newShortcut: Shortcut = {
      name: `shortcuts/${id}`,
      id,
      title: shortcut.title,
      filter: shortcut.filter,
    };
    shortcuts.push(newShortcut);
    await writeJsonFile(
      SHORTCUTS_PATH,
      shortcuts,
      sha,
      `Create shortcut: ${shortcut.title}`,
    );
    return newShortcut;
  },

  async updateShortcut(shortcut: Shortcut): Promise<Shortcut> {
    const { data: shortcuts, sha } = await readJsonFile<Shortcut[]>(
      SHORTCUTS_PATH,
      [],
    );
    const index = shortcuts.findIndex((s) => s.id === shortcut.id);
    if (index === -1) throw new Error(`Shortcut not found: ${shortcut.id}`);
    shortcuts[index] = shortcut;
    await writeJsonFile(
      SHORTCUTS_PATH,
      shortcuts,
      sha,
      `Update shortcut: ${shortcut.title}`,
    );
    return shortcut;
  },

  async deleteShortcut(name: string): Promise<void> {
    const id = name.replace("shortcuts/", "");
    const { data: shortcuts, sha } = await readJsonFile<Shortcut[]>(
      SHORTCUTS_PATH,
      [],
    );
    const filtered = shortcuts.filter((s) => s.id !== id);
    await writeJsonFile(
      SHORTCUTS_PATH,
      filtered,
      sha,
      `Delete shortcut: ${id}`,
    );
  },
};
