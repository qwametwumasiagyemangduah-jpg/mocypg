import webpush from "web-push";
const REDIS_KEY = "mocypg:push:subscriptions";
async function redis(command) {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL, { method: "POST", headers: { Authorization: "Bearer " + process.env.UPSTASH_REDIS_REST_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(command) });
  if (!response.ok) throw new Error("Subscriber storage request failed.");
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result.result;
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const expected = process.env.PUSH_ADMIN_TOKEN;
  const supplied = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!expected || supplied.length !== expected.length || supplied !== expected) return res.status(401).json({ error: "Unauthorised" });
  const { title, body, url } = req.body || {};
  if (typeof title !== "string" || !title.trim() || title.length > 90 || typeof body !== "string" || !body.trim() || body.length > 180 || typeof url !== "string") return res.status(400).json({ error: "Provide a title (max 90 characters), message (max 180 characters), and destination URL." });
  let destination;
  try { destination = new URL(url, "https://mocypg.vercel.app"); } catch { return res.status(400).json({ error: "Invalid destination URL." }); }
  if (destination.origin !== "https://mocypg.vercel.app") return res.status(400).json({ error: "Notifications may only link to the Ministry website." });
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@mocypg.vercel.app", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const rows = await redis(["HGETALL", REDIS_KEY]);
    const pairs = Array.isArray(rows) ? rows : [];
    let sent = 0, removed = 0, failed = 0;
    const payload = JSON.stringify({ title: title.trim(), body: body.trim(), url: destination.pathname + destination.search + destination.hash });
    for (let i = 0; i < pairs.length; i += 2) {
      try {
        await webpush.sendNotification(JSON.parse(pairs[i + 1]), payload);
        sent++;
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await redis(["HDEL", REDIS_KEY, pairs[i]]);
          removed++;
        } else {
          failed++;
          console.error("Push delivery failed:", error.statusCode || error.message);
        }
      }
    }
    return res.status(200).json({ ok: true, sent, removed, failed });
  } catch (error) {
    console.error("Push send error:", error.message);
    return res.status(503).json({ error: "Notification delivery is not configured correctly." });
  }
}
