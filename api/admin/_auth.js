const crypto = require("crypto");

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function sign(value) {
  return crypto.createHmac("sha256", process.env.SESSION_SECRET).update(value).digest("hex");
}

function setSecurityHeaders(res) {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
}

function issueSession(res) {
  const expires = Date.now() + 8 * 60 * 60 * 1000;
  const value = String(expires);
  const token = value + "." + sign(value);
  res.setHeader("Set-Cookie", "ypg_admin_session=" + token + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800");
}

function clearSession(res) {
  res.setHeader("Set-Cookie", "ypg_admin_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0");
}

function isAuthenticated(req) {
  if (!process.env.SESSION_SECRET) return false;
  const raw = (req.headers.cookie || "").split(";").map(x => x.trim()).find(x => x.startsWith("ypg_admin_session="));
  if (!raw) return false;
  const token = decodeURIComponent(raw.slice("ypg_admin_session=".length));
  const parts = token.split(".");
  if (parts.length !== 2 || !/^\d+$/.test(parts[0])) return false;
  if (Number(parts[0]) < Date.now()) return false;
  return safeEqual(parts[1], sign(parts[0]));
}

module.exports = { safeEqual, setSecurityHeaders, issueSession, clearSession, isAuthenticated };