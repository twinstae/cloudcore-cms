# 무료 플랜 CPU 10ms 안에서 비밀번호 해시를 어떻게 맞출 것인가 (측정)

Label: wayfinder:task
Type: task
Status: open
Blocked by:

## Question

ADR-0005(무료 플랜 필수) 때문에 Better Auth 기본 scrypt(약 70ms)를 쓸 수 없다. 결정에 필요한 사실을 **실측**으로 만든다.
- workers.dev에 throwaway Worker를 배포한다(무료 플랜 계정). 다음 해시 후보별로 **실제 CPU 시간**을 잰다(Workers Observability의 CPU time 또는 `wrangler tail`).
  - WebCrypto `crypto.subtle` PBKDF2-SHA256: 반복 횟수 10k, 50k, 100k
  - `node:crypto` scrypt: 낮은 N 값
- 무료 플랜에서 10ms를 넘었을 때 실제로 어떻게 되는지 확인한다(즉시 에러 1102인지, 어느 정도 허용되는지).
- workerd의 PBKDF2 반복 횟수 상한 값을 확인한다.
- Better Auth `emailAndPassword.password.{hash,verify}`를 바꿔 끼우는 최소 코드를 확인한다.
- 위 결과로 "10ms 안에 들어오는 가장 강한 설정"과, 그것이 OWASP 권장치와 얼마나 차이 나는지를 정리한다. 보완책(passkey 우선 로그인, 로그인 rate limit)이 필요한지도 함께 적는다.

Cloudflare 계정 로그인(`wrangler login`)이 필요하다. 에이전트가 인증된 wrangler를 쓸 수 없으면 사람에게 정확한 체크리스트를 넘긴다. 측정용 Worker는 측정이 끝나면 삭제한다.

자세한 배경은 [Better Auth를 Workers + D1에서 쓸 수 있는가](01-research-better-auth-on-workers-d1.md)의 Answer를 본다.
