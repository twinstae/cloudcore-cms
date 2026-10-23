# 마무리: 최소 e2e, CPU 실측 기록, legacy 삭제

Label: wayfinder:implementation
Type: implementation
Status: open
Blocked by: 19, 20, 31, 34

## 작업

맵의 Destination을 닫는다. 기능을 더 넣지 않고 "실제로 도는지"만 확인한다.

- e2e(모킹 없이 전체 스택, 수동 실행): 로그인 → 글 작성(Body, 이미지 Card 1개) → 발행 → Site Build(로컬에서는 빌드 스크립트 직접 실행) → Site에서 글이 보인다. 두 번째 시나리오: 초대 링크로 Author 가입 → 자기 글만 보인다.
- 배포된 Worker에서 로그인 요청의 CPU time을 Observability로 읽어 [23](23-implementation-auth-slice.md)에 숫자로 남긴다. 10ms에 가까우면 PBKDF2 반복 횟수를 낮추고 다시 잰다(50k → 25k).
- `legacy/` 삭제. 삭제 전에 남겨야 할 것이 없는지(문서, 시크릿 이름, rate limit 패턴) 확인한다.
- ADR-0001의 재작성 상태 문구를 갱신하고, AGENTS.md의 "legacy에 대한 설명" 부분을 현재 구조로 바꾼다.
- README에 로컬 실행과 배포 순서를 짧게 정리한다.

## 완료 조건

- e2e 두 시나리오가 통과하고, 결과를 이 티켓에 적는다.
- 로그인 CPU time 실측값과 최종 반복 횟수가 23에 적혀 있다.
- `legacy/`가 없고 `bun run check`가 통과한다.
- 새 체크아웃에서 `bun install && bun run check`가 문서만 보고 재현된다.

## 열린 질문

- e2e를 수동으로만 돌릴지, pre-push에 넣을지(맵은 수동).
- `legacy/` 삭제 시점을 배포 확인 전후 어디로 둘지.

## 참고

- 맵: `.scratch/cms-rewrite/map.md`의 Destination
- ADR-0001
