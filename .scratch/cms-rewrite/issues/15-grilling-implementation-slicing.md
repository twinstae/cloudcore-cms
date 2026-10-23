# 남은 영역을 구현 티켓으로 어떻게 나눌 것인가

Label: wayfinder:grilling
Type: grilling
Status: resolved
Blocked by: 02, 10, 11, 12, 13, 14, 16, 17

## Question

앞선 결정들을 바탕으로 **이 맵의 child로** 구현 티켓(`Type: implementation`)을 만들고 blocking을 연결한다. 결정이 먼저 끝난 영역(예: 모노레포 뼈대)은 이 티켓을 기다리지 않고 해당 결정 티켓을 닫을 때 바로 구현 티켓을 만든다. 이 티켓은 남은 영역을 모두 구현 티켓으로 바꾸고 빠진 것이 없는지 점검한다.
- 순서: 인프라와 툴링 뼈대(모노레포, lefthook, `legacy/` 이동) → 스키마 패키지 → 인증 → Content API → Admin 기능별 vertical slice → Site → e2e → `legacy/` 삭제
- 티켓마다 필요한 것: 완료 조건, 따라야 할 컨벤션 문서와 ADR 링크, 필요한 테스트 계층(unit/component(story + siheom)/API/e2e)
- HITL 티켓 구분: 도메인 구입, D1/R2/Images 생성, Workers Builds 연결 체크리스트
- "Not yet specified"에 남아 있는 항목을 각 티켓 안에서 처리할지, 별도로 결정할지

## Answer

PRD 6종(`docs/prd/`)을 먼저 썼고, 그 UC를 기준으로 구현 티켓 24–35를 만들었다. 기존 18–23은 그대로 둔다.

순서와 blocking:

| 티켓 | 내용 | Blocked by |
| --- | --- | --- |
| 24 | Admin 셸, 권한별 내비, 다크모드 토글 | 14, 23 |
| 25 | Content 초안 CRUD와 목록 | 11, 23, 24 |
| 26 | 발행·예약·발행 취소(Cron) | 25 |
| 27 | Revision 스냅샷·복원 | 18, 25 |
| 28 | Media 업로드·변환·R2·삭제 | 02, 23, 24 |
| 29 | 공개 읽기 API | 26 |
| 30 | Site 뼈대·테마·Site Settings | 13, 29 |
| 31 | Site 글·Page·태그·RSS·sitemap | 18, 30 |
| 32 | Site Build 트리거·상태 표시 | 17, 26, 30 |
| 33 | 초대·비밀번호 재설정·passkey | 23 |
| 34 | 셀프호스팅 문서·JSON export | 32, 33 |
| 35 | 최소 e2e, CPU 실측 기록, legacy 삭제 | 19, 20, 31, 34 |

"Not yet specified" 항목은 각 티켓의 "열린 질문"으로 옮겼다(예: Media 참조 무결성 → 28, Cron 주기 → 26, 백업 범위 → 34). 에디터(08)와 데이터 모델(11)이 아직 열려 있어 18–20, 25가 그 결정을 기다린다.
