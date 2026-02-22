// Vercel serverless function: proxies GitHub Device Flow OAuth endpoints.
// Handles /api/github-oauth/device/code and /api/github-oauth/oauth/access_token
// so the browser avoids GitHub's missing CORS headers on those endpoints.

const ALLOWED_PATHS = new Set(["device/code", "oauth/access_token"]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const pathParts = req.query.path;
  const path = Array.isArray(pathParts) ? pathParts.join("/") : (pathParts ?? "");

  if (!ALLOWED_PATHS.has(path)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const githubUrl = `https://github.com/login/${path}`;

  const response = await fetch(githubUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req.body),
  });

  const data = await response.json();
  res.status(response.status).json(data);
}
