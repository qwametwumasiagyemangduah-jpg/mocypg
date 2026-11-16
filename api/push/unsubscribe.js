const REDIS_KEY = "mocypg:push:subscriptions";
async function redis(command) {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL, { method: "POST", headers: { Authorization: "Bearer " + process.env.UPSTASH_REDIS_REST_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(command) });
  if (!response.ok) throw new Error("Storage request failed.");
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result.result;
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const endpoint = req.body?.endpoint;
    if (!endpoint || new URL(endpoint).protocol !== "https:") return res.status(400).json({ error: "A valid endpoint is required." });
    await redis(["HDEL", REDIS_KEY, endpoint]);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Push unsubscribe error:", error.message);
    return res.status(503).json({ error: "Could not remove this subscription." });
  }
}
