# Cloudflare에서 이미지 변환, R2 서빙, SSR 캐시는 어떻게 동작하는가

Label: wayfinder:research
Type: research
Status: resolved
Blocked by:

## Question

ADR-0003과 Site 캐시 결정(짧은 TTL + SWR)을 실제로 구현하는 데 필요한 사실을 확인한다.
- **Images binding**(`env.IMAGES`): Worker 안에서 업로드된 이미지를 webp로 변환하고 리사이즈하는 API. 무료 한도(고유 변환 건수, binding 호출 과금 방식), 입력 크기 제한, 애니메이션 GIF와 SVG 처리, EXIF 회전 처리, 로컬 개발(wrangler dev)에서 지원되는지.
- 데스크톱/모바일 2개 크기를 만들 때의 합리적인 너비(예: 2560/1280 또는 1600/800)와 품질 기본값.
- **R2 공개 버킷을 커스텀 도메인으로 연결**: CDN 캐시 동작, Cache-Control 설정, r2.dev와의 차이.
- **Worker가 만든 SSR 응답을 CDN이 캐시하는가**: 커스텀 도메인 zone에서 Worker 응답에 `s-maxage`/`stale-while-revalidate`를 주면 엣지 캐시가 되는지, 아니면 Worker 안에서 Cache API를 직접 써야 하는지. Cache API의 colo 단위 범위와 SWR 지원 여부. workers.dev에서의 동작.
- Cloudflare Registrar 도메인 1개 + 무료 플랜으로 위 구성이 모두 가능한지, 비용이 드는 지점은 어디인지.

결과는 research 문서로 남기고 이 티켓에서 링크한다.

## Answer

- Images binding(`env.IMAGES`): `input → transform → output({format, quality})`. 호출 1회가 unique 변환 1건이고 Free는 월 5,000건이다. 크기 2개를 만들면 2건이므로 업로드는 월 약 2,500장까지 가능하다. 한도를 넘으면 과금 없이 `9422` 에러가 난다.
- 입력 20MB, 100MP, 한 변 12,000px까지. PNG/JPEG/GIF/WebP/SVG/HEIC를 받는다. EXIF 회전이 적용된다. metadata는 `none`, webp quality는 80을 권장한다.
- 애니메이션 GIF는 애니메이션 webp가 된다. **SVG는 변환되지 않는다.** 업로드를 거부하거나 sanitize 정책이 필요하다.
- 로컬 `wrangler dev`와 Vitest에서는 저품질 mock이 돈다. 실제 결과는 `--remote`에서만 확인할 수 있다.
- 크기 권장: 1600px / 800px, `fit: scale-down`(추론).
- R2 커스텀 도메인은 같은 계정의 zone에 연결하고 zone CDN 캐시가 적용된다. `.webp`는 기본으로 캐시된다. r2.dev는 rate limit이 걸리고 캐시가 안 되는 개발용이다.
- zone 캐시는 Worker가 만든 응답을 캐시하지 않는다. **Workers Cache**(2026-07 출시, workers.dev 포함)를 켜면 `public, max-age, stale-while-revalidate`로 SWR을 쓸 수 있다. `s-maxage`가 있으면 SWR이 꺼진다. cache key에 Worker 버전이 들어간다. 캐시 hit와 정적 자산, worker-to-worker 요청도 요청 수로 집계된다.
- 비용: 고정 비용은 도메인뿐이다. 넘칠 수 있는 지점은 Workers 하루 100k 요청과 CPU 10ms, Images 월 5,000건, R2 10GB다.

Context: branch `research/cloudflare-media-and-caching`, file `research/02-cloudflare-media-and-caching.md`
