# Astro SSR을 Workers에서 API Worker와 어떻게 연결하는가

Label: wayfinder:research
Type: research
Status: resolved
Blocked by:

## Question

- `@astrojs/cloudflare` 어댑터의 현재 버전과 Workers(Pages가 아닌) 배포 방식, `wrangler` 설정
- Astro에서 **service binding**으로 API Worker를 부르는 방법, 그 binding의 `fetch`로 Hono RPC 클라이언트(`hc`)를 타입 안전하게 쓸 수 있는지
- 로컬 개발에서 Site + API 두 Worker와 service binding을 함께 띄우는 방법(wrangler 여러 config 또는 `@cloudflare/vite-plugin`)
- Astro에서 **Panda CSS**를 쓰는 방법(공유 preset 포함)과, 다크모드를 깜빡임 없이 적용하는 방법(인라인 스크립트, `prefers-color-scheme`)
- Astro 응답 헤더로 `Cache-Control`을 설정하는 방법
- RSS(`@astrojs/rss`)와 sitemap을 SSR에서 만드는 방법

결과는 research 문서로 남기고 이 티켓에서 링크한다.

## Answer

- `@astrojs/cloudflare` 14.4.2 (Astro 7.4.2)는 **Workers 전용**이다(Pages 지원은 v13에서 제거됨). wrangler `main`은 `@astrojs/cloudflare/entrypoints/server`, 정적 자산은 `assets.binding: "ASSETS"`로 둔다. `astro dev`와 `preview`가 workerd(`@cloudflare/vite-plugin`) 위에서 돈다.
- binding 접근은 `import { env } from 'cloudflare:workers'`로 한다(`Astro.locals.runtime`은 제거됨). 타입은 `wrangler types -c site -c api`로 만든다.
- 어댑터가 기본으로 `SESSION` KV와 `IMAGES` binding을 추가하고 자동으로 프로비저닝한다. Site에는 `session: false`와 `imageService: 'passthrough'`를 명시해서 끈다.
- Service binding과 Hono RPC 조합은 Hono 공식 문서에 있는 패턴이다: `hc<AppType>('https://api.internal', { fetch: env.API.fetch.bind(env.API) })`. `AppType`은 type-only import로 가져온다. binding 요청에는 브라우저 쿠키가 없으므로 Site는 공개 읽기 API만 부른다.
- 로컬 개발: (1) `wrangler dev -c a -c b`, (2) 어댑터 옵션 `auxiliaryWorkers: [{ configPath: '../api/wrangler.jsonc' }]`, (3) dev 세션을 따로 띄워도 binding이 연결된다(공식). 권장은 (3)이다. Admin HMR을 그대로 쓸 수 있다.
- Panda는 **v2**(2.4.0)이다. `@pandacss/vite` plugin을 `vite.plugins`에 넣고 `include`에 `.astro`를 넣는다. preset은 자동으로 포함되지 않으니 base와 panda preset을 명시한다. 공유는 `packages/panda-preset`의 `definePreset`(`extend` 사용)으로 하고, 컴포넌트 공유는 하지 않는다.
- 다크모드: condition을 `dark: '.dark &, [data-theme="dark"] &'`로 확장하고 semantic token을 쓴다. `<head>` 맨 앞의 `<script is:inline>`에서 localStorage와 `prefers-color-scheme`을 읽어 `data-theme`을 설정한다. 테마를 쿠키로 SSR하지 않는다(캐시를 지키기 위해).
- 헤더: `Astro.response.headers.set()`은 **페이지 frontmatter에서만** 쓸 수 있다(레이아웃과 컴포넌트에서는 불가).
- 엣지 캐시는 **Workers Cache**(wrangler `cache.enabled`)로 한다. Worker보다 먼저 캐시를 확인하고 SWR을 지원하며, 배포하면 캐시가 비워진다(version이 key에 들어감). 권장은 Astro 7 `routeRules`와 `cacheCloudflare()`(experimental)이다. 이 조합은 `Cloudflare-CDN-Cache-Control`을 붙이고, 캐시 의도가 없는 응답에는 `no-store`를 자동으로 붙인다(2시간 휴리스틱 캐시 방지).
- 주의: Workers Cache를 켜면 **정적 자산과 worker-to-worker 요청까지 request 과금 대상**이 된다. Site에만 켜고 Free plan 한도를 확인해야 한다.
- RSS: Astro 6+에서는 확장자 엔드포인트에 trailing slash를 붙일 수 없다. 따라서 `/rss/`는 `src/pages/rss/index.ts`에 `rss()`를 두고 `trailingSlash: 'always'`(GET은 301)를 쓴다.
- Sitemap: `@astrojs/sitemap`은 SSR 동적 라우트를 지원하지 않는다. API 목록으로 `src/pages/sitemap.xml.ts` 엔드포인트를 직접 만든다.
- 미확인: hono-openapi 라우트에서 `hc` 타입이 유지되는지, Panda v1→v2 마이그레이션 비용, Astro 7(Vite 8)과 Admin/Storybook의 Vite 버전 정렬, Free plan에서 Workers Cache 가용성.

Context: branch `research/astro-on-workers`, file `research/04-astro-on-workers.md`
