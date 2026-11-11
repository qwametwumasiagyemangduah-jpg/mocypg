const { safeEqual, setSecurityHeaders, issueSession, clearSession } = require("./_auth");

module.exports = async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
    return res.status(503).json({ error: "Admin access is not configured yet. Required server settings are missing." });
  }
  const action = req.body && req.body.action;
  if (action === "logout") {
    clearSession(res);
    return res.status(200).json({ ok: true });
  }
  const password = req.body && req.body.password;
  if (typeof password !== "string" || password.length > 256 || !safeEqual(password, process.env.ADMIN_PASSWORD)) {
    await new Promise(resolve => setTimeout(resolve, 700));
    return res.status(401).json({ error: "The password is incorrect." });
  }
  issueSession(res);
  return res.status(200).json({ ok: true });
};