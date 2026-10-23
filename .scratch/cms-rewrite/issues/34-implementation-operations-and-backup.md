# 운영 슬라이스: 셀프호스팅 체크리스트, JSON export, 시크릿 정리

Label: wayfinder:implementation
Type: implementation
Status: open
Blocked by: 32, 33

## 작업

김서연이 처음 배포하고, 데이터를 내려받고, 한도를 확인할 수 있게 한다.

- `docs/self-hosting.md`: 도메인 구입 → D1/R2/Images 생성 → 마이그레이션 → `admin`·`site` Worker 연결 → 시크릿 표 → 첫 배포 → `/setup` → Deploy Hook → 도메인 3개 연결. 각 단계마다 대시보드 메뉴 경로와, 건너뛰면 생기는 오류를 적는다.
- 시크릿 표: 이름, 용도, 어디서 얻는지(`BETTER_AUTH_SECRET`, `SITE_DEPLOY_HOOK_URL`, API 주소 등). 값은 문서에 쓰지 않는다.
- API: `GET /api/export` — Content, Revision, Tag, Site Settings, Media 메타데이터를 JSON으로. Media 파일은 URL로만 담는다. Owner만.
- Admin: Site Settings에 "JSON 내려받기" 버튼.
- `docs/operations.md`: D1 export(`wrangler d1 export`)와 R2 동기화(`rclone` 또는 `wrangler r2 object get`) 명령, 복원 순서, 삭제 전 백업 확인.
- 설정 오류가 났을 때 어떤 시크릿이 없는지 알려 주는 응답을 넣는다(EC-O02). 값 자체는 절대 응답에 넣지 않는다.
- 테스트: export에 발행·초안·Revision·Tag·Settings가 모두 들어간다, Author 403, 시크릿 누락 시 500 대신 원인 메시지.

## 완료 조건

- PRD QC: UC-O01, UC-O02(문서 부분), UC-O05와 EC-O01, EC-O02가 통과한다.
- 문서만 보고 새 Cloudflare 계정에서 첫 배포와 Owner 설정까지 할 수 있다.
- `bun run check` 통과.

## 열린 질문

- 복원 도구까지 만들지(지금은 명령과 순서만 문서화).
- export 크기가 무료 요청 한도(응답 크기)를 넘을 때 나눠 받을지.

## 참고

- PRD: [06-operations.md](../../../docs/prd/06-operations.md)
- Workers Builds 연결 예시: 21의 배포 체크리스트
