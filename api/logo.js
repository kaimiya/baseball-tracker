// Image proxy for auth-gated ESPN team logos (e.g. mystique-api uploads that
// 401 in the browser). Fetches server-side with the league cookies and streams
// the image back. Allowlisted to ESPN hosts so it can't be used as an open proxy.
import { normalizeSwid } from "./_espn.js";

export default async function handler(req, res) {
  const target = new URL(req.url, "http://localhost").searchParams.get("url");
  if (!target) {
    res.status(400).end("missing url");
    return;
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    res.status(400).end("bad url");
    return;
  }
  if (!/\.espn\.com$/.test(parsed.hostname)) {
    res.status(403).end("forbidden host");
    return;
  }

  const espnS2 = process.env.ESPN_S2;
  const swid = process.env.SWID;

  try {
    const r = await fetch(target, {
      headers: { cookie: `espn_s2=${espnS2}; SWID=${normalizeSwid(swid)}` },
    });
    if (!r.ok) {
      res.status(r.status).end();
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("content-type", r.headers.get("content-type") || "image/png");
    res.setHeader("cache-control", "public, max-age=86400, s-maxage=86400");
    res.status(200).end(buf);
  } catch {
    res.status(502).end();
  }
}
