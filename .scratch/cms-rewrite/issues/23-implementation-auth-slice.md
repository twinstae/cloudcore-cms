# 인증 슬라이스: Owner 최초 설정, 로그인, 보호된 API

Label: wayfinder:implementation
Type: implementation
Status: open
Blocked by: 22

## 작업

- Better Auth + Drizzle(D1) adapter, 요청마다 `env`로 인스턴스 생성(01).
- 비밀번호 해시는 WebCrypto PBKDF2-SHA256으로 `emailAndPassword.password.{hash,verify}`를 바꿔 끼운다. 반복 횟수는 처음엔 보수적으로(예: 50k) 두고 **첫 배포 후 Observability CPU time으로 맞춘다**(ADR-0005, 16을 흡수).
- Owner가 없을 때만 열리는 최초 설정 화면/엔드포인트. 공개 가입 없음.
- Admin 로그인 화면(`better-auth/client`), 로그인 안 하면 `/login`으로.
- 22의 Tag 쓰기 API에 권한 적용(생성은 로그인 사용자, 수정/삭제는 Owner).
- 로그인 rate limit은 이 슬라이스에서 최소 구현(D1 또는 Workers Rate Limiting binding 중 되는 것).

passkey, Invitation, 비밀번호 재설정은 다음 슬라이스로 나눈다.

## 완료 조건

- API 테스트: 최초 설정은 한 번만, 로그인/로그아웃, 비로그인 Tag 생성 401, Author의 Tag 삭제 403
- 배포된 Worker에서 로그인 요청 CPU time 기록(티켓에 숫자를 남긴다)

## Progress

- 완료(002be37): Better Auth + Drizzle(D1) adapter, PBKDF2 50k 해시, 공개 가입 차단,
  `/api/setup`(Owner가 없을 때만), 세션 미들웨어, Tag 생성 401·수정/삭제 403,
  Admin `/login`·`/setup` 화면과 루트 세션 가드, 로그인 rate limit(60초 5회, cf-connecting-ip).
- 검증: API 19개(설정·로그인/로그아웃·세션 role·권한·해시), Admin 20개 테스트. `bun run check` 통과.
- 로컬에서 PBKDF2 50k는 해시 1회 약 10ms 수준(테스트 3회 31ms)이라 무료 플랜 CPU 10ms와
  아슬아슬하다. 배포 후 Observability CPU time을 보고 반복 횟수를 낮춘다(예: 25k).
- 남음: 배포 후 CPU time 기록(HITL, Cloudflare 계정 필요). passkey·Invitation·비밀번호
  재설정은 다음 슬라이스.
