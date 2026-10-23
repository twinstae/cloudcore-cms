# Research 17: Site Build 트리거와 정적 Astro를 Workers에 배포하기

- 티켓: `.scratch/cms-rewrite/issues/17-research-site-build-trigger.md`
- 조사일: 2026-10-23
- 전제: Workers Free 플랜 필수(ADR-0005), Site는 정적 빌드(ADR-0004), GitHub Actions는 쓰지 않는다.
- 표기: **[확인]** 1차 출처(Cloudflare/Astro 공식 문서, API reference, changelog)로 확인함 / **[미확인]** 문서에 명시가 없어서 추론했거나 직접 실행해 보지 않은 것

## 요약

1. **Workers Builds에는 Deploy Hook이 있다.** 2026-04-01 changelog로 추가됐고, Worker마다 브랜치 1개에 묶인 URL을 만들고 `POST`하면 빌드와 배포가 시작된다. 인증 헤더가 필요 없다(URL 속 UUID가 비밀). Limits 표에 Free/Paid 공통 항목으로 나와 있어 **Free 플랜에서 쓸 수 있다**. [확인]
2. 같은 브랜치에 빌드가 `queued`나 `initializing` 상태일 때 다시 호출하면 **새 빌드를 만들지 않고 기존 `build_uuid`를 `already_exists: true`로 돌려준다**. 즉 플랫폼이 기본적인 합치기(debounce)를 해 준다. [확인]
3. Free 한도: 월 빌드 3,000분, **계정 전체 동시 빌드 1개**, 빌드 하나 최대 20분, 2 vCPU / 8 GB, Deploy Hook은 Worker당 분당 10회, 계정당 분당 100회. [확인]
4. 정적 Astro는 어댑터 없이 `output: 'static'`(기본값) + `wrangler.jsonc`의 `assets`만으로 배포한다(`main` 없음). 정적 자산 요청은 **무료이고 무제한**이며 하루 10만 요청 한도에 들어가지 않는다. [확인]
5. 예약 발행은 API Worker의 Cron Trigger(Free는 계정당 5개, 호출당 CPU 10ms)에서 상태를 바꾸고 Deploy Hook을 `fetch`하면 된다. [확인 + 설계 추론]
6. GitHub에 빈 커밋을 push하는 대안보다 Deploy Hook이 단순하다(GitHub 토큰 불필요, 히스토리 오염 없음). ADR-0004/0005와 **충돌하는 사실은 찾지 못했다.**

---

## 1. Workers Builds를 외부에서 트리거하는 방법

### 1.1 Deploy Hook [확인]

출처: https://developers.cloudflare.com/workers/ci-cd/builds/deploy-hooks/ , changelog https://developers.cloudflare.com/changelog/post/2026-04-01-deploy-hooks/ (2026-04-01), API reference https://developers.cloudflare.com/api/resources/workers_builds/subresources/deploy_hooks/methods/trigger/

- 전제 조건: Worker가 Git 저장소에 연결되어 있어야 한다(Workers Builds).
- 만들기: 대시보드 **Workers & Pages → (Site Worker) → Settings → Builds → Deploy Hooks**에서 이름과 브랜치를 정하고 Create, URL을 복사한다. Hook 하나는 브랜치 하나만 빌드한다.
- 호출:

  ```
  POST https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/<DEPLOY_HOOK_ID>
  ```

  `Authorization` 헤더가 필요 없다. 문서 표현: "The unique identifier embedded in the URL acts as the authentication credential."
- 응답: `{ success, errors, messages, result }`. `result`에 `build_uuid`, `already_exists`(같은 브랜치에 대기 중인 빌드가 이미 있으면 `true`), `created_on`, `status`(`queued` | `initializing` | `running` | `stopped`)가 들어 있다. 빌드 기록에는 `build_trigger_source: "deploy_hook"`로 남는다.
- 중복 제거: "If a hook is triggered again while the previous build is `queued` or `initializing`, no new build is created." 이전 빌드가 `initializing`을 지나면 다음 `POST`는 새 빌드를 만든다.
- rate limit: Worker당 분당 10회, 계정당 분당 100회(Free/Paid 같음).
- 보안 지침: URL을 비밀처럼 다룬다("Anyone with access to the URL can trigger builds for your Worker"). 소스나 공개 설정에 넣지 말고 secret에 둔다. 유출되면 Hook을 지우고 새로 만든다(지우는 즉시 옛 URL은 동작하지 않는다).

### 1.2 Builds API (토큰 방식) [확인]

출처: https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/ , https://developers.cloudflare.com/api/resources/workers_builds/subresources/triggers/methods/create_build/

- 수동 빌드: `POST /accounts/{account_id}/builds/triggers/{trigger_uuid}/builds`, body `{"branch": "main"}` 또는 `commit_hash`.
- 취소: `PUT /accounts/{account_id}/builds/builds/{build_uuid}/cancel`. 목록: `GET /builds/workers/{worker_tag}/builds`. 로그: `GET /builds/builds/{build_uuid}/logs`.
- 토큰: **user-scoped API token**이 필요하다(account-scoped 토큰은 "Invalid token"). 권한은 **Workers Builds Configuration: Edit**(+ worker tag 조회용 Workers Scripts: Read). API reference는 권한 이름을 "Workers CI Write"로 적고 있어 이름이 문서마다 다르다. [미확인: 둘이 같은 scope인지]
- 판단: 트리거만 할 거라면 Deploy Hook이 낫다. user-scoped 토큰은 Owner 개인 계정 권한이라 API Worker에 두기 부담스럽다. 빌드 상태 조회나 취소가 꼭 필요할 때만 이 토큰을 쓴다.

### 1.3 API Worker에서 secret 다루기 [설계 제안]

- Hook URL 전체(또는 UUID만)를 API Worker의 secret으로 둔다: `wrangler secret put SITE_DEPLOY_HOOK_URL`. Free 플랜 Worker당 변수(secret + text) 64개 한도 안이다(https://developers.cloudflare.com/workers/platform/limits/).
- env를 parse할 때(valibot) URL 형식을 검증한다. 로그에 URL을 출력하지 않는다.
- 호출은 `ctx.waitUntil(fetch(env.SITE_DEPLOY_HOOK_URL, { method: 'POST' }))`처럼 응답 경로 밖에서 한다. `fetch` 대기는 CPU 시간이 아니므로 10ms 한도 부담이 작다. 서브요청 1건이고 Free 한도는 호출당 50건이다. [CPU 소모량은 미측정]
- 응답의 `build_uuid`, `created_on`을 D1에 저장해 두면 Admin에 "빌드 대기/진행 중"을 보여줄 수 있다.

## 2. Workers Builds 무료 한도와 동시 트리거 처리

### 2.1 한도 [확인]

출처: https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/

| 항목 | Free | Paid |
|---|---|---|
| 빌드 시간 | 월 3,000분 | 월 6,000분(초과 $0.005/분) |
| 동시 빌드 | **1 (계정 전체)** | 6 |
| 빌드 timeout | 20분 | 20분 |
| CPU / 메모리 / 디스크 | 2 vCPU / 8 GB / 20 GB | 4 vCPU / 8 GB / 20 GB |
| Deploy Hook rate limit | Worker당 10/분, 계정당 100/분 | 같음 |
| 빌드 환경 변수 | Worker당 64개, 각 5 KB | 같음 |

- 빌드 하나가 3분이면 월 약 1,000회 빌드가 가능하다. 1인 블로그에는 충분하다.
- **동시 빌드 1개는 계정 전체 기준**이다. `apps/api`(+Admin)와 `apps/site`를 push할 때 도는 빌드와 발행 시 Site 빌드가 서로 기다린다.
- 20분 timeout이 Site 규모의 상한이다. 글이 아주 많아지면 빌드 시간을 측정해야 한다.
- Free에서 3,000분을 다 쓰면 어떻게 되는지(빌드 거부 여부)는 문서에 없다. [미확인]

### 2.2 이미 빌드가 돌고 있을 때 새 트리거 [일부 확인]

- `queued`/`initializing` 중 재호출 → 합쳐진다(새 빌드 없음, `already_exists: true`). [확인]
- `running` 중 재호출 → 새 빌드가 만들어진다. [확인] 동시 빌드 1개 한도 때문에 이 빌드는 `queued`로 기다렸다가 앞 빌드가 끝나면 실행될 것으로 보인다. 응답 `status`에 `queued` 값이 있다는 점이 근거다. 동시 빌드 한도에 걸린 빌드를 거부하는지 기다리게 하는지는 문서에 명시가 없다. [미확인, 실제로 확인 필요]
- 이렇게 동작한다면 결과적으로 **"실행 중 1개 + 대기 1개"로 자연스럽게 합쳐진다.** 대기 중인 빌드는 시작할 때 공개 API를 호출하므로, 그 사이의 모든 변경이 반영된다. API 쪽에서 따로 debounce 큐를 만들 필요가 거의 없다. [설계 추론]
- 자동 취소(새 빌드가 실행 중인 빌드를 취소)는 문서에 없다. 필요하면 1.2의 cancel API를 써야 한다. [미확인]
- 빌드 캐시: Settings → Build → Build cache를 켜면 bun 캐시(`.bun/install/cache`)와 Astro 캐시(`node_modules/.astro`)가 저장된다. 마지막으로 읽은 뒤 7일이 지나면 지워지고, 프로젝트당 10 GB다. 빌드 시간을 줄이므로 켜는 것을 권한다. 출처: https://developers.cloudflare.com/workers/ci-cd/builds/build-caching/ [확인]
- Build watch paths: push 이벤트에만 적용된다고 설명되어 있다. 모노레포에서 `apps/site/*`, `packages/*`만 include하면 API만 고친 push로 Site가 빌드되지 않는다. Deploy Hook에 watch paths가 적용되는지는 문서에 없다(적용되지 않을 것으로 보인다: 변경 파일이 없는 push도 빌드된다는 규칙이 있다). 출처: https://developers.cloudflare.com/workers/ci-cd/builds/build-watch-paths/ [Deploy Hook과의 관계는 미확인]

### 2.3 빌드 실패를 Admin에 알리기 [설계 제안, 미확인]

방법 두 가지가 있다.
1. **Builds API 폴링**: user-scoped 토큰을 API Worker secret에 두고 `GET .../builds/builds/{build_uuid}`로 상태를 본다. 토큰 범위가 넓어서 비추천.
2. **빌드에서 API로 콜백**: deploy command를 `npx wrangler deploy && curl -fsS -X POST "$BUILD_CALLBACK_URL" -H "Authorization: Bearer $BUILD_CALLBACK_TOKEN" -d "{\"build\":\"$WORKERS_CI_BUILD_UUID\"}"`처럼 만든다. `WORKERS_CI_BUILD_UUID`, `WORKERS_CI_COMMIT_SHA`는 Workers Builds가 기본으로 넣는 변수다([확인] https://developers.cloudflare.com/workers/ci-cd/builds/configuration/). 성공 콜백이 20분+여유 시간 안에 오지 않으면 API가 "실패/지연"으로 표시한다. 콜백 토큰은 **빌드 변수(secret)**로 둔다. 빌드 변수는 런타임에는 노출되지 않는다([확인] 같은 문서).

## 3. 정적 Astro를 Workers에 올리기

### 3.1 구성 [확인]

출처: Astro 배포 가이드 https://docs.astro.build/en/guides/deploy/cloudflare/ , Cloudflare SSG 가이드 https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/ , wrangler 설정 https://developers.cloudflare.com/workers/wrangler/configuration/#assets

- `@astrojs/cloudflare` 어댑터는 SSR용이다. 정적 사이트는 어댑터 없이 `wrangler.jsonc`에 `assets`만 둔다(`main` 없음).

```jsonc
// apps/site/wrangler.jsonc
{
  "name": "cloudcore-site",
  "compatibility_date": "2026-10-23",
  "assets": {
    "directory": "./dist",
    "html_handling": "force-trailing-slash",
    "not_found_handling": "404-page"
  }
}
```

- Workers Builds 설정: root directory `apps/site`, build command `bun run build`(=`astro build`), deploy command `npx wrangler deploy`(기본값).
- 요금: "Requests to static assets are free and unlimited." Worker 스크립트가 없으므로 방문자 트래픽은 Workers 요청 한도에 집계되지 않는다(ADR-0004의 의도와 일치). 단, `run_worker_first`를 쓰면 Worker가 실행되고 한도를 넘으면 429가 난다. 그러니 쓰지 않는다. 출처: https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ , https://developers.cloudflare.com/workers/platform/pricing/ [확인]

### 3.2 trailingSlash [확인]

- Astro `build.format` 기본값은 `'directory'`라서 `/{slug}/index.html`을 만든다. Ghost URL(`/{slug}/`)과 맞으므로 `trailingSlash: 'always'`로 둔다(dev 서버와 링크 생성을 일치시키기 위함).
- Workers `html_handling`(https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/):
  - `auto-trailing-slash`(기본): `/foo` → 307 `/foo/`, `/foo/` → 200, `/foo/index.html` → 307 `/foo`
  - `force-trailing-slash`: 위와 같고 `/foo/index.html` → 307 `/foo/`
  - Ghost와 맞추려면 `force-trailing-slash`가 적합하다. 리다이렉트 코드가 307(임시)인 점은 SEO상 아쉽다. 필요하면 `_redirects`로 301을 줄 수 있다. [미확인: `_redirects`와 html_handling 중 무엇이 먼저 적용되는지]

### 3.3 404 [확인]

- `src/pages/404.astro` → `dist/404.html`. `not_found_handling: "404-page"`이면 "the nearest `404.html`"을 **404 상태**로 돌려준다.

### 3.4 `/rss/`와 `/sitemap.xml`

- Astro 정적 endpoint는 파일 이름에 확장자를 넣는다(`src/pages/sitemap.xml.ts` → `/sitemap.xml`). 확장자가 있는 endpoint는 `trailingSlash` 설정과 관계없이 슬래시 없이만 접근된다. [확인] https://docs.astro.build/en/guides/endpoints/
- 정적 자산의 `Content-Type`은 확장자로 정해진다. 그러니 `/rss/`(확장자 없음)는 다음과 같이 처리한다.
  - `src/pages/rss.xml.ts`(`@astrojs/rss`)로 `dist/rss.xml`을 만들고,
  - `public/_redirects`에 `/rss/ /rss.xml 200`(rewrite)을 둔다. Workers static assets `_redirects`는 상대 URL에 대한 200 proxying을 지원한다. 정적 리다이렉트 2,000개, 동적 리다이렉트 100개 한도다. [확인] https://developers.cloudflare.com/workers/static-assets/redirects/
  - 대안: `_headers`로 Content-Type을 덮어쓴다(`_headers`는 Cloudflare 기본 헤더를 override한다고 되어 있다. 규칙 100개). [확인] https://developers.cloudflare.com/workers/static-assets/headers/
  - **[미확인]** assets-only Worker에서 200 rewrite가 `html_handling`과 함께 기대대로 동작하는지는 `wrangler dev`로 확인해야 한다.
- 04 조사에서 정한 대로 sitemap은 직접 만든다(`src/pages/sitemap.xml.ts`). 정적 빌드라서 `@astrojs/sitemap`도 쓸 수 있지만 `lastmod`를 넣으려면 직접 만드는 편이 단순하다.

## 4. 빌드 시점에 공개 읽기 API 호출

- 환경 변수: Workers Builds Settings → Build → **Build variables and secrets**에 `PUBLIC_API_URL=https://admin.example.com`(또는 공개 API 경로)를 둔다. 공개 API는 인증이 필요 없으므로 secret이 아니다. [확인] https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- Astro에서 읽기: 서버(빌드) 코드에서는 `import.meta.env`로 읽고, 값은 빌드 시 정적으로 치환된다. 타입이 있는 `astro:env`(`envField.string({ context: 'server', access: 'public' })`)를 쓰면 parse 원칙과도 맞다. `astro.config.mjs`에서는 `process.env`를 쓴다. [확인] https://docs.astro.build/en/guides/environment-variables/
- 전체 목록 가져오기: 공개 목록 API를 커서/페이지 단위로 반복 호출해 모두 모은 뒤 `getStaticPaths`에서 쓴다. 홈과 Tag 목록은 Astro `paginate(items, { pageSize })`로 `/page/N/`, `/tag/{slug}/page/N/`을 만든다. [확인] https://docs.astro.build/en/guides/routing/#pagination
  - 같은 데이터를 여러 페이지가 쓰므로 모듈 수준에서 한 번만 fetch하고 memoize한다(빌드 1회 = API 요청 수십 건 수준이 목표). [설계 제안]
  - API Worker 쪽 요청 한도: 빌드 1회의 요청 수 × 빌드 횟수가 하루 10만 건 안에 들어가야 한다. 페이지 크기를 크게(예: 100) 해서 요청 수를 줄인다. [설계 제안]
  - **[미확인]** Bot Fight Mode나 WAF가 켜져 있으면 빌드 머신의 요청이 막힐 수 있다. 공개 API 경로는 예외 처리가 필요할 수 있다.
- 이미지: Body HTML과 대표 이미지는 R2 커스텀 도메인(`media.example.com`) URL을 그대로 `<img src>`로 쓴다. 정적 빌드에서는 Astro 이미지 최적화를 쓰지 않는다(ADR-0003, 04 조사의 `passthrough`). 그러면 빌드 시 원격 이미지를 받지 않아 빌드가 빠르다. [설계 제안]

## 5. 예약 발행 흐름

출처: https://developers.cloudflare.com/workers/platform/limits/ , https://developers.cloudflare.com/workers/configuration/cron-triggers/

- Free 한도 [확인]: Cron Trigger는 **계정당 5개**, Cron 호출당 CPU **10ms**, 실행 시간(duration) 15분, 호출당 서브요청 50건. UTC로 실행되고, 설정 변경이 반영되기까지 최대 15분이 걸린다. 로컬 테스트는 `curl "http://localhost:8787/cdn-cgi/local/scheduled"`로 한다.
- Cron 호출이 하루 10만 요청 한도에 집계되는지는 Free 기준으로 명시되어 있지 않다. 요금 예시가 Cron 호출을 requests로 셈하므로 집계된다고 보는 편이 안전하다. 매분 실행해도 하루 1,440건이다. [미확인]
- 흐름 [설계 제안]:
  1. API Worker `scheduled(controller, env, ctx)`, 주기는 `* * * * *` 또는 `*/5 * * * *`.
  2. D1에서 `status = 'scheduled' AND published_at <= now` 행을 한 번의 `UPDATE ... RETURNING`으로 `published`로 바꾼다(CPU를 적게 쓰도록 SQL에서 처리).
  3. 바뀐 행이 1개 이상이면 Deploy Hook을 **한 번만** `POST`한다. 여러 글이 동시에 예약되어도 빌드는 1회이고, 중복 호출은 1.1의 dedupe로 합쳐진다.
  4. Revision 생성 등 세부 사항은 "예약 발행 실행 세부" 티켓에서 정한다.
- 반영 지연: Cron 주기 + 대기열 + 빌드 시간(수 분). ADR-0004가 이미 받아들인 비용이다.

## 6. 대안 비교

| 방법 | 필요한 것 | 장점 | 단점 |
|---|---|---|---|
| **Deploy Hook** (권장) | Hook URL 1개(secret) | 토큰 없음, 플랫폼 dedupe, 빌드 기록에 출처 표시 | URL 유출 시 누구나 빌드 가능(rate limit으로 피해 제한, 재발급 쉬움) |
| Builds API 수동 빌드 | user-scoped API token | 브랜치/커밋 지정, 상태 조회·취소 가능 | 개인 계정 토큰을 Worker에 둬야 함, trigger_uuid 조회 필요 |
| GitHub에 빈 커밋 push | GitHub fine-grained PAT(contents:write) | Deploy Hook 이전에는 유일한 방법 | Git 히스토리 오염, PAT 관리, watch paths 규칙(변경 파일 0개 push는 항상 빌드)과 얽힘, GitHub API 호출이 더 복잡 |
| GitHub Actions | - | - | 결정으로 제외됨 |

결론: Deploy Hook이 가장 단순하고 Free 플랜 안에서 동작한다.

## 7. ADR과의 관계

- ADR-0004(정적 빌드 + 발행 시 재빌드): Deploy Hook으로 그대로 구현할 수 있다. **충돌 없음.**
- ADR-0005(Free 플랜 필수): Deploy Hook과 Workers Builds는 Free에서 사용할 수 있다(동시 1, 월 3,000분). 정적 자산 요청은 무료·무제한이다. **충돌 없음.**
- 주의할 제약: 계정 전체 동시 빌드 1개(코드 배포와 Site 빌드가 서로 기다림), 빌드 1회 20분 상한, 빌드 시 API 호출도 API Worker 하루 10만 요청에 포함됨.

## 남은 확인 사항 (구현 티켓에서 실측)

- [ ] Free 동시 빌드 1개 상태에서 두 번째 빌드가 `queued`로 기다리는지 거부되는지
- [ ] Deploy Hook 빌드가 브랜치 HEAD 커밋을 빌드하는지, watch paths의 영향을 받는지
- [ ] assets-only Worker에서 `_redirects`의 `/rss/ /rss.xml 200`과 `force-trailing-slash`의 상호작용
- [ ] 빌드 머신에서 공개 API 호출이 WAF/Bot 설정에 막히지 않는지
- [ ] Deploy Hook `fetch` 1회의 CPU 시간(10ms 한도 대비)
