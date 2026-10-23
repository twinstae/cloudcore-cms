# API 표면과 권한 적용은 어떻게 할 것인가

Label: wayfinder:grilling
Type: grilling
Status: open
Blocked by: 06, 11, 16, 17

## Question

- Admin API와 공개 읽기 API를 어떻게 나눌지. 공개 읽기 API는 Site Build가 인터넷으로 호출한다(ADR-0004). 빌드 전용 토큰으로 보호할지 완전히 공개할지 정한다.
- Site Build: Deploy Hook 호출 시점(어떤 변경이 빌드를 트리거하는지), 빌드 성공 콜백(`$WORKERS_CI_BUILD_UUID` + 빌드 secret 토큰) 수신 엔드포인트, Admin에 빌드 상태와 실패를 보여주는 방식(17 조사 결과). 실측이 필요한 것: 동시 빌드 한도에 걸린 빌드가 대기하는지 거부되는지
- 비밀번호 해시 설정(16 측정 결과), 로그인 rate limit(Better Auth 내장 memory storage는 Workers에서 효과가 없음)
- 엔드포인트 목록: Content CRUD, 자동 저장, 발행/예약/발행 취소, Revision 목록과 복원, Tag, Media 업로드(변환 파이프라인), Site Settings, Invitation과 재설정 링크 발급, 최초 Owner 설정
- Owner/Author 권한을 어디서 어떻게 적용할지(미들웨어, 서비스 레이어)
- 에러 형식(valibot parse 에러를 응답으로 바꾸는 방법), 페이지네이션 규칙
- hono-openapi 문서와 Scalar의 노출 범위(운영 환경에서 공개할지)
- legacy에서 가져올 보안 헤더와 rate limit
