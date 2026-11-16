import { json, onlyMethod } from "../../lib/push-store.js";

export default function handler(req, res) {
  if (!onlyMethod(req, res, "GET")) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
    return json(res, 503, { error: "Push notifications are not configured." });
  }
  return json(res, 200, { publicKey });
}
