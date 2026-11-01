import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = resolve(root, "python", "tool_runner.py");
const PYTHON = process.env.PYTHON_BIN || "python3";
function setting(name, fallback, low, high) {
  const value = Number(process.env[name] || fallback);
  return Number.isSafeInteger(value) ? Math.min(high, Math.max(low, value)) : fallback;
}
const TIMEOUT_MS = setting("PYTHON_TIMEOUT_MS", 35000, 5000, 60000);
const MAX_OUTPUT_BYTES = 3_000_000;
const concurrency = setting("MAX_CONCURRENT_PYTHON", 3, 1, 6);
let running = 0;
const waiting = [];
function slot() {
  return new Promise((resolve, reject) => {
    if (waiting.length >= 40) { reject(new Error("Server busy; retry later.")); return; }
    const start = () => { running++; resolve(() => { running--; waiting.shift()?.(); }); };
    if (running < concurrency) start(); else waiting.push(start);
  });
}

/**
 * Spawns a fixed Python entrypoint, with fixed tool name and JSON on stdin.
 * No shell, no user-provided executable, no environment credentials passed.
 */
export async function callPython(tool, args) {
  const release = await slot();
  try {
    return await new Promise((resolveResult, reject) => {
      const child = spawn(PYTHON, [script, tool], {
        cwd: root, stdio: ["pipe", "pipe", "pipe"], shell: false,
        env: { PATH: process.env.PATH || "/usr/bin:/bin", PYTHONPATH: resolve(root, "python"), PYTHONDONTWRITEBYTECODE: "1", PYTHONUNBUFFERED: "1" },
      });
      const stdout = [], stderr = [];
      let size = 0, finished = false;
      const done = (error, data) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (error) reject(error); else resolveResult(data);
      };
      const timer = setTimeout(() => { child.kill("SIGKILL"); done(new Error("Official source request timed out.")); }, TIMEOUT_MS);
      child.on("error", e => done(new Error("Python worker unavailable: " + e.code)));
      child.stdout.on("data", buf => { size += buf.length; if (size > MAX_OUTPUT_BYTES) { child.kill("SIGKILL"); done(new Error("Response exceeded safety limit.")); return; } stdout.push(buf); });
      child.stderr.on("data", buf => { if (Buffer.concat(stderr).length < 4096) stderr.push(buf); });
      child.on("close", code => {
        if (finished) return;
        if (code !== 0 && !stdout.length) { done(new Error("Source adapter could not complete; no result inferred.")); return; }
        try {
          const value = JSON.parse(Buffer.concat(stdout).toString("utf8"));
          if (!value || typeof value !== "object" || typeof value.ok !== "boolean") throw new Error("Unexpected adapter envelope");
          done(null, value);
        } catch { done(new Error("Invalid adapter response; no result inferred.")); }
      });
      child.stdin.on("error", () => done(new Error("Source worker input unavailable.")));
      child.stdin.end(JSON.stringify(args));
    });
  } finally { release(); }
}
