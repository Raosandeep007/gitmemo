import { Octokit } from "@octokit/rest";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearGitHubConfig, getGitHubConfig, setGitHubConfig } from "@/github";

interface Props {
  onConfigured?: () => void;
  initialError?: string;
}

type Step = "idle" | "requesting" | "verifying" | "repo-setup";

interface Verification {
  user_code: string;
  verification_uri: string;
  expires_in: number;
}

const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined;
const OAUTH_PROXY = "/api/github-oauth";

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

const GitHubSetup = ({ onConfigured, initialError }: Props) => {
  const existingConfig = getGitHubConfig();

  const [step, setStep] = useState<Step>("idle");
  const [verification, setVerification] = useState<Verification | null>(null);
  const [oauthToken, setOauthToken] = useState("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState(existingConfig.repo);
  const [error, setError] = useState(initialError ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const handleConnect = async () => {
    if (!CLIENT_ID) {
      setError("VITE_GITHUB_CLIENT_ID is not set. Add it to your .env file.");
      return;
    }

    setError("");
    setStep("requesting");

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      // Step 1: request device code
      const codeRes = await fetch(`${OAUTH_PROXY}/device/code`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ client_id: CLIENT_ID, scope: "repo" }),
        signal: abort.signal,
      });

      if (!codeRes.ok)
        throw new Error("Failed to request a device code from GitHub.");

      const codeData = await codeRes.json();
      setVerification({
        user_code: codeData.user_code,
        verification_uri: codeData.verification_uri,
        expires_in: codeData.expires_in,
      });
      setStep("verifying");

      // Step 2: poll for token
      let pollInterval: number = codeData.interval ?? 5;
      const deviceCode: string = codeData.device_code;

      while (!abort.signal.aborted) {
        await sleep(pollInterval * 1000, abort.signal);

        const tokenRes = await fetch(`${OAUTH_PROXY}/oauth/access_token`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: CLIENT_ID,
            device_code: deviceCode,
            grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          }),
          signal: abort.signal,
        });

        const tokenData = await tokenRes.json();

        if (tokenData.access_token) {
          const octokit = new Octokit({ auth: tokenData.access_token });
          const { data: user } = await octokit.rest.users.getAuthenticated();
          setOauthToken(tokenData.access_token);
          setOwner(user.login);
          setStep("repo-setup");
          return;
        }

        if (tokenData.error === "authorization_pending") continue;
        if (tokenData.error === "slow_down") {
          pollInterval += 5;
          continue;
        }
        if (tokenData.error === "expired_token")
          throw new Error("The code expired. Please try again.");
        if (tokenData.error === "access_denied")
          throw new Error("Authorization was denied.");
        throw new Error(
          tokenData.error_description ??
            tokenData.error ??
            "Authorization failed.",
        );
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // user cancelled
      setError(e instanceof Error ? e.message : "GitHub authorization failed.");
      setStep("idle");
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setVerification(null);
    setError("");
    setStep("idle");
  };

  const handleSave = async () => {
    if (!repo.trim()) {
      setError("Repository name is required.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const values = { token: oauthToken, owner, repo: repo.trim() };
      const octokit = new Octokit({ auth: values.token });
      await octokit.rest.repos.get({ owner: values.owner, repo: values.repo });
      setGitHubConfig(values);

      if (onConfigured) {
        onConfigured();
      } else {
        window.location.assign("/");
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to save GitHub configuration.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    clearGitHubConfig();
    setOauthToken("");
    setOwner("");
    setRepo("");
    setVerification(null);
    setError("");
    setStep("idle");
  };

  return (
    <section className="w-full min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 space-y-5">
        {/* idle */}
        {step === "idle" && (
          <>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">GitHub Setup</h1>
              <p className="text-sm text-muted-foreground">
                Connect your GitHub account to store memos as Issues.
              </p>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="button" onClick={handleConnect}>
              Connect with GitHub
            </Button>
          </>
        )}

        {/* requesting */}
        {step === "requesting" && (
          <>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">Connecting…</h1>
              <p className="text-sm text-muted-foreground">
                Requesting a device code from GitHub.
              </p>
            </div>
            <Loader2Icon className="w-6 h-6 animate-spin text-muted-foreground" />
          </>
        )}

        {/* verifying */}
        {step === "verifying" && verification && (
          <>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">Authorize on GitHub</h1>
              <p className="text-sm text-muted-foreground">
                Open the link below and enter the code to continue.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Your one-time code:
              </p>
              <p className="text-3xl font-mono font-bold tracking-widest text-center">
                {verification.user_code}
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() =>
                  window.open(verification.verification_uri, "_blank")
                }
              >
                Open {verification.verification_uri}
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="w-4 h-4 animate-spin shrink-0" />
              <span>Waiting for you to approve on GitHub…</span>
            </div>

            <Button type="button" variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
          </>
        )}

        {/* repo-setup */}
        {step === "repo-setup" && (
          <>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">Choose Repository</h1>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckIcon className="w-4 h-4 text-green-500" />
                <span>
                  Connected as <strong>@{owner}</strong>
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="github-repo"
                className="text-sm text-muted-foreground"
              >
                Repository name
              </label>
              <Input
                id="github-repo"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="your-repo-name"
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex items-center gap-2">
              <Button type="button" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2Icon className="w-4 h-4 animate-spin" />
                ) : null}
                Save and Continue
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleDisconnect}
                disabled={isSaving}
              >
                Disconnect
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default GitHubSetup;
