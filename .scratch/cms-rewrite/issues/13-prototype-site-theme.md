# Site 테마는 어떻게 보이는가

Label: wayfinder:prototype
Type: prototype
Status: open
Blocked by: 04

## Question

Casper 같은 단일 테마를 Astro(정적 빌드, ADR-0004) + Panda로 거칠게 만들어 보고 결정한다.
- 레이아웃: 홈(Post 목록, featured), Post, Page, Tag 목록, 404
- **다크모드**(시스템 설정 + 토글)와 공유 preset의 semantic token
- Card 7종이 Site에서 보이는 모양(`html` 출력에 적용할 스타일 범위)
- 반응형 이미지(데스크톱/모바일 2개 크기의 `srcset`과 `sizes`)
- 내비게이션 메뉴, 소셜 링크, 로고/아이콘, OG 메타, RSS, sitemap. 정적 배포 구성(`assets`만, `force-trailing-slash`, `404-page`, `/rss/`의 `_redirects` 200 rewrite가 실제로 동작하는지)은 17 조사 결과를 따르고 여기서 확인한다
- 어디까지 Astro 컴포넌트로 만들고, React island가 필요한 곳이 있는지(다크모드 토글 정도). 다크모드는 `<script is:inline>`과 `data-theme`으로 처리한다(04 조사 결과).
