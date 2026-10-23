# 회고: Tag 슬라이스 마무리 세션 (2026-10-23)

## 한 일

- 티켓 22 남은 항목: Storybook 도입(story 5개), Ark UI Dialog 생성/수정, jotai 다크 모드 토글.
- 화면을 props 기반 `TagsScreen`으로 추출해 다이얼로그 흐름을 siheom 테스트 5개로 검증.
- `.claude/skills/siheom-frontend-test`(SKILL.md, API.md)를 저장소에 두고 AGENTS.md·conventions.md에서 가리킨다.
- 커밋은 "개선 → 남은 작업" 교대로 3개(c932cd9, 53821f0, 25dc264).

## 낭비와 원인

1. **UI 확인을 브라우저 조작·스크린샷으로 했다.** 사용자가 처음부터 세운 "테스트로 검증한다" 원칙을 어겼고, 폼 제출·리로드 확인은 이미 `TagsScreen` 테스트로 가능한 일이었다. 도구 호출 20여 회를 브라우저에 썼다.
2. **`apps/admin/styled-system/styles.css`를 측정했다.** 이 파일은 손으로 돌린 `panda cssgen` 산출물이고, 앱 CSS는 `postcss.config.cjs`의 Panda 플러그인이 만든다. 낡은 파일을 근거로 "recipe가 CSS를 만들지 않는다"는 잘못된 결론을 내고, 그 결론을 conventions.md와 커밋 메시지에 단정으로 적었다.
3. **원인을 확정하기 전에 규칙으로 승격했다.** 이름 충돌 가설을 검증하지 않은 채 "프리셋 패턴과 같은 이름의 recipe는 조용히 무시된다"고 문서화했다. 이후 새 recipe가 정상적으로 CSS를 만드는 것을 확인하고 바로잡았다.
4. **캐시를 의심하지 않았다.** `node_modules/.vite`와 생성물이 낡아 같은 측정을 반복했다. 최종 확인은 `panda codegen` → `rm -rf node_modules/.vite dist` → `vite build` → dist CSS grep 순서로 했다.

## 개선안 (심각도 순)

1. **(자동 검사) recipe → CSS 회귀 검사.** `src/components/ui`가 `styled(el, recipe)`로 참조하는 recipe의 클래스가 빌드 CSS에 있는지 확인하는 `scripts/check-recipe-css.ts`를 `bun run check`에 넣는다. 이번 세션의 실제 실패(스타일이 통째로 빠짐)를 잡는 유일한 자동 검사다. 빌드 산출물이 필요하므로 `build` 이후 단계로 둔다.
2. **(규칙, 완료) UI 검증은 siheom 테스트로.** conventions.md와 스킬에 넣었다. 브라우저 조작·스크린샷은 사용자가 요청할 때만.
3. **(규칙, 완료) 생성물·캐시를 근거로 삼지 않는다.** `styles.css` 측정 금지와 codegen → 캐시 삭제 → 빌드 순서를 conventions.md에 적었다.
4. **(검토 규칙) 미확정 원인을 문서에 단정하지 않는다.** 커밋 메시지와 컨벤션에는 측정으로 확인한 사실만 적는다. 가설은 이슈나 회고에 남긴다.
5. **(정보 접근) Panda CSS 판독 절차를 스킬에 추가.** SKILL.md에 "스타일이 안 먹을 때" 절차(codegen, vite 캐시 삭제, dist CSS grep)를 넣어 같은 시행착오를 막는다.
6. **(소음) act() 경고.** TagForm·ThemeToggle 테스트가 React act 경고를 쏟아내 실패/성공 판독을 방해한다. RHF의 비동기 검증 업데이트가 원인으로 보이며, 해결책은 후속 조사.

## 다음

- 티켓 23: 인증을 라우트에 걸고 첫 보호된 화면을 만든다.
- 위 1번(recipe → CSS 검사)과 5번(스킬 절차)을 다음 개선 커밋으로.
