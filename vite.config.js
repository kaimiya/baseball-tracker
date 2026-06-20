import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Dev-only middleware so `npm run dev` serves the SAME proxy that runs as a
// Vercel function in production, at /api/league. Secrets are read from
// .env.local on the server side and never exposed to the browser bundle.
function espnApiDevPlugin(env) {
  return {
    name: "espn-api-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/league")) return next();

        for (const k of ["ESPN_S2", "SWID", "ESPN_LEAGUE_ID", "ESPN_SEASON_ID", "ESPN_TEAM_ID"]) {
          if (!process.env[k] && env[k]) process.env[k] = env[k];
        }

        // Minimal Vercel-style res shim over Node's ServerResponse.
        const shim = {
          statusCode: 200,
          status(c) { this.statusCode = c; res.statusCode = c; return this; },
          setHeader(k, v) { res.setHeader(k, v); return this; },
          json(obj) {
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify(obj));
          },
        };

        try {
          const mod = await server.ssrLoadModule("/api/league.js");
          await mod.default(req, shim);
        } catch (e) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "Dev API crashed", detail: String((e && e.message) || e) }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), espnApiDevPlugin(env)],
  };
});
