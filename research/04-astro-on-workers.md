# Research 04: Astro SSR on Cloudflare Workers + API Worker 연결

- 티켓: `.scratch/cms-rewrite/issues/04-research-astro-on-workers.md`
- 조사일: 2026-10-23
- 표기: **[확인]** 1차 출처(공식 문서, npm 패키지 소스)로 확인함 / **[미확인]** 2차 출처이거나 직접 실행해 보지 않은 추론

## 0. 버전 스냅샷 (npm registry, 2026-10-23 기준) [확인]

| 패키지 | 최신 버전 | 비고 |
|---|---|---|
| `astro` | 7.4.2 | |
| `@astrojs/cloudflare` | 14.4.2 | peerDeps: `astro ^7.4.0`, `wrangler ^4.125.0`; deps에 `@cloudflare/vite-plugin ^1.63.1`, `vite ^8.3.4` |
| `@cloudflare/vite-plugin` | 1.64.0 | |
| `wrangler` | 4.152.0 | |
| `hono` | 4.13.13 | |
| `@pandacss/dev` / `@pandacss/vite` | 2.4.0 / 2.4.0 | Panda **v2** |
| `@astrojs/rss` | 4.0.19 | |
| `@astrojs/sitemap` | 3.7.4 | SSR 동적 라우트는 지원 안 함 (아래 6절) |

출처: `npm view <pkg> version`, `npm pack @astrojs/cloudflare@14.4.2`로 받은 패키지 소스(`package.json`, `dist/*`).

---

## 1. `@astrojs/cloudflare` 어댑터와 Workers 배포

### 핵심 사실 [확인]
- 어댑터는 이제 **Workers 전용**이다. v13(Astro 6)에서 **Cloudflare Pages 지원이 제거**됐다. README 첫 줄도 "An SSR adapter for use with Cloudflare Workers targets"이다.
  출처: https://docs.astro.build/en/guides/integrations-guide/cloudflare/ (Upgrading to v13 절), 패키지 README
- 어댑터 내부에서 `@cloudflare/vite-plugin`을 쓴다. Astro 6부터 **`astro dev`와 `astro preview`가 workerd 위에서 실행**되므로 로컬에서도 binding(D1/R2/service 등)이 실제 런타임과 같은 방식으로 동작한다.
- Wrangler config는 **선택 사항**이다. 없으면 어댑터가 기본값을 만든다. 설정할 것이 있으면 `wrangler.jsonc`를 두고, `main`은 어댑터의 통합 엔트리를 가리키게 한다.

```jsonc
// apps/site/wrangler.jsonc
{
  "name": "cloudcore-site",
  "main": "@astrojs/cloudflare/entrypoints/server",
  "compatibility_date": "2026-10-23",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "assets": { "binding": "ASSETS", "directory": "./dist" },
  "services": [{ "binding": "API", "service": "cloudcore-api" }],
  "observability": { "enabled": true }
}
```
  출처: https://docs.astro.build/en/guides/deploy/cloudflare/ (Configure wrangler.jsonc for SSR sites)

- binding 접근은 `import { env } from 'cloudflare:workers'`로 한다. **`Astro.locals.runtime`은 v13에서 제거**됐다. `ExecutionContext`는 `Astro.locals.cfContext`, 요청 메타데이터는 `Astro.request.cf`로 얻는다.
- 타입: `wrangler types`를 `dev`/`build`/`preview` 스크립트에 넣으라고 권장한다. service binding 대상의 타입까지 만들려면 config를 여러 개 넘긴다: `wrangler types -c ./wrangler.jsonc -c ../api/wrangler.jsonc`.
  출처: https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/rpc/
- 배포 환경: `CLOUDFLARE_ENV=production astro build && wrangler deploy`처럼 **환경은 빌드할 때 정한다**.

### 어댑터가 몰래 추가하는 binding (주의) [확인: 패키지 소스 `dist/index.js`, `dist/wrangler.js`]
- **Session KV**: Astro `session` 설정이 `false`가 아니고 driver도 따로 지정하지 않으면, 어댑터가 `SESSION` KV binding을 추가하고 배포할 때 KV namespace를 **자동 프로비저닝**한다. Site는 세션을 쓰지 않으므로 `astro.config`에 `session: false`를 넣어 끄는 것이 좋다. 소스 조건은 `if (session !== false && !session?.driver)`이다. `session: false`가 Astro의 공개 config 타입에서 허용되는지는 **[미확인]**이다.
- **Images binding**: `imageService` 기본값은 `'cloudflare-binding'`이다(14.2.0+). 이때 `IMAGES` binding이 추가된다. 우리 Site는 이미지를 업로드할 때 이미 변환했으므로(ADR-0003) `astro:assets` 변환이 필요 없다. 따라서 `imageService: 'passthrough'`로 끄는 것이 좋다.
- **Workers Cache**: `cache.provider`로 `cacheCloudflare()`를 쓰면 생성되는 wrangler config에 `cache: { enabled: true }`를 넣는다(5절).

### Workers Builds
- 빌드 명령은 `astro build`, 배포 명령은 `wrangler deploy`이다(Root directory는 `apps/site`). bun과 모노레포 조합이 Workers Builds에서 동작하는지는 이 문서의 범위 밖이고 **[미확인]**이다.

---

## 2. Service binding으로 API Worker 호출 + Hono RPC(`hc`)

### Service binding 기본 [확인]
- 호출하는 쪽 wrangler config에 `services: [{ binding, service, entrypoint? }]`를 둔다. `fetch` 방식은 `env.API.fetch(request)`이다. 새 `Request`를 만들 때는 **hostname이 있는 완전한 URL**이 필요하다(값 자체는 아무것이나 된다).
  출처: https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/http/
- 공개 인터넷을 거치지 않고 같은 계정 안에서 Worker끼리 직접 호출한다. Service binding 호출이 요금에서 무료인지는 이번에 읽은 페이지에 나오지 않는다 **[미확인]**. 다만 대상 Worker에 Workers Cache를 켜면 worker-to-worker 요청도 과금 대상이 된다고 명시돼 있다(5절).

### Hono RPC를 binding의 fetch로 [확인]
Hono 공식 RPC 가이드가 바로 이 패턴을 예시로 든다. `hc`의 `fetch` 옵션에 binding의 `fetch`를 넘긴다.
출처: https://hono.dev/docs/guides/rpc ("Custom fetch method", Cloudflare Service Bindings 예시)

```ts
// apps/site/src/lib/api.ts
import { hc } from 'hono/client';
import { env } from 'cloudflare:workers';
import type { AppType } from '@cloudcore/api'; // apps/api가 export하는 타입 (type-only import)

export const api = hc<AppType>('https://api.internal', {
  fetch: env.API.fetch.bind(env.API),
});
// .astro frontmatter에서:
// const res = await api.posts[':slug'].$get({ param: { slug } });
```

- 타입 안전성은 `AppType`을 **type-only import**로 가져오는 데서 나온다. 런타임에는 API 코드가 Site 번들에 들어가지 않는다. 모노레포 workspace 의존성(`"@cloudcore/api": "workspace:*"`)이나 공유 타입 패키지로 연결한다.
- `bind(env.API)`는 필수다. `this`를 잃으면 "Illegal invocation"이 난다 **[미확인: 일반적인 Workers 동작, 직접 재현 안 함]**.
- **주의**: binding으로 들어간 요청에는 브라우저 쿠키가 없다. Site는 공개 읽기 API(published Content, Tag, Site Settings)만 부르도록 API를 설계해야 한다. 또 API의 rate limit이 `CF-Connecting-IP` 기반이면 binding 호출은 따로 다뤄야 한다 **[미확인: 설계상 주의점]**.
- hono-openapi로 정의한 라우트에서도 `hc` 타입 추론이 유지되는지는 이 문서에서 검증하지 않았다 **[미확인]**. 별도 prototype이나 research 대상이다.

---

## 3. 로컬 개발: Site + API 두 Worker를 함께 띄우기 [확인]

출처: https://developers.cloudflare.com/workers/development-testing/multi-workers/ , https://developers.cloudflare.com/workers/vite-plugin/reference/api/

Cloudflare가 공식으로 제시하는 방법은 3가지다.

1. **Wrangler 하나에 config 여러 개**: `npx wrangler dev -c ./app/wrangler.jsonc -c ./api/wrangler.jsonc`. 첫 번째가 primary(:8787)이다. Cloudflare가 기본으로 권장하는 방법이지만, Astro의 `astro dev`(HMR) 경로와는 맞지 않는다.
2. **Vite plugin의 `auxiliaryWorkers`**: `@astrojs/cloudflare`가 이 옵션을 그대로 넘긴다(`Options extends Pick<PluginConfig, 'auxiliaryWorkers' | 'configPath' | 'inspectorPort' | 'persistState' | 'remoteBindings'>`, 패키지 `dist/index.d.ts`).
   ```js
   // apps/site/astro.config.mjs
   adapter: cloudflare({
     auxiliaryWorkers: [{ configPath: '../api/wrangler.jsonc' }],
     imageService: 'passthrough',
   }),
   ```
   그러면 `astro dev` 하나로 API Worker까지 workerd에서 함께 뜨고 service binding으로 연결된다. 다만 이 경우 API Worker는 **Site의 Vite 파이프라인 안에서 빌드**된다. API가 서빙하는 Admin SPA 정적 자산(Admin의 Vite 빌드)까지 같이 뜨는지는 **[미확인]**이다.
3. **개발 세션을 따로 띄우기**: 터미널 1에서 `astro dev`(apps/site), 터미널 2에서 API의 `wrangler dev` 또는 `vite dev`를 띄운다. 공식 문서는 "regardless of whether they are started with `wrangler dev` or `vite dev`" 서로 service binding으로 통신할 수 있다고 말한다(로컬 dev registry 메커니즘).

**권장(추론)**: 기본은 **3번(세션 분리)**이다. 각 앱이 자기 dev 서버(Admin HMR 포함)를 그대로 쓰고, Site만 binding으로 API에 붙는다. 하나의 명령만 원하면 루트에서 두 dev를 병렬로 실행한다(`bun run --filter`). 2번은 "Site만 개발할 때 API를 가볍게 띄우는" 용도로 쓸 수 있다. 두 경우 모두 D1 로컬 상태는 `persistState` 경로를 맞추지 않으면 앱마다 따로 생긴다 **[미확인]**.

---

## 4. Panda CSS in Astro + 공유 preset + 깜빡임 없는 다크모드

### 설치 (Panda v2) [확인]
출처: https://panda-css.com/docs/installation/astro
- `@pandacss/dev`와 `@pandacss/vite`를 설치하고 `panda init`을 실행한다. `astro.config.mjs`의 `vite.plugins`에 `pandacss()`를 넣는다. v2에서는 **Vite plugin이 기본 경로**이고 PostCSS(`panda init --postcss`)는 대안이다.
- `package.json`에 `"prepare": "panda codegen"`을 넣는다(`styled-system`은 gitignore).
- `panda.config.ts`: `include: ['./src/**/*.{js,jsx,ts,tsx,astro}']`, `outdir: 'styled-system'`.
- `src/index.css`에는 레이어 순서만 둔다: `@layer reset, base, tokens, recipes, utilities;`. 이 파일을 Layout에서 import한다.
- 선택: `pandacss({ transform: true })`로 정적 `css()` 호출을 빌드 타임 class 문자열로 바꿔 런타임을 없앤다.

### 공유 preset [확인]
출처: https://panda-css.com/docs/customization/presets , https://panda-css.com/docs/guides/component-library
- `packages/panda-preset`에서 `definePreset({ name: '@cloudcore/preset', theme: { extend: {...} }, conditions: {...} })`를 export한다. Admin과 Site는 `presets: ['@pandacss/preset-base', '@pandacss/preset-panda', '@cloudcore/preset']`로 쓴다.
- v2에서는 **preset이 자동으로 들어가지 않는다**. `presets` 배열에 적힌 것만 들어가므로 base와 panda preset을 반드시 같이 적는다. preset끼리 덮어쓰지 않으려면 preset 안에서 `extend`를 쓴다.
- preset은 "config only. No components, no styled-system"이다. Site와 Admin이 **컴포넌트까지** 공유하려면 v2의 `designSystem: '@cloudcore/ds'` 필드와 `panda lib` 방식이 따로 있다. Site는 Astro 컴포넌트이고 Admin은 React와 Ark UI라서, **preset만 공유**하는 편이 맞아 보인다(추론).
- Panda v1에서 v2로 넘어올 때의 변경점 목록은 확인하지 못했다(upgrade 문서 URL이 404였다) **[미확인]**. `../modern-react-starter`가 v1이면 마이그레이션 비용이 생길 수 있다.

### 다크모드 (시스템 기본 + 수동 토글, 깜빡임 없음)
- Panda의 `_dark` condition은 base preset 기준으로 `.dark &`이다. data 속성도 함께 쓰려면 이렇게 확장한다 [확인]:
  ```ts
  conditions: { extend: { dark: '.dark &, [data-theme="dark"] &' } }
  ```
  semantic token은 `{ value: { base: '#fff', _dark: '#0a0a0a' } }`로 정의한다. 출처: https://github.com/chakra-ui/panda/blob/v2/website/content/docs/theming/conditions.mdx
- 깜빡임 방지: `<head>` 맨 앞에 **`<script is:inline>`**을 둔다. `is:inline`은 Astro가 번들하거나 지연시키지 않고 작성한 위치에 그대로 렌더링한다 [확인: https://docs.astro.build/en/reference/directives-reference/]. 그래서 CSS를 적용하고 첫 페인트를 하기 전에 동기적으로 실행된다.
  ```astro
  <head>
    <script is:inline>
      (() => {
        let pref = null;
        try { pref = localStorage.getItem('theme'); } catch {}
        const dark = pref ? pref === 'dark'
          : matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
      })();
    </script>
    ...
  </head>
  ```
  `pref`가 없으면(시스템 모드) `matchMedia(...).addEventListener('change', ...)`로 OS 변경을 따라가는 코드를 토글 스크립트에 둔다.
- **설계 판단(추론)**: 테마 선택을 **쿠키로 SSR하지 않는다**. 쿠키별로 HTML이 달라지면 공유 캐시(5절)를 쓰기 어렵다(`Vary: Cookie`). localStorage와 인라인 스크립트를 쓰면 HTML이 모든 사용자에게 같으므로 캐시하기 좋다.
- CSP를 쓴다면 이 인라인 스크립트에 hash나 nonce가 필요하다 **[미확인: Astro CSP 기능과의 연동은 조사하지 않음]**.

---

## 5. `Cache-Control` 설정 (짧은 TTL + SWR, 명시적 purge 없음)

### 헤더를 설정하는 API [확인]
- 페이지: frontmatter에서 `Astro.response.headers.set('Cache-Control', '...')`. **페이지 레벨에서만** 가능하다. 레이아웃을 포함한 컴포넌트에서는 이미 헤더가 전송된 뒤라 바꿀 수 없다.
  출처: https://docs.astro.build/en/guides/on-demand-rendering/
- 엔드포인트: `return new Response(body, { headers: { 'Cache-Control': ... } })`.

### Cloudflare 쪽에서 실제로 캐시되게 하려면: Workers Cache [확인]
- 기존에는 Worker 응답이 CDN 캐시 **앞**에서 실행돼서 Worker가 `Cache-Control`을 붙여도 엣지가 캐시하지 않았다 **[미확인: 배경 지식]**. 지금은 **Workers Cache**(wrangler `"cache": { "enabled": true }`, Wrangler 4.69.0+)를 켜면 Cloudflare가 Worker를 **실행하기 전에** 캐시를 확인하고, hit면 Worker를 실행하지 않는다.
  출처: https://developers.cloudflare.com/workers/cache/ , https://developers.cloudflare.com/workers/cache/configuration/
- 헤더 우선순위는 `Cloudflare-CDN-Cache-Control`(가장 높음, 클라이언트로 가기 전에 제거됨) > `CDN-Cache-Control` > `Cache-Control`이다. `stale-while-revalidate`와 `stale-if-error`를 지원한다(단 `s-maxage`, `must-revalidate`, `proxy-revalidate`가 있으면 꺼진다).
- `Cache-Control`이 없는 200 응답은 **휴리스틱으로 2시간** 캐시된다. 그래서 캐시를 켜면 캐시하면 안 되는 응답에는 반드시 `no-store`를 붙여야 한다.
- 기본적으로 **Worker 버전이 cache key에 들어가서 배포하면 캐시가 비워진다**. `cross_version_cache: true`(4.107.0+)로 바꿀 수 있다. 우리 정책("짧은 TTL + SWR, purge 없음")에서는 기본값이 오히려 유리하다(배포하면 새 HTML이 즉시 반영된다).
- **과금 주의**: 캐시를 켜면 "All requests are billed at the standard Workers request rate, including static asset and worker-to-worker requests that are normally free"이다. 즉 원래 무료인 정적 자산 요청과 service binding 요청까지 request 수에 잡힌다. Free plan(일 100k 요청)에서 정적 자산이 많으면 한도에 영향을 준다. Free plan에서도 쓸 수 있는지는 Cloudflare 출시 블로그를 인용한 검색 결과에 "any plan"이라고 나오지만 공식 문서 본문에서는 확인하지 못했다 **[미확인]**.

### Astro 7의 route caching + `cacheCloudflare()` [확인]
출처: https://docs.astro.build/en/guides/caching/ , 패키지 소스 `dist/cache/provider.js`, `dist/utils/response.js`
- Astro 7.0.0에서 `Astro.cache.set({ maxAge, swr, tags })`와 config의 `routeRules`가 추가됐다. **어댑터 CDN provider는 "experimental"**이라 수동으로 켜야 한다.
  ```js
  import { cacheCloudflare } from '@astrojs/cloudflare/cache';
  export default defineConfig({
    adapter: cloudflare({ imageService: 'passthrough' }),
    session: false,
    trailingSlash: 'always',
    cache: { provider: cacheCloudflare() },
    routeRules: {
      '/[slug]': { maxAge: 60, swr: 600 },
      '/tag/[slug]': { maxAge: 60, swr: 600 },
    },
  });
  ```
- `cacheCloudflare()`는 `Cloudflare-CDN-Cache-Control`과 `Cache-Tag`(경로 태그 자동 추가, `CF_VERSION_METADATA`가 있으면 버전 태그도 추가)를 붙인다. 어댑터는 wrangler config에 `cache.enabled: true`를 자동으로 넣는다. 그리고 캐시 의도가 없는 응답에는 자동으로 `Cloudflare-CDN-Cache-Control: no-store`를 붙인다(소스 주석: "Cloudflare's Worker cache otherwise caches all GET responses for up to two hours"). 위의 2시간 휴리스틱 함정을 막아 준다.
- dev에서는 `cache.set()`과 `invalidate()`가 no-op이다. 테스트는 `astro build && astro preview`로 한다.
- 브라우저용 `Cache-Control`은 이와 별개로 페이지에서 직접 설정할 수 있다(예: `public, max-age=0, must-revalidate`). CDN에는 `Cloudflare-CDN-Cache-Control`만 쓰이므로 둘이 충돌하지 않는다.

**권장(추론)**: (a) 수동으로 `Astro.response.headers`와 wrangler `cache.enabled`를 쓰는 방법과 (b) Astro `routeRules`와 `cacheCloudflare()`를 쓰는 방법 중 **(b)**를 택한다. 이유는 no-store 기본값을 자동으로 처리하고, 라우트 규칙을 한 곳에 모을 수 있기 때문이다. 다만 experimental이므로 구현 티켓에서 (a)로 바로 갈 수 있게 fallback을 적어 둔다. 정적 자산(`/_astro/*`)은 어댑터가 `_headers`에 `public, max-age=31536000, immutable`을 넣어 준다(패키지 `dist/utils/headers.js`).

---

## 6. RSS와 sitemap을 SSR로

### RSS (`/rss/`) [확인]
- `@astrojs/rss`의 `rss()`는 `Response`(`Content-Type: application/xml`)를 반환하고 SSR 엔드포인트에서도 동작한다. `getRssString()`으로 문자열만 받아 헤더를 직접 구성할 수도 있다. `astro.config`에 `site`가 필요하다.
  출처: https://docs.astro.build/en/recipes/rss/ , `@astrojs/rss@4.0.19` README
- **함정**: Astro 6부터 **확장자가 있는 엔드포인트(`rss.xml.ts`)는 trailing slash로 접근할 수 없다**. Ghost와 같은 `/rss/` URL을 쓰려면 파일을 `src/pages/rss/index.ts`처럼 **확장자 없는 라우트**로 만들고 `trailingSlash: 'always'`를 쓴다.
  출처: https://docs.astro.build/en/guides/upgrade-to/v6/ (endpoints with a file extension)
  ```ts
  // apps/site/src/pages/rss/index.ts
  import rss from '@astrojs/rss';
  import type { APIContext } from 'astro';
  import { api } from '../../lib/api';
  export const prerender = false;
  export async function GET(context: APIContext) {
    const posts = await (await api.posts.$get({ query: { limit: '20' } })).json();
    return rss({ title, description, site: context.site!, items: posts.map(toRssItem) });
  }
  ```
- `trailingSlash: 'always'`이면 production에서 `/foo`는 `/foo/`로 **301**(GET) 리다이렉트된다. dev에서는 경고 페이지가 뜬다. Ghost URL 정책(`/{slug}/`)과 맞는다.
  출처: https://docs.astro.build/en/reference/configuration-reference/ (trailingSlash)
- RSS item의 `link`에 trailing slash가 붙는 것이 기본값이다(`trailingSlash` 옵션, README). Ghost 형식과 맞는다.

### Sitemap (`/sitemap.xml`) [확인]
- `@astrojs/sitemap` 통합은 **SSR 모드의 동적 라우트 항목을 만들 수 없다**("This integration cannot generate sitemap entries for dynamic routes in SSR mode"). 우리처럼 모든 Content가 DB에서 오는 경우에는 쓸모가 없다.
  출처: https://docs.astro.build/en/guides/integrations-guide/sitemap/
- 대신 `src/pages/sitemap.xml.ts` 엔드포인트를 직접 만든다. API에서 published Post/Page/Tag 목록(slug, updatedAt)을 받아 XML 문자열을 생성한다. 확장자 엔드포인트라서 trailing slash 없이 `/sitemap.xml`로만 접근된다. Ghost URL과 같다. 50,000 URL 제한을 넘을 일은 없으므로 sitemap index는 불필요하다(추론).
- RSS와 sitemap 모두 5절의 `routeRules`로 짧은 TTL과 SWR을 준다.

---

## 7. map.md 결정과의 긴장 / 후속 확인 필요

1. **Workers Cache 과금**: "짧은 TTL + SWR"을 Cloudflare 엣지에서 실현하는 공식 경로는 Workers Cache다. 이것을 켜면 **정적 자산과 service binding 요청도 request 과금 대상**이 된다(공식 문서). Free plan 한도(일 100k)와의 관계를 인프라 티켓에서 확인해야 한다. 캐시는 Site Worker에만 켜고 API Worker에는 켜지 않는 것을 권장한다(추론).
2. **어댑터 기본값이 Images binding과 Session KV를 추가한다**. 끄지 않으면 Site Worker에 쓰지 않는 KV와 Images binding이 프로비저닝된다. `imageService: 'passthrough'`와 `session: false`를 구현 티켓에 명시해야 한다.
3. **Panda는 v2**: `presets` 자동 포함이 없어지는 등 v1과 다르다. `modern-react-starter`의 Panda 버전과 맞지 않으면 마이그레이션이 필요하다 **[미확인]**.
4. **Astro 7은 Vite 8을 쓴다**(어댑터 deps). Admin(React + TanStack Router)과 Storybook, Vitest browser mode의 Vite 버전을 모노레포에서 맞춰야 할 수 있다 **[미확인]**.
5. hono-openapi 라우트와 `hc` 타입 추론의 호환성은 별도 검증이 필요하다 **[미확인]**.

## 출처 목록
- Astro Cloudflare adapter: https://docs.astro.build/en/guides/integrations-guide/cloudflare/
- Astro Cloudflare deploy: https://docs.astro.build/en/guides/deploy/cloudflare/
- Astro caching: https://docs.astro.build/en/guides/caching/
- Astro on-demand rendering: https://docs.astro.build/en/guides/on-demand-rendering/
- Astro directives (`is:inline`): https://docs.astro.build/en/reference/directives-reference/
- Astro config (`trailingSlash`): https://docs.astro.build/en/reference/configuration-reference/
- Astro v6 upgrade (endpoint trailing slash): https://docs.astro.build/en/guides/upgrade-to/v6/
- Astro RSS recipe: https://docs.astro.build/en/recipes/rss/
- Astro sitemap: https://docs.astro.build/en/guides/integrations-guide/sitemap/
- npm 패키지 소스: `@astrojs/cloudflare@14.4.2` (`dist/index.js`, `dist/index.d.ts`, `dist/wrangler.js`, `dist/cache/provider.js`, `dist/utils/response.js`, `dist/utils/headers.js`, `dist/fetch.js`), `@astrojs/rss@4.0.19` README
- Cloudflare Workers Cache: https://developers.cloudflare.com/workers/cache/ , https://developers.cloudflare.com/workers/cache/configuration/
- Cloudflare service bindings: https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/http/ , https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/rpc/
- Cloudflare multi-worker dev: https://developers.cloudflare.com/workers/development-testing/multi-workers/
- Cloudflare Vite plugin API: https://developers.cloudflare.com/workers/vite-plugin/reference/api/
- Hono RPC: https://hono.dev/docs/guides/rpc (ctx7 `/honojs/website`)
- Panda CSS: https://panda-css.com/docs/installation/astro , https://panda-css.com/docs/customization/presets , https://panda-css.com/docs/guides/component-library , conditions: https://github.com/chakra-ui/panda/blob/v2/website/content/docs/theming/conditions.mdx
- Workers Cache 플랜 가용성(2차): https://flaviocopes.com/cloudflare-workers-cache.md , https://www.webpronews.com/cloudflare-gives-every-worker-its-own-tiered-cache/
