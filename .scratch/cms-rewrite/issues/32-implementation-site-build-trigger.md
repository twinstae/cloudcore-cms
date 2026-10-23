# Site Build 트리거: 발행 시 Deploy Hook, 빌드 상태 표시, 수동 재빌드

Label: wayfinder:implementation
Type: implementation
Status: open
Blocked by: 17, 26, 30

## 작업

발행이 실제로 독자에게 보이는 순간까지 연결한다.

- API가 발행·발행 취소·수정 후 재발행·예약 Cron 발행 때 Workers Builds Deploy Hook을 POST한다(17의 방식). Hook URL은 `env.SITE_DEPLOY_HOOK_URL` 시크릿.
- Hook 호출은 응답을 기다리되 실패해도 Content 상태 변경을 되돌리지 않는다. 실패는 기록만 한다. `[확인 필요]` `waitUntil`로 넘길지, D1에 요청 기록을 남기고 Cron에서 재시도할지.
- D1에 `cc_site_build`(요청 시각, 사유, 결과, 요청자)를 남긴다. 플랫폼은 빌드 완료를 콜백하지 않으므로 Admin은 "요청함/요청 실패/마지막 요청 시각"까지만 보여 준다(17의 제약).
- Admin: Site Settings 화면 아래 빌드 영역 — 마지막 요청 시각과 결과, "다시 빌드" 버튼(Owner만).
- API: `POST /api/site/builds`(Owner만), `GET /api/site/builds/latest`.
- 테스트: 발행 시 Hook이 한 번 호출된다(fake fetch), Hook 실패 시에도 글이 published로 남는다, 같은 사건에 Hook이 두 번 나가지 않는다, 빌드 요청 권한.

## 완료 조건

- PRD QC: UC-S08, UC-S09, EC-S01이 통과한다.
- 배포된 환경에서 글을 발행하면 몇 분 뒤 Site에 나타나고, Admin에 마지막 요청 시각이 남는다.
- `bun run check` 통과.

## 열린 질문

- 20분 상한이나 동시 빌드 1개 때문에 요청이 합쳐질 때의 표시 방법(17은 "플랫폼이 합친다"까지만 확인).
- 실패한 빌드를 자동 재시도할지, 사람이 "다시 빌드"를 누를지.

## 참고

- PRD: [05-site-and-publishing.md](../../../docs/prd/05-site-and-publishing.md) UC-S08, UC-S09
- 조사: `.scratch/cms-rewrite/issues/17-research-site-build-trigger.md`
