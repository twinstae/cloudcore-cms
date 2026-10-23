# 남은 영역을 구현 티켓으로 어떻게 나눌 것인가

Label: wayfinder:grilling
Type: grilling
Status: open
Blocked by: 02, 10, 11, 12, 13, 14, 16, 17

## Question

앞선 결정들을 바탕으로 **이 맵의 child로** 구현 티켓(`Type: implementation`)을 만들고 blocking을 연결한다. 결정이 먼저 끝난 영역(예: 모노레포 뼈대)은 이 티켓을 기다리지 않고 해당 결정 티켓을 닫을 때 바로 구현 티켓을 만든다. 이 티켓은 남은 영역을 모두 구현 티켓으로 바꾸고 빠진 것이 없는지 점검한다.
- 순서: 인프라와 툴링 뼈대(모노레포, lefthook, `legacy/` 이동) → 스키마 패키지 → 인증 → Content API → Admin 기능별 vertical slice → Site → e2e → `legacy/` 삭제
- 티켓마다 필요한 것: 완료 조건, 따라야 할 컨벤션 문서와 ADR 링크, 필요한 테스트 계층(unit/component(story + siheom)/API/e2e)
- HITL 티켓 구분: 도메인 구입, D1/R2/Images 생성, Workers Builds 연결 체크리스트
- "Not yet specified"에 남아 있는 항목을 각 티켓 안에서 처리할지, 별도로 결정할지
