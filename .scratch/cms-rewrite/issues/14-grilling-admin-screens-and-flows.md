# Admin 화면과 흐름은 어떻게 구성하는가

Label: wayfinder:grilling
Type: grilling
Status: open
Blocked by: 08, 09

## Question

Ghost Admin을 기준으로 화면 목록과 흐름을 정한다.
- 최초 Owner 설정, 로그인(비밀번호, passkey), Invitation으로 가입, 재설정 링크
- Post/Page 목록(필터: Status, Tag, 작성자. URL search params로 관리)
- 에디터 화면: 제목, Body, 설정 사이드바(slug, 발행일, Tag, 대표 이미지, excerpt, SEO, featured), 자동 저장 표시, 발행/예약/발행 취소 흐름, Revision 목록과 복원
- Media 라이브러리와 에디터 안의 MediaPicker
- Tag 관리, Site Settings(내비게이션 편집 포함), 사용자와 Invitation 관리, 내 프로필과 passkey 관리
- 각 화면에서 쓰는 bunja/jotai 상태와 TanStack Query key 규칙
