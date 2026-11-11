const { setSecurityHeaders, isAuthenticated } = require("./_auth");

const OWNER = "qwametwumasiagyemangduah-jpg";
const REPO = "mocypg";
const BRANCH = "main";
const FILE_PATH = "data/admin-content.json";
const API = "https://api.github.com";

async function github(path, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + process.env.GITHUB_CONTENT_TOKEN,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || "GitHub request failed.");
    error.status = response.status;
    throw error;
  }
  return body;
}

function validContent(value) {
  const keys = ["announcements", "events", "publications", "gallery"];
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (!keys.every(key => Array.isArray(value[key]))) return false;
  return keys.every(key => value[key].length <= 100 && value[key].every(item =>
    item && typeof item === "object" && !Array.isArray(item) &&
    typeof item.title === "string" && item.title.trim().length > 0 && item.title.length <= 180
  ));
}

module.exports = async function handler(req, res) {
  setSecurityHeaders(res);
  if (!isAuthenticated(req)) return res.status(401).json({ error: "Please sign in again." });
  if (!process.env.GITHUB_CONTENT_TOKEN) return res.status(503).json({ error: "The secure GitHub publishing connection has not been configured." });

  try {
    const path = "/repos/" + OWNER + "/" + REPO + "/contents/" + FILE_PATH + "?ref=" + BRANCH;
    if (req.method === "GET") {
      try {
        const file = await github(path);
        const decoded = Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8");
        return res.status(200).json({ content: JSON.parse(decoded), configured: true });
      } catch (error) {
        if (error.status === 404) return res.status(200).json({ content: { announcements: [], events: [], publications: [], gallery: [] }, configured: true });
        throw error;
      }
    }

    if (req.method !== "PUT") return res.status(405).json({ error: "Method not allowed." });
    const content = req.body && req.body.content;
    if (!validContent(content)) return res.status(400).json({ error: "Content format is invalid. Each section must be an array and every item must have a title." });

    let sha;
    try { sha = (await github(path)).sha; } catch (error) { if (error.status !== 404) throw error; }
    const encoded = Buffer.from(JSON.stringify(content, null, 2), "utf8").toString("base64");
    const saved = await github("/repos/" + OWNER + "/" + REPO + "/contents/" + FILE_PATH, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Update ministry website content through admin panel",
        content: encoded,
        branch: BRANCH,
        ...(sha ? { sha } : {})
      })
    });
    return res.status(200).json({ ok: true, commit: saved.commit && saved.commit.sha });
  } catch (error) {
    console.error("Admin content API:", error.message);
    return res.status(500).json({ error: "The content could not be saved. Check the publishing connection and try again." });
  }
};