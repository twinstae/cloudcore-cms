# 에디터 셸: + 메뉴, 툴바, 링크, 한글 IME 회귀 테스트

Label: wayfinder:implementation
Type: implementation
Status: open
Blocked by: 18, 09

## 작업

Tiptap은 headless이므로 Ghost 같은 쓰기 경험을 직접 만든다.

- **+ 메뉴 / 슬래시 메뉴**: 문단, 제목, 목록, 인용, 코드, 구분선, Card 7종 삽입. 빈 문단에서 `/`로 열린다.
- **툴바**: 굵게/기울임/링크/제목/목록. 링크는 붙여넣기와 입력 규칙도 처리한다.
- **상태 경계**: 에디터 세션과 자동 저장 큐는 bunja로(09의 패턴), 폼 상태는 `useState`로 들지 않는다. `SimpleForm`/RHF는 메타데이터 패널(제목, slug, excerpt, SEO)에 쓴다.
- **테스트**:
  - `@siheom/react`로 삽입/서식 상호작용
  - `@siheom/ime-cdp`로 한글 조합: 빈 문단 맨 앞, 문장 중간(caret 앞 텍스트를 읽는 래퍼 필요), 조합 중 Enter(**Tiptap #4108** 회귀)
  - Storybook story
- 완료 기준: 한국어로 글을 쓰고 카드를 넣고 저장하는 흐름이 키보드만으로 되고, IME 회귀 테스트가 pre-push에서 돈다.
