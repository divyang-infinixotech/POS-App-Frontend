// ─── Terminal build (Phase G — LAN mode) ────────────────────────────────────
// Builds the frontend bundle for the OFFLINE terminal, where the SAME backend
// serves both the API and this static dist. The bundle must resolve its API
// base from window.location.origin (same-origin) instead of the dev default
// http://localhost:5001/api — which is wrong when a waiter/kitchen terminal
// browses to http://<server-lan-ip>:5001.
//
// Usage:  npm run build:terminal
// Output: dist/  (serve it via the backend with SERVE_FRONTEND=true)
//
// Node script (not `VAR=true cmd` syntax) so it works identically from
// cmd.exe, PowerShell and bash on Windows.
import { build } from 'vite';

process.env.VITE_SAME_ORIGIN_API = 'true';

// Vite gives REAL environment variables the highest priority over .env files.
// The frontend's dev .env sets VITE_API_URL=http://localhost:5001/api which —
// if left in place — would be baked into the terminal bundle and defeat
// same-origin resolution on every LAN terminal. Override it (deleting is not
// enough; an unset var lets .env win), and force the same define at config
// level as a second layer of defense.
process.env.VITE_API_URL = '';
process.env.VITE_SOCKET_URL = '';

await build({
  define: {
    'import.meta.env.VITE_API_URL': "''",
    'import.meta.env.VITE_SOCKET_URL': "''",
    'import.meta.env.VITE_SAME_ORIGIN_API': "'true'",
  },
});
