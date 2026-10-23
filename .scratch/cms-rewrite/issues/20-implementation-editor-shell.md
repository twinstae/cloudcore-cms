# 에디터 셸: + 메뉴, 툴바, 링크, 한글 IME 회귀 테스트

Label: wayfinder:implementation
Type: implementation
Status: open
Blocked by: 18, 09

> 08 재검토 중. 에디터가 다시 정해지면 이 티켓을 그 결정에 맞게 다시 쓴다.

## 작업

Tiptap은 headless이므로 Ghost 같은 쓰기 경험을 직접 만든다.

- **+ 메뉴 / 슬래시 메뉴**: 문단, 제목, 목록, 인용, 코드, 구분선, Card 7종 삽입. 빈 문단에서 `/`로 열린다.
- **툴바**: 굵게/기울임/링크/제목/목록. 링크는 붙여넣기와 입력 규칙도 처리한다.
- **붙여넣기**: 워드·Notion·Google Docs의 HTML과 Markdown 원문을 받아 지원 요소(제목, 굵게, 링크, 목록, 인용, 코드, 표, 각주, 이미지)만 남기고 나머지 서식을 버린다. 문서의 H1은 H2로 낮춘다. 이미지는 대기 상태로 두고 저장·발행 시 업로드하며, 서식을 정리했다는 사실을 한 번 알린다(02 PRD UC-E01).
- **상태 경계**: 에디터 세션과 로컬 초안 큐는 bunja로(09의 패턴), 폼 상태는 `useState`로 들지 않는다. `SimpleForm`/RHF는 메타데이터 패널(제목, slug, excerpt, SEO)에 쓴다.
- **로컬 초안**: 자동 저장은 60초마다 IndexedDB에만 쓰고 서버로 보내지 않는다. 붙여넣은 이미지도 초안에 함께 보관한다. 서버 저장은 저장 버튼·발행으로만 일어나고, 그때만 Revision이 생긴다(02 PRD UC-E07).
- **테스트**:
  - `@siheom/react`로 삽입/서식 상호작용
  - `@siheom/ime-cdp`로 한글 조합: 빈 문단 맨 앞, 문장 중간(caret 앞 텍스트를 읽는 래퍼 필요), 조합 중 Enter(**Tiptap #4108** 회귀)
  - Storybook story
- 완료 기준: Docs HTML과 Markdown을 붙여넣어 표·각주·이미지가 남고, 발행 시 이미지가 업로드되는 흐름이 된다. 한국어로 글을 쓰고 카드를 넣고 저장하는 흐름이 키보드만으로 되고, IME 회귀 테스트가 pre-push에서 돈다.
