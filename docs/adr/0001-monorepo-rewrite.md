# 모노레포로 다시 작성하고 기존 코드는 끝날 때까지 `legacy/`에 둔다

기존 단일 패키지(Hono API + Vite admin)를 점진적으로 고치지 않고, bun workspace 모노레포(`apps/api`, `apps/admin`, `apps/site`, `packages/*`)로 새로 작성한다. 블록 모델, 인증 체계, 스타일링, 툴링이 거의 모두 바뀌어서 점진적 이전의 이점이 없고, 운영 데이터도 없어 마이그레이션이 필요 없다. 기존 코드는 참고용으로 `legacy/`에 옮겨 workspace, 린트, 타입체크 대상에서 제외하고, 모든 작업이 끝난 뒤 삭제한다.
