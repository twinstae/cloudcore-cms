# 팀 슬라이스: Invitation, 비밀번호 재설정, passkey

Label: wayfinder:implementation
Type: implementation
Status: open
Blocked by: 23

## 작업

Owner가 Author를 들이고, 잊어버린 비밀번호를 다시 세우고, passkey로 로그인하는 길을 끝까지 연다. 메일은 보내지 않고 링크를 복사해 직접 전달한다(map).

- D1 테이블 `cc_invitation`(id, email, role, token 해시, 만료, 사용 시각, 만든 사람).
- API: `POST /api/team/invitations`(Owner), `GET /api/team`(Owner), `GET /api/invitations/:token`(공개, 유효성만), `POST /api/invitations/:token/accept`(이름·비밀번호 설정 → Author 계정 생성과 세션), `DELETE /api/team/:id`(Owner, 자신은 불가).
  - 초대 링크는 한 번만 쓰이고 만료된다. 만료·사용된 토큰은 이유를 알려 준다.
  - 계정 생성은 Better Auth admin plugin의 `createUser`로 처리한다(01).
- 비밀번호 재설정: Owner가 사용자별 재설정 링크를 만들고, 링크에서 새 비밀번호를 정한다. Better Auth 내장 verification 토큰을 쓴다.
- passkey: Better Auth passkey plugin 등록/로그인. 비밀번호 로그인과 함께 쓸 수 있고, Owner는 passkey를 지울 수 있다.
- Admin: 팀 화면(멤버 목록, 초대 만들기와 링크 복사, 재설정 링크), 수락 화면, 로그인 화면의 passkey 버튼.
- 테스트: 초대→수락→Author로 로그인, 만료 토큰 거부, 두 번 사용 거부, 재설정 링크로 로그인, 비밀번호 로그인 CPU 시간 실측값 기록, Owner가 자기 계정을 지울 수 없음.

## 완료 조건

- PRD QC: UC-A04, UC-A05, UC-A06, UC-A07, UC-A08, UC-A09와 EC-A02, EC-A03, EC-A04, EC-A07이 통과한다.
- 초대받은 사람이 링크로 가입하고 Author 권한으로 자기 Post만 본다.
- passkey로 로그인한 뒤에도 기존 세션과 충돌하지 않는다.
- `bun run check` 통과.

## 열린 질문

- passkey를 1차 배포에 넣을지, 초대·재설정 뒤로 미룰지.
- 초대 만료 기간(예: 7일)과 같은 이메일 재초대 정책.

## 참고

- PRD: [04-members.md](../../../docs/prd/04-members.md)
- 조사: `.scratch/cms-rewrite/issues/01-research-better-auth-on-workers-d1.md`
