module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  if (!process.env.GITHUB_CONTENT_TOKEN) return res.status(503).json({ error: "Content service is not configured." });
  try {
    const url = "https://api.github.com/repos/qwametwumasiagyemangduah-jpg/mocypg/contents/data/admin-content.json?ref=main";
    const response = await fetch(url, { headers: { "Accept": "application/vnd.github+json", "Authorization": "Bearer " + process.env.GITHUB_CONTENT_TOKEN, "X-GitHub-Api-Version": "2022-11-28" } });
    if (response.status === 404) return res.status(200).json({ announcements: [], events: [], publications: [], gallery: [] });
    if (!response.ok) throw new Error("Repository content could not be read.");
    const file = await response.json();
    const content = JSON.parse(Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8"));
    return res.status(200).json(content);
  } catch (error) {
    console.error("Public content API:", error.message);
    return res.status(500).json({ error: "Public content is temporarily unavailable." });
  }
};