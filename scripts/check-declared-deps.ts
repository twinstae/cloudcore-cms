#!/usr/bin/env bun
/**
 * 앱이 import하는 workspace 패키지가 그 앱의 package.json에 선언돼 있는지 확인한다.
 * 선언이 빠지면 TS는 workspace 해석으로 통과하지만 Vite dep scan이 실패해
 * "Vitest failed to find the current suite" 같은 무관한 오류가 난다.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const appsDir = path.join(root, "apps");
const sourceFile = /\.(ts|tsx|astro)$/;
const workspaceImport = /(?:from\s+|import\s*\(\s*)["'](@cloudcore\/[^"']+)["']/g;

async function* walk(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", "styled-system", ".astro"].includes(entry.name)) continue;
      if (entry.name.startsWith(".")) continue;
      yield* walk(full);
    } else if (sourceFile.test(entry.name)) {
      yield full;
    }
  }
}

const failures: string[] = [];

for (const app of await readdir(appsDir)) {
  const appDir = path.join(appsDir, app);
  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    pkg = JSON.parse(await readFile(path.join(appDir, "package.json"), "utf8"));
  } catch {
    continue;
  }

  const declared = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ]);

  for await (const file of walk(path.join(appDir, "src"))) {
    const code = await readFile(file, "utf8");
    for (const [, specifier] of code.matchAll(workspaceImport)) {
      const name = specifier.split("/").slice(0, 2).join("/");
      if (!declared.has(name)) failures.push(`${path.relative(root, file)} → ${name}`);
    }
  }
}

if (failures.length > 0) {
  console.error(
    "apps/*/package.json에 선언되지 않은 workspace 의존성을 import한다:\n" +
      failures.map((line) => `  - ${line}`).join("\n") +
      "\n  해당 앱의 dependencies에 workspace:* 로 추가한다.",
  );
  process.exit(1);
}

console.log("workspace 의존성 선언 OK");
