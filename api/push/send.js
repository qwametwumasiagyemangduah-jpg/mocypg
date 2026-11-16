import { timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { json, onlyMethod, getSubscriptions, removeSubscription } from "../../lib/push-store.js";

function authorized(req) {
  const expected = process.env.PUSH_ADMIN_TOKEN;
  const supplied = req.headers.authorization || "";
  if (!expected || !supplied.startsWith("Bearer ")) return false;
  const actual = Buffer.from(supplied.slice(7));
  const secret = Buffer.from(expected);
  return actual.length === secret.length && timingSafeEqual(actual, secret);
}

export default async function handler(req, res) {
  if (!onlyMethod(req, res, "POST")) return;
  if (!authorized(req)) return json(res, 401, { error: "Unauthorized." });
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
    return json(res, 503, { error: "Push delivery is not configured." });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const title = typeof body?.title === "string" ? body.title.trim().slice(0, 90) : "";
    const message = typeof body?.body === "string" ? body.body.trim().slice(0, 180) : "";
    const rawUrl = typeof body?.url === "string" ? body.url.trim() : "/newsroom";
    if (!title || !message) return json(res, 400, { error: "A title and message are required." });
    let destination;
    try { destination = new URL(rawUrl, "https://mocypg.vercel.app"); }
    catch { return json(res, 400, { error: "Invalid destination URL." }); }
    if (destination.origin !== "https://mocypg.vercel.app") {
      return json(res, 400, { error: "Notifications may only link to the Ministry website." });
    }

    webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const records = await getSubscriptions();
    let sent = 0, removed = 0, failed = 0;
    const payload = JSON.stringify({ title, body: message, url: destination.pathname + destination.search + destination.hash });
    await Promise.all(records.map(async ({ subscription }) => {
      try {
        await webpush.sendNotification(subscription, payload, { TTL: 86400 });
        sent++;
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await removeSubscription(subscription.endpoint);
          removed++;
        } else {
          failed++;
          console.error("Push delivery failed:", error.statusCode || error.message);
        }
      }
    }));
    return json(res, 200, { success: true, sent, removed, failed, total: records.length });
  } catch (error) {
    console.error("Push delivery failed:", error.message);
    return json(res, 503, { error: "The notification could not be sent. Please try again later." });
  }
}
