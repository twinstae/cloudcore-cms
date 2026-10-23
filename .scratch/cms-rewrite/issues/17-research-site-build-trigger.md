# 발행할 때 Site Build를 어떻게 트리거하고, 정적 Astro를 Workers에 어떻게 올리는가

Label: wayfinder:research
Type: research
Status: resolved
Blocked by:

## Question

ADR-0004(Site는 정적 빌드)를 구현하는 데 필요한 사실을 확인한다.
- **Workers Builds를 외부에서 트리거하는 방법**: deploy hook 같은 URL이 있는지, 아니면 Cloudflare API(토큰 권한 범위)로 빌드를 시작해야 하는지. API Worker에서 호출할 때 secret을 어떻게 다룰지.
- Workers Builds **무료 한도**(월 빌드 시간, 동시 빌드 수, 빌드 하나의 최대 시간), 이미 빌드가 돌고 있을 때 새 트리거가 어떻게 처리되는지(큐, 취소, 합침).
- 정적 Astro를 Workers에 올리는 방법: 어댑터 없이 `output: 'static'` + wrangler `assets`만 쓰는 구성, `trailingSlash`, 404 처리, `/rss/`와 `/sitemap.xml` 정적 생성.
- 빌드 시점에 Astro가 API의 공개 읽기 엔드포인트를 호출하는 방식: 빌드 환경 변수, 페이지네이션된 전체 목록 가져오기, 이미지 URL은 R2 커스텀 도메인을 그대로 쓰기.
- 예약 발행: API Worker의 Cron Trigger(무료 플랜 개수 제한)에서 상태를 바꾸고 빌드를 트리거하는 흐름.
- 대안: Workers Builds 대신 다른 방법(예: GitHub에 빈 커밋 push)이 더 단순한지. 단, GitHub Actions는 쓰지 않는다는 결정이 있다.

결과는 research 문서로 남기고 이 티켓에서 링크한다.

## Answer

- **트리거는 Workers Builds Deploy Hook으로 한다**(2026-04-01 출시). Site Worker의 Settings → Builds → Deploy Hooks에서 브랜치 1개용 URL을 만들고, `POST https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/<ID>`를 호출하면 빌드와 배포가 시작된다. 인증 헤더는 필요 없다(URL 속 UUID가 비밀). Limits 표상 Free 플랜에서도 쓸 수 있다.
- **secret**: Hook URL은 API Worker의 `wrangler secret`(`SITE_DEPLOY_HOOK_URL`)으로 두고 `ctx.waitUntil(fetch(..., { method: 'POST' }))`로 호출한다. 유출되면 Hook을 지우고 다시 만든다. Builds API 방식은 user-scoped 토큰(Workers Builds Configuration: Edit)이 필요해서 트리거 용도로는 쓰지 않는다.
- **합치기**: 같은 브랜치에 `queued`/`initializing` 빌드가 있을 때 다시 호출하면 새 빌드 없이 기존 `build_uuid`를 `already_exists: true`로 돌려준다. `running` 중에 호출하면 새 빌드가 생긴다. 결과적으로 "실행 1개 + 대기 1개"로 합쳐지므로 API에 별도 debounce 큐가 거의 필요 없다. 다만 동시 빌드 한도에 걸린 빌드가 기다리는지 거부되는지는 문서에 없어서 실측해야 한다.
- **Free 한도**: 월 빌드 3,000분, **계정 전체 동시 빌드 1개**(api/admin 코드 배포와 Site 빌드가 서로 기다림), 빌드 1회 20분 timeout, 2 vCPU/8 GB, Deploy Hook은 Worker당 분당 10회·계정당 분당 100회다. Build cache(bun과 `node_modules/.astro`)를 켜서 빌드 시간을 줄인다.
- **정적 Astro 배포**: 어댑터 없이 `output: 'static'`으로 두고 `wrangler.jsonc`에는 `assets`만 둔다(`directory: ./dist`, `html_handling: force-trailing-slash`, `not_found_handling: 404-page`, `main` 없음). 정적 자산 요청은 무료이고 무제한이라 요청 한도에 들어가지 않는다. `run_worker_first`는 쓰지 않는다.
- **URL**: Astro `build.format: 'directory'`(기본값)와 `trailingSlash: 'always'`로 `/{slug}/`를 만든다. `404.astro`는 nearest `404.html`로 404 상태와 함께 서빙된다. `/sitemap.xml`은 `sitemap.xml.ts` endpoint로 만든다. `/rss/`는 `rss.xml.ts`로 만들고 `public/_redirects`에 `/rss/ /rss.xml 200` rewrite를 둔다(동작은 미확인이라 `wrangler dev`로 확인 필요).
- **빌드 시 데이터**: Workers Builds의 Build variables에 `PUBLIC_API_URL`을 두고 `astro:env`(server/public)로 parse한다. 공개 목록 API를 큰 페이지 단위로 끝까지 받아 memoize한 뒤 `getStaticPaths` + `paginate()`로 쓴다. 이미지는 R2 커스텀 도메인 URL을 그대로 쓴다.
- **예약 발행**: API Worker Cron(Free: 계정당 5개, 호출당 CPU 10ms, 서브요청 50건)에서 `UPDATE ... RETURNING`으로 `scheduled → published`를 바꾸고, 바뀐 행이 있으면 Deploy Hook을 한 번 호출한다.
- **빌드 실패 알림**(제안): deploy command 끝에 `$WORKERS_CI_BUILD_UUID`를 담아 API로 성공 콜백을 보낸다. 콜백 토큰은 빌드 secret으로 둔다. 일정 시간 안에 콜백이 없으면 Admin에 실패로 표시한다.
- **대안**: GitHub에 빈 커밋을 push하는 방식은 PAT 관리와 히스토리 오염 때문에 Deploy Hook보다 복잡하다. ADR-0004/0005와 충돌하는 사실은 없다.

Context: branch `research/site-build-trigger`, file `research/17-site-build-trigger.md`
