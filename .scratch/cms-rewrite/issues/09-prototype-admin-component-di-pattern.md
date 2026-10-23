# Admin 컴포넌트의 격리, 의존성 주입, 테스트 패턴은 어떤 모양인가

Label: wayfinder:prototype
Type: prototype
Status: resolved
Blocked by: 07

## Question

Tag 관리 기능 하나를 끝까지 만들어 보면서 Admin 컨벤션을 정한다.
- `TagForm`: **`SimpleForm`/`SimpleField`**(value/onChange 없음) + valibot 스키마 + `onSubmit` 주입
- `TagList`: **TanStack Query** `queryOptions`를 props로 주입. 컴포넌트는 API 클라이언트를 알지 못한다.
- 라우트 파일(**TanStack Router**)은 실제 `hc` 클라이언트를 연결하고 합성만 한다.
- 다이얼로그 세션 같은 스코프가 있는 상태는 **bunja**로, 앱 전역의 작은 UI 상태는 **jotai**로 다룬다. 실제로 경계가 어디서 갈리는지 확인한다.
- **Storybook story**(fake 주입)와 **`@siheom/react`** component test. story를 그대로 테스트로 쓸지, 따로 쓸지 정한다.
- **Ark UI + Panda** recipe, 다크모드 토글

결과로 Admin의 디렉터리 구조, 컴포넌트와 라우트 계약, fake를 두는 위치, 테스트 작성 규칙을 정한다(구현 티켓에 그대로 참조할 수 있는 형태).

## Answer

별도 prototype 대신 실제 기능으로 만든다: [22 Tag 수직 슬라이스](22-implementation-tag-slice.md). 컨벤션은 그 티켓의 코드가 기준이 된다.
