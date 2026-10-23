# Cloudflare 이미지 변환, R2 서빙, SSR 캐시 조사

- 티켓: `.scratch/cms-rewrite/issues/02-research-cloudflare-media-and-caching.md`
- 관련 결정: `docs/adr/0003-media-transformed-at-upload.md`, map의 "캐시는 짧은 TTL + SWR, 명시적 purge 없음"
- 조사일: 2026-10-23. 출처는 모두 developers.cloudflare.com, blog.cloudflare.com, cloudflare/workers-sdk 소스다.
- 표기: **[확인]**은 1차 출처에 문장으로 나와 있는 사실이다. **[미확인]**은 문서에서 직접 찾지 못해 추론했거나 실험이 필요한 내용이다.

## 요약 (먼저 볼 것)

1. Images binding(`env.IMAGES`)은 Worker 안에서 바이트를 받아 webp로 변환하고 리사이즈한다. 호출 하나가 **unique transformation** 하나로 집계되고, Free 플랜 한도는 **월 5,000건**이다. 업로드 1건에서 2개 크기를 만들면 2건이 쓰이므로 **월 약 2,500장**까지 업로드할 수 있다. 한도를 넘으면 과금되지 않고 새 변환이 `9422` 에러로 실패한다.
2. `.input()`의 입력 한도는 **20 MB**다. 이미지 면적 한도는 100 MP, 한 변 길이 한도는 12,000px이다. HEIC 입력도 지원한다.
3. EXIF 회전은 **메타데이터를 버리더라도 적용된다**. 기본 metadata 모드는 `copyright`이고, EXIF copyright 태그만 남긴다.
4. 애니메이션 GIF는 기본값 `anim: true`로 처리하면 애니메이션 webp가 된다. `anim: false`로 주면 정지 이미지가 된다. **SVG는 리사이즈나 변환을 하지 않고** 최적화 파라미터도 무시한다.
5. 로컬 `wrangler dev`와 Vitest에서는 **저품질 mock**이 동작한다. `width`, `height`, `rotate`, `format`만 적용되고 과금되지 않는다. 실제와 같은 결과는 `wrangler dev --remote`에서만 확인할 수 있다.
6. R2 공개 버킷을 커스텀 도메인에 연결하면 zone CDN 캐시가 적용된다. `.webp`는 기본으로 캐시되는 확장자다. r2.dev는 rate limit이 걸리고 캐시를 쓸 수 없으며 개발용이다.
7. **Workers Cache**는 2026-07-06에 출시됐다. Worker 앞에 tiered 캐시를 두는 기능이고, wrangler에 `"cache": { "enabled": true }`를 넣으면 켜진다. **모든 플랜과 workers.dev에서 동작하고** `max-age`와 `stale-while-revalidate`를 지원한다. "짧은 TTL + SWR"은 이 기능으로 그대로 구현할 수 있다.
8. 주의: Workers Cache에서는 **`s-maxage`가 있으면 SWR이 꺼진다**. `public, max-age=N, stale-while-revalidate=M` 형태로 줘야 한다.
9. 주의: Workers Cache의 cache key에는 기본으로 **Worker 버전**이 들어가므로 배포할 때마다 캐시가 비워진다. 유지하려면 `cache.cross_version_cache: true`를 켠다. cache key에 host는 들어가지 않는다.
10. 주의: 캐시 hit도 **Workers 요청 1건으로 집계**된다(Free 플랜은 하루 100,000건). 캐시를 켜면 원래 무료인 static asset 요청과 worker-to-worker 호출도 요청으로 과금된다.
11. Cache API(`caches.default`)는 **해당 데이터센터(colo)에만** 저장된다. SWR을 지원하지 않고 tiered cache와도 호환되지 않으므로 SWR 용도로는 맞지 않는다.
12. 필수 비용은 도메인 연 등록비(Registrar 원가)뿐이다. 나머지는 Free 플랜으로 가능하다. 유료로 넘어가는 지점은 요청 수(하루 100k건), CPU(호출당 10ms), Images 월 5,000건, R2 10 GB다.

---

## 1. Images binding (`env.IMAGES`)

### API 모양 [확인]
출처: https://developers.cloudflare.com/images/transform-images/bindings/

- 설정: wrangler 설정에 `images` 블록을 넣고 `binding = "IMAGES"`를 지정하면 Worker에서 `env.IMAGES`로 쓸 수 있다.
- 체인 순서: `env.IMAGES.input(stream)` → `.transform({ width, height, fit, rotate, ... })`(여러 번 호출 가능하고 쓴 순서대로 적용) → `.output({ format, quality, anim })` → `.response()`(또는 결과 stream).
- `.input()`은 "image bytes up to 20 MB"를 받는다. 입력 소스는 request body, R2, fetch 응답 등이다.
- `.output()`의 `format`은 **필수**다. "there is no default output format". webp, avif, jpeg 등을 지원한다.
- `.info(stream)`은 format, fileSize, width, height를 돌려주고 **과금되지 않는다**. 업로드 검증(포맷 확인, 크기 확인)에 쓰기 좋다.
- binding 응답은 자동으로 캐시되지 않는다. 우리는 결과를 R2에 저장하므로 상관없다.

### 과금과 무료 한도 [확인]
출처: https://developers.cloudflare.com/images/pricing/

- "On the Free plan, you can request up to 5,000 unique transformations each month for free."
- "Calls to the Images binding are billed as unique transformations." 같은 소스와 같은 파라미터를 같은 달에 반복하면 한 번만 집계된다.
- "Cloudflare excludes `format` and `quality` when determining whether a transformation is unique." 그래서 크기(width)가 다르면 별개 건으로 센다. **업로드 1건에 데스크톱과 모바일 2개 크기를 만들면 2건이다.**
- Free 한도를 넘으면 "New transformations will return a `9422` error", "You will not be charged". 업로드 API는 이 에러를 받으면 사용자에게 알려주는 경로가 필요하다.
- 유료(Workers Paid와 무관한 Images Paid) 가격은 5,000건 초과분부터 1,000건당 $0.50다.
- 로컬 개발에서 binding을 써도 과금되지 않는다.

### 입력 제한과 포맷 [확인]
출처: https://developers.cloudflare.com/images/get-started/limits/

- 입력 포맷: PNG, JPEG, GIF(애니메이션 포함), WebP(애니메이션 포함), SVG, HEIC. AVIF 입력은 Enterprise 전용이다.
- 출력 포맷: PNG, JPEG, GIF, WebP(애니메이션 포함), SVG, AVIF.
- 면적 100 MP(예: 10,000×10,000), 한 변 12,000px(WebP/AVIF 제외), AVIF 출력은 1,200px까지다.
- binding `.input()`의 입력은 20 MB까지다. URL 방식의 remote image 한도(100 MB)보다 작으므로 **업로드 크기 상한을 20 MB 이하로 잡아야 한다.**

### 애니메이션 GIF [확인 + 일부 미확인]
- `anim: true`가 기본값이고 "Outputs the animated image with all frames" 동작을 한다. `anim: false`로 주면 정지 이미지가 된다. (https://developers.cloudflare.com/images/transform-images/transform-via-url/, binding 문서)
- 애니메이션 면적은 모든 프레임 면적의 합으로 계산한다. "Animations over 50 MP are served with no transformations applied." (limits 페이지)
- **[미확인]** 이 50 MP 규칙이 binding에서도 똑같이 적용되는지(변환 없이 원본 바이트가 나오는지, 에러가 나는지)는 문서에 나와 있지 않다. 원본 바이트가 나오면 출력이 webp가 아닐 수 있다. 업로드 후 `.info()`로 출력 포맷을 다시 확인하는 방어 코드를 권장한다.

### SVG [확인 + 미확인]
- "Cloudflare does not resize SVG files and will ignore any optimization parameters." Images가 SVG를 **서빙할 때** svg-hush로 sanitize한다(스크립트, 외부 문서 링크, cross-origin 참조 제거). (limits 페이지)
- **[미확인]** binding에서 SVG에 `.output({ format: 'webp' })`를 걸면 무시되는지 에러가 나는지는 문서에 없다. 실험이 필요하다.
- **설계 시사점(추론)**: 우리는 R2에서 바로 서빙하므로 svg-hush가 적용되지 않는다. SVG를 그대로 저장해 `media.` 도메인에서 서빙하면 스크립트가 들어간 SVG가 그 origin에서 실행될 수 있다. 업로드 단계에서 **SVG를 거부**하거나 서버에서 sanitize해야 한다. Media를 별도 서브도메인(`media.example.com`)에 두는 구성은 피해 범위를 줄여 준다.

### EXIF 회전과 메타데이터 [확인]
출처: https://developers.cloudflare.com/images/transform-images/transform-via-url/ (binding은 같은 옵션 세트를 쓴다)

- "Color profiles and EXIF rotation are applied to the image even if the metadata is discarded."
- `metadata` 기본값은 `copyright`이고 "Discards all metadata except EXIF copyright tag". GPS 같은 위치 정보는 기본으로 제거된다. 완전히 제거하려면 `none`을 쓴다.
- `quality` 기본값은 "The default is `85`."

### 로컬 개발 [확인]
- `wrangler dev`: "low-fidelity offline version that supports only `width`, `height`, `rotate`, and `format`". Vitest 통합도 기본으로 이 오프라인 버전을 쓴다. (binding 문서)
- `wrangler dev --remote`: 운영과 같은 고품질 버전으로 동작한다.
- workers-sdk 소스(miniflare `outbound.worker.ts`)는 로컬에서 "Local cf.image transforms are a low-fidelity mock; only resize, rotate and format conversion are applied" 경고를 한 번 출력한다. 로컬 mock은 Sharp를 사용한다. (https://github.com/cloudflare/workers-sdk/blob/main/packages/miniflare/src/workers/core/outbound.worker.ts, ctx7 `/cloudflare/workers-sdk`로 확인)
- 시사점: `@cloudflare/vitest-pool-workers` API 테스트에서도 binding은 동작한다. 다만 `quality`, `fit`, `metadata`, `anim` 결과는 로컬에서 검증할 수 없다.

### Free 플랜 CPU 10ms와의 관계 [미확인]
- Workers Free 플랜의 CPU 한도는 호출당 10ms다(https://developers.cloudflare.com/workers/platform/pricing/). 변환은 Images 서비스에서 수행되고 Worker는 I/O를 기다리기만 하므로 Worker CPU에는 거의 잡히지 않을 것으로 **추정한다**. 문서로는 확인하지 못했다. 업로드 요청을 multipart로 파싱하는 비용이 10ms를 넘는지는 실측이 필요하다.

## 2. 데스크톱/모바일 2개 크기와 품질 기본값 (권장안, 추론)

1차 출처에 정해진 "정답"은 없다. 아래는 근거를 붙인 권장안이다.

- **너비: 데스크톱 1600px, 모바일 800px** (`fit: 'scale-down'`, 원본보다 크게 늘리지 않음)
  - Ghost 기본 테마 계열의 본문 컬럼은 약 720~800 CSS px다. 1600은 그 2x(레티나), 800은 휴대폰 약 400 CSS px의 2x에 해당한다.
  - 2560/1280은 와이드(full-bleed) 이미지에는 낫지만 파일이 약 2.5배 커진다. full-width Card가 핵심 기능이 아니라면 1600/800으로 충분하다.
  - `dpr` 파라미터의 최대값이 2라는 점도 2x 기준과 맞는다(https://developers.cloudflare.com/images/optimization/features).
- **품질**: Cloudflare 기본값은 85다. webp는 같은 숫자라도 jpeg보다 효율이 좋으므로 **80**을 권장한다(일반적인 관행이며 출처에 근거한 수치는 아님). `format`과 `quality`는 unique 집계에서 빠지므로 품질 값은 과금에 영향을 주지 않는다.
- `metadata: 'none'`을 권장한다. 위치 정보 유출을 막고 크기도 줄어든다. EXIF 회전은 그래도 적용된다.
- 원본이 800px보다 작으면 두 크기가 같아진다. 이때는 변환을 한 번만 하면 한도를 아낄 수 있다(설계 선택).

## 3. R2 공개 버킷 + 커스텀 도메인

출처: https://developers.cloudflare.com/r2/buckets/public-buckets/, https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/, https://developers.cloudflare.com/cache/concepts/default-cache-behavior/

- [확인] 커스텀 도메인은 "must have been added as a zone in the same account as the R2 bucket" 조건이 있다. Registrar로 산 도메인은 자동으로 같은 계정의 zone이 된다.
- [확인] "Domain access through a custom domain allows you to use Cloudflare Cache". 캐시, WAF, 접근 제어, Bot Management는 커스텀 도메인에서만 된다.
- [확인] r2.dev는 "rate-limited and should only be used for development purposes"이다. r2.dev로 CNAME을 거는 구성은 지원하지 않는다.
- [확인] 기본으로 캐시되는 확장자 목록에 **WEBP가 들어 있다**. 판단은 MIME이 아니라 확장자로 한다. HTML과 JSON은 Cache Rule이 없으면 캐시되지 않는다. → **R2 object key를 `.webp`로 끝나게 만들면** 별도 Cache Rule 없이 캐시된다.
- [확인] Free, Pro, Business 플랜은 origin `Cache-Control`을 따른다. 헤더가 없으면 200 응답의 기본 edge TTL은 120분이다. Free 플랜에서 캐시할 수 있는 파일은 512 MB까지다.
- [확인] Smart Tiered Cache(Smart Topology)는 Free 플랜에서도 쓸 수 있다(https://developers.cloudflare.com/cache/how-to/tiered-cache/). R2용으로 권장되는 설정이다.
- [확인] R2 `put()`의 `httpMetadata.cacheControl`과 `contentType`으로 object에 HTTP 메타데이터를 저장할 수 있다(https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).
- **[미확인]** 공개 버킷 커스텀 도메인 응답에 저장된 `cacheControl` 값이 `Cache-Control` 헤더로 그대로 나간다는 문장은 문서에서 찾지 못했다. 일반적으로 그렇게 동작한다고 알려져 있지만 배포 후 `curl -I`로 확인해야 한다. 안 되면 zone Cache Rule(Edge TTL과 Browser TTL)로 대체한다.
- 권장(추론): Media key를 불변(ULID + 크기 접미사, 예: `01J....-1600.webp`)으로 만들고 `Cache-Control: public, max-age=31536000, immutable`을 준다. Media를 삭제해도 캐시된 사본은 TTL이 끝날 때까지 남을 수 있다. R2 문서에 따르면 삭제된 object가 캐시에 있으면 계속 제공된다. 명시적 purge를 하지 않기로 했으므로 이 점을 감수해야 한다(삭제가 즉시 반영되어야 하는 법적 요청이 있으면 대시보드에서 수동으로 purge한다).

## 4. Worker SSR 응답 캐시

### 결론
- **zone CDN 캐시는 Worker가 직접 만든 응답을 캐시하지 않는다.** Worker는 캐시 앞에서 실행되고, zone 캐시는 Worker의 `fetch()` subrequest에만 적용된다. Workers Cache 문서는 Cache Rules, Page Rules, cache level 같은 zone 설정이 Worker 캐시에 "no effect"라고 명시한다. (https://developers.cloudflare.com/cache/interaction-cloudflare-products/workers/, https://developers.cloudflare.com/workers/cache/)
- 그래서 커스텀 도메인에서 Worker 응답에 `s-maxage`만 붙이는 방식으로는 예전에는 엣지 캐시가 되지 않았다. **지금은 Workers Cache를 켜면** `Cache-Control` 헤더만으로 Worker 응답이 캐시된다.

### Workers Cache [확인]
출처: https://blog.cloudflare.com/workers-cache/ (2026-07-06), https://developers.cloudflare.com/workers/cache/ 하위 문서

- 켜기: `"cache": { "enabled": true }`(Wrangler 4.69.0 이상). entrypoint별 설정(`exports`)과 `cross_version_cache`는 Wrangler 4.107.0 이상이 필요하다. `env.<name>.cache`로 환경별 설정도 할 수 있다. (https://developers.cloudflare.com/workers/cache/configuration/)
- 플랜과 도메인: "available today to every Worker on any plan". "The cache works on `workers.dev`". 캐시는 zone이 아니라 Worker에 속한다.
- 범위: tiered이고 네트워크 전체에 걸친다. lower tier(사용자와 가까운 colo)와 upper tier가 있고, 첫 요청이 upper tier를 채운다. cache key별, colo별로 request collapsing을 한다.
- SWR: `max-age` 동안은 Worker를 실행하지 않는다. `stale-while-revalidate` 구간에는 stale 응답을 즉시 주고 백그라운드에서 Worker를 실행한다(`Cf-Cache-Status: UPDATING`). 두 구간을 모두 지나면 사용자가 렌더링을 기다린다. Worker가 에러를 내면 이전 응답을 준다(`STALE`).
- **`s-maxage`, `must-revalidate`, `proxy-revalidate`가 하나라도 있으면 `stale-while-revalidate`와 `stale-if-error`가 꺼진다.** (https://developers.cloudflare.com/workers/cache/debugging/) → `Cache-Control: public, max-age=60, stale-while-revalidate=86400` 형태를 써야 한다. 이 값은 브라우저에도 그대로 적용된다(브라우저 쪽 max-age 60초는 짧은 TTL 결정과 맞는다).
- **[미확인]** `CDN-Cache-Control`이나 `Cloudflare-CDN-Cache-Control`로 브라우저와 엣지 TTL을 나누는 방법이 Workers Cache에서 되는지는 문서에 언급이 없다.
- 캐시를 우회하는 경우: `Cache-Control: private`이나 `no-store`, 응답에 `Set-Cookie`가 있을 때, 요청에 `Authorization`이 있을 때, GET/HEAD가 아닌 메서드, 206 응답, 520~526 응답. → **Astro 미들웨어나 세션이 공개 페이지에서 `Set-Cookie`를 내보내면 캐시되지 않는다.**
- **헤더가 없으면 heuristic TTL이 적용된다**: 200 응답은 2시간, 404는 3분. 캐시를 켠 Worker는 모든 응답에 `Cache-Control`을 명시해야 한다. 예를 들어 `/rss/`, `/sitemap.xml`, 404 페이지도 포함된다.
- cache key: entrypoint, path와 query string(순서도 구분), `ctx.props`, **Worker 버전**(기본)으로 구성된다. **host는 들어가지 않는다.** `cross_version_cache: true`를 켜면 배포 후에도 캐시를 이어 쓴다. (https://developers.cloudflare.com/workers/cache/cache-keys/)
- Purge: `ctx.cache.purge({ tags })`, `ctx.cache.invalidate()`가 있다. 쓰지 않기로 했지만, 예약 발행이나 수정 반영이 느리다고 느끼면 나중에 쓸 수 있는 탈출구다.
- Service binding: callee의 캐시를 먼저 확인한다. `fetch()` 호출만 캐시되고 **RPC 메서드는 캐시를 우회한다**. → Site가 Hono RPC(`hc`)를 service binding의 `fetch`로 부르면 API Worker에서 캐시를 켰을 때 그 응답도 캐시 대상이 된다. **API Worker에서는 캐시를 켜지 않는 것이 안전하다**(인증된 Admin 응답이 heuristic TTL로 캐시될 위험).
- 제한: "A response is only cached once it has been served at least once"(미리 채워 둘 수 없음). 출시 시점에는 응답 크기에 Free 플랜 한도가 적용된다.
- 과금: cache hit도 일반 요청 단가로 1건 집계되고 CPU는 miss일 때만 든다. 캐시를 켜면 "Static asset and worker-to-worker requests, normally free, are billed". **Site Worker에서 캐시를 켜면 Astro 정적 자산(js/css/폰트) 요청까지 하루 100k 한도에 들어간다.** (https://developers.cloudflare.com/workers/cache/, https://developers.cloudflare.com/workers/platform/pricing/)
- **[미확인]** `wrangler dev`나 vitest-pool-workers에서 Workers Cache가 흉내 내지는지는 문서에 없다. 캐시 헤더는 단위 테스트로 검증하고, 실제 캐시 동작은 배포 후 `Cf-Cache-Status`로 확인해야 한다.

### Cache API (`caches.default`) [확인]
출처: https://developers.cloudflare.com/workers/runtime-apis/cache/

- "the contents of the cache do not replicate outside of the originating data center"이므로 colo 단위다.
- "The `stale-while-revalidate` and `stale-if-error` directives are not supported" with `cache.put`/`cache.match`.
- "The `cache.put` method is not compatible with tiered caching." `cache.delete`도 해당 colo에만 적용된다. Cache API는 동시 요청을 collapse하지 않는다.
- workers.dev에서도 동작한다(query string이 key에 포함됨). 대시보드 editor와 Playground에서는 효과가 없다.
- → SWR을 직접 구현하려면 `ctx.waitUntil`로 수동 재검증을 짜야 하므로 복잡하다. Workers Cache가 생긴 지금은 쓸 이유가 거의 없다.

## 5. Registrar 도메인 1개 + Free 플랜으로 가능한가

- 가능하다. 구성은 Site Worker(Custom Domain `example.com`, Workers Cache 켬), API+Admin Worker(`admin.example.com`, 캐시 끔), R2 공개 버킷(`media.example.com`, zone 캐시와 Smart Tiered Cache), Images binding이다. 모두 Free 플랜 기능이다.
- 비용이 드는 지점:
  - 도메인: Registrar는 원가로 판매한다(연 단위, TLD마다 다름). **유일한 고정 비용**이다.
  - Workers Free: 하루 100,000 요청, 호출당 CPU 10ms. **캐시 hit와 (캐시를 켠 Worker의) 정적 자산 요청도 요청 수에 들어간다.** 넘으면 Workers Paid(월 $5부터)가 필요하다. Astro SSR 렌더링이 10ms CPU를 넘는지도 위험 요소다(**[미확인]**, 실측 필요).
  - Images: 월 5,000 unique 변환(업로드 약 2,500건). 넘으면 과금되지 않고 에러가 난다.
  - R2 Free: 저장 10 GB-month, Class A 월 100만, Class B 월 1,000만, egress 무료. 커스텀 도메인 캐시 hit는 R2 읽기가 생기지 않는다.
  - D1 Free: 하루 읽기 5M행, 쓰기 100k행, 저장 5 GB.
  (https://developers.cloudflare.com/workers/platform/pricing/, https://developers.cloudflare.com/images/pricing/)

## ADR-0003과 map에 대한 시사점

1. **ADR-0003의 "workers.dev에서는 CDN 캐시를 쓸 수 없으므로"는 Site SSR에는 더 이상 맞지 않는다.** 2026-07에 나온 Workers Cache는 workers.dev에서도 동작한다. 다만 **r2.dev는 여전히 캐시가 없고** rate limit도 걸리므로, Media 서빙을 위해 커스텀 도메인이 필요하다는 결론은 유지된다. ADR 문구를 고칠지 검토할 필요가 있다.
2. "짧은 TTL + SWR"은 Workers Cache로 구현한다. 헤더는 `s-maxage` 없이 `public, max-age=<짧게>, stale-while-revalidate=<길게>`로 준다. `cross_version_cache` 설정 여부(배포할 때마다 캐시를 비울지)를 정해야 한다.
3. 업로드 1건당 변환 2건이므로 무료 한도는 월 약 2,500장이다. 한도를 넘었을 때(`9422`)의 UX가 필요하다.
4. SVG는 변환되지 않고 svg-hush도 거치지 않으므로 업로드를 거부하거나 sanitize하는 정책이 필요하다.
