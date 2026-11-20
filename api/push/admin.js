import { createHmac, timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { json, onlyMethod, getSubscriptions, removeSubscription } from "../../lib/push-store.js";

const COOKIE = "mocypg_push_admin";
const MAX_AGE = 8 * 60 * 60;
const b64 = value => Buffer.from(value).toString("base64url");
const signature = value => createHmac("sha256", process.env.SESSION_SECRET).update(value).digest("base64url");
function safeEqual(a, b) {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length === y.length && timingSafeEqual(x, y);
}
function cookieValue(req) {
  const raw = req.headers.cookie || "";
  const entry = raw.split(";").map(x => x.trim()).find(x => x.startsWith(COOKIE + "="));
  return entry ? decodeURIComponent(entry.slice(COOKIE.length + 1)) : "";
}
function validSession(req) {
  if (!process.env.SESSION_SECRET) return false;
  const token = cookieValue(req), parts = token.split(".");
  if (parts.length !== 2 || !safeEqual(signature(parts[0]), parts[1])) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return payload.exp > Math.floor(Date.now() / 1000) && payload.role === "push-admin";
  } catch { return false; }
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  return origin === "https://mocypg.vercel.app";
}
function setCookie(res, value, maxAge) {
  res.setHeader("Set-Cookie", `${COOKIE}=${value}; Path=/api/push/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`);
}
export default async function handler(req, res) {
  if (!onlyMethod(req, res, "POST")) return;
  if (!sameOrigin(req)) return json(res, 403, { error: "Cross-site request blocked." });
  let body;
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); }
  catch { return json(res, 400, { error: "Invalid request." }); }

  if (body.action === "login") {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected || !process.env.SESSION_SECRET || !safeEqual(body.password, expected)) {
      return json(res, 401, { error: "The password is incorrect." });
    }
    const payload = b64(JSON.stringify({ role: "push-admin", exp: Math.floor(Date.now() / 1000) + MAX_AGE }));
    setCookie(res, payload + "." + signature(payload), MAX_AGE);
    return json(res, 200, { success: true });
  }
  if (body.action === "logout") {
    setCookie(res, "", 0);
    return json(res, 200, { success: true });
  }
  if (!validSession(req)) return json(res, 401, { error: "Please sign in again." });
  if (body.action === "session") return json(res, 200, { authenticated: true });
  if (body.action !== "send") return json(res, 400, { error: "Unknown action." });

  if (!process.env.PUSH_ADMIN_TOKEN || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
    return json(res, 503, { error: "Notification delivery is not fully configured." });
  }
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 90) : "";
  const message = typeof body.body === "string" ? body.body.trim().slice(0, 180) : "";
  const rawUrl = typeof body.url === "string" ? body.url.trim() : "/newsroom";
  if (!title || !message) return json(res, 400, { error: "Enter a title and message." });
  let destination;
  try { destination = new URL(rawUrl, "https://mocypg.vercel.app"); }
  catch { return json(res, 400, { error: "Invalid destination." }); }
  if (destination.origin !== "https://mocypg.vercel.app") return json(res, 400, { error: "Use a link on the Ministry website." });

  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const records = await getSubscriptions();
    let sent = 0, removed = 0, failed = 0;
    const payload = JSON.stringify({ title, body: message, url: destination.pathname + destination.search + destination.hash });
    await Promise.all(records.map(async ({ subscription }) => {
      try { await webpush.sendNotification(subscription, payload, { TTL: 86400 }); sent++; }
      catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) { await removeSubscription(subscription.endpoint); removed++; }
        else { failed++; console.error("Push delivery failed:", error.statusCode || error.message); }
      }
    }));
    return json(res, 200, { success: true, sent, removed, failed, total: records.length });
  } catch (error) {
    console.error("Admin push send failed:", error.message);
    return json(res, 503, { error: "The notification could not be sent. Try again later." });
  }
}