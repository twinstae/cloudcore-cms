import { defineConfig } from "astro/config";

// 정적 빌드만 한다(ADR-0004). 어댑터 없이 dist/를 Workers Static Assets로 올린다.
export default defineConfig({
  output: "static",
  trailingSlash: "always",
});
