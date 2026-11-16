const REDIS_KEY = "mocypg:push:subscriptions";
async function redis(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Subscriber storage is not configured.");
  const response = await fetch(url, { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify(command) });
  if (!response.ok) throw new Error("Subscriber storage request failed.");
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result.result;
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const subscription = req.body?.subscription;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return res.status(400).json({ error: "A valid push subscription is required." });
    const endpoint = new URL(subscription.endpoint);
    if (endpoint.protocol !== "https:") return res.status(400).json({ error: "Invalid push endpoint." });
    await redis(["HSET", REDIS_KEY, subscription.endpoint, JSON.stringify(subscription)]);
    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error("Push subscription error:", error.message);
    return res.status(503).json({ error: "Could not save this device subscription. Please try again later." });
  }
}
