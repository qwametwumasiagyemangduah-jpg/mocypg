import { json, onlyMethod, validSameOrigin, saveSubscription } from "../../lib/push-store.js";

export default async function handler(req, res) {
  if (!onlyMethod(req, res, "POST")) return;
  if (!validSameOrigin(req)) return json(res, 403, { error: "Invalid request origin." });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const sub = body?.subscription;
    if (!sub || typeof sub.endpoint !== "string" || !sub.endpoint.startsWith("https://") ||
        !sub.keys || typeof sub.keys.p256dh !== "string" || typeof sub.keys.auth !== "string" ||
        sub.endpoint.length > 2048 || sub.keys.p256dh.length > 256 || sub.keys.auth.length > 256) {
      return json(res, 400, { error: "Invalid push subscription." });
    }
    await saveSubscription({ endpoint: sub.endpoint, expirationTime: sub.expirationTime ?? null, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
    return json(res, 201, { success: true });
  } catch (error) {
    console.error("Push subscription could not be saved:", error.message);
    return json(res, 503, { error: "Could not save this device. Please try again later." });
  }
}
