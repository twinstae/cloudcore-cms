# 에디터 후보(Koenig, Lexical, Tiptap)와 @siheom/ime는 무엇을 지원하는가

Label: wayfinder:research
Type: research
Status: resolved
Blocked by:

## Question

에디터 prototype에 앞서 사실을 모은다.
- **Koenig**(`@tryghost/koenig-lexical`): Ghost 밖에서 독립적으로 쓸 수 있는지, 라이선스, React 19 호환성, 번들 방식(UMD/ESM), 기본 Card 목록, Card를 추가하거나 빼는 방법, 스타일(Tailwind 의존 여부와 Panda와의 충돌), 이미지 업로드 hook, 유지보수 상태
- **Ghost의 HTML 렌더러**(`@tryghost/kg-default-nodes`, `kg-lexical-html-renderer` 등)를 Workers 런타임에서 실행할 수 있는지(DOM 의존 여부, linkedom/happy-dom 필요 여부)
- **Lexical 직접 사용**: `@lexical/react`로 DecoratorNode Card를 만드는 방법, headless(`@lexical/headless`) HTML 렌더를 Workers에서 실행할 수 있는지
- **Tiptap**: 비교 기준선. 같은 항목 확인
- **`@siheom/ime`**(https://github.com/twinstae/siheom-ts): 무엇을 시뮬레이션하는지(composition 이벤트 순서 등), contenteditable 기반 에디터(Lexical, ProseMirror)에서 쓰는 방법, 알려진 한계. `@siheom/react` API 요약
- 각 후보의 한국어 IME 관련 알려진 버그

결과는 research 문서로 남기고 이 티켓에서 링크한다.

## Answer

- **Koenig**(`@tryghost/koenig-lexical` 1.13.0, MIT)는 Ghost 밖에서도 쓸 수 있다. 저장소는 archived이고 코드는 Ghost 모노레포 `koenig/`에 있다. **Lexical 0.13.1(2024-01)에 고정**되어 있고(현재 0.52), Lexical 전체가 번들 안에 들어 있다. **Ghost #29220(open): 빈 문단 맨 앞에서 한글 입력이 안 된다**(고정된 Lexical의 composition 처리가 원인으로 분석됨). React 18.3.1로 빌드됐고 React 19 마운트는 미검증이다. UI 문자열은 영어로 하드코딩되어 있다. 스타일은 Tailwind v3 산출물이 `.koenig-lexical`로 scope되어 있다.
- 우리 Card 7종이 Koenig에 모두 있다(image, codeblock, embed, callout, horizontalrule, html, call-to-action). 업로드 hook은 `fileUploader.useFileUpload(type)` 형태다.
- `kg-lexical-html-renderer`는 workerd에서 동작한다(검증). linkedom, `nodejs_compat`, jsdom alias가 필요하고 gzip 405 KiB다. 이때 노드 정의가 Lexical 0.13.1 API에 묶인다.
- **Lexical 0.52 직접 사용**: React 19를 쓸 수 있고 DecoratorNode로 Card를 만든다. 서버 렌더에는 linkedom global이 필요하다(검증, gzip 297 KiB).
- **Tiptap 3.32**: React 19 peer가 명시되어 있다. `@tiptap/static-renderer`는 DOM 없이 workerd에서 동작한다(검증, gzip 192 KiB). IME 버그 #4108(조합 중 Enter를 누르면 음절이 사라짐)이 열려 있다.
- ADR-0002는 세 후보 모두로 성립한다. Lexical 계열은 API Worker와 재렌더링 스크립트가 같은 DOM 구현(linkedom)을 써야 출력이 같다.
- **`@siheom/ime` 0.3.1은 기본(Chrome) 프로필에서 contenteditable 대상이면 composition 없이 `user-event.type`으로 폴백한다.** contenteditable player는 Firefox/Slate 프로필에만 있다. siheom-ts의 Lexical 예제는 Firefox 프로필과 UA shim을 쓴다. `@siheom/ime-cdp`는 지금 input/textarea용이라 contenteditable에 쓰려면 감싸는 코드가 필요하다.
- `@siheom/react` 0.4.0: `runSiheom`, `createReactSiheom({user})`, `given.render`, `actions`/`assertions`/`query`. IME는 `overrideSiheom(..., {actions: createImeActions({profile})})`로 붙인다.

Context: branch `research/editor-candidates`, file `research/05-editor-candidates.md`
