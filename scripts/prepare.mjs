import { spawnSync } from "node:child_process";

const omitted = new Set(
  (process.env.npm_config_omit ?? "")
    .split(/[,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean),
);

// Pi installs git packages with `npm install --omit=dev`. In that mode the
// dev-only lefthook binary is intentionally unavailable, so there is nothing
// to prepare. Keep normal contributor installs unchanged.
if (omitted.has("dev") || process.env.NODE_ENV === "production") {
  process.exit(0);
}

const executable = process.platform === "win32" ? "lefthook.cmd" : "lefthook";
const result = spawnSync(executable, ["install"], { stdio: "inherit" });

if (result.error) throw result.error;
process.exit(result.status ?? 1);
