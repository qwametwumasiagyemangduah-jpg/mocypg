import { json, onlyMethod, validSameOrigin, removeSubscription } from "../../lib/push-store.js";

export default async function handler(req, res) {
  if (!onlyMethod(req, res, "POST")) return;
  if (!validSameOrigin(req)) return json(res, 403, { error: "Invalid request origin." });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const endpoint = body?.endpoint;
    if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 2048) {
      return json(res, 400, { error: "Invalid subscription endpoint." });
    }
    await removeSubscription(endpoint);
    return json(res, 200, { success: true });
  } catch (error) {
    console.error("Push unsubscribe failed:", error.message);
    return json(res, 503, { error: "Could not update this device. Please try again later." });
  }
}
