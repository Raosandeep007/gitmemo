import { Octokit } from "@octokit/rest";
import { Loader2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearGitHubConfig, getGitHubConfig, setGitHubConfig } from "@/github";

interface Props {
  onConfigured?: () => void;
  initialError?: string;
}

const GitHubSetup = ({ onConfigured, initialError }: Props) => {
  const initialConfig = useMemo(() => getGitHubConfig(), []);

  const [token, setToken] = useState(initialConfig.token);
  const [owner, setOwner] = useState(initialConfig.owner);
  const [repo, setRepo] = useState(initialConfig.repo);
  const [error, setError] = useState(initialError ?? "");
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const runValidation = async (values: { token: string; owner: string; repo: string }) => {
    const client = new Octokit({ auth: values.token });

    await client.rest.users.getAuthenticated();
    await client.rest.repos.get({ owner: values.owner, repo: values.repo });
  };

  const validateAndNormalize = () => {
    const values = {
      token: token.trim(),
      owner: owner.trim(),
      repo: repo.trim(),
    };

    if (!values.token || !values.owner || !values.repo) {
      throw new Error("All fields are required.");
    }

    return values;
  };

  const handleTest = async () => {
    setError("");
    setIsTesting(true);

    try {
      const values = validateAndNormalize();
      await runValidation(values);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to connect to GitHub.";
      setError(message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setError("");
    setIsSaving(true);

    try {
      const values = validateAndNormalize();
      await runValidation(values);
      setGitHubConfig(values);

      if (onConfigured) {
        onConfigured();
      } else {
        window.location.assign("/");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save GitHub configuration.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    clearGitHubConfig();
    setToken("");
    setOwner("");
    setRepo("");
    setError("");
  };

  return (
    <section className="w-full min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">GitHub Setup</h1>
          <p className="text-sm text-muted-foreground">Add your GitHub token and repository to continue.</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="github-token" className="text-sm text-muted-foreground">
              VITE_GITHUB_TOKEN
            </label>
            <Input id="github-token" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_..." />
          </div>

          <div className="space-y-1">
            <label htmlFor="github-owner" className="text-sm text-muted-foreground">
              VITE_GITHUB_OWNER
            </label>
            <Input id="github-owner" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="your-github-username" />
          </div>

          <div className="space-y-1">
            <label htmlFor="github-repo" className="text-sm text-muted-foreground">
              VITE_GITHUB_REPO
            </label>
            <Input id="github-repo" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="your-repo-name" />
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={handleTest} disabled={isTesting || isSaving}>
            {isTesting ? <Loader2Icon className="w-4 h-4 animate-spin" /> : null}
            Test Connection
          </Button>
          <Button type="button" onClick={handleSave} disabled={isTesting || isSaving}>
            {isSaving ? <Loader2Icon className="w-4 h-4 animate-spin" /> : null}
            Save and Continue
          </Button>
          <Button type="button" variant="ghost" onClick={handleClear} disabled={isTesting || isSaving}>
            Clear
          </Button>
        </div>
      </div>
    </section>
  );
};

export default GitHubSetup;
