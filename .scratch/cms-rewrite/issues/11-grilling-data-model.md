# 데이터 모델과 스키마는 어떻게 생겼는가

Label: wayfinder:grilling
Type: grilling
Status: open
Blocked by: 01, 08

## Question

- Drizzle 테이블: Content(type, Status, slug, `body` JSON, `html`, `plaintext`, excerpt, 대표 이미지, SEO 필드, featured, publishedAt, scheduledAt, authorId), Revision, Tag와 Post-Tag 관계(순서와 primary tag), Media(크기 변형 2개의 키, 너비/높이, alt, 업로더), Site Settings(단일 row인지 key-value인지), Invitation, 그리고 Better Auth 테이블과의 관계
- **slug 고유성**: Post와 Page가 같은 `/{slug}/` 경로를 공유하므로 두 타입을 통틀어 고유해야 하는지, 예약어(`tag`, `page`, `rss` 등)를 막을지
- **valibot 스키마**: 경계별로 입력, 출력, DB row 스키마를 나누는 방법, branded type 목록, Temporal로 parse하는 지점
- 인덱스와 D1 migration 전략
- Revision 스냅샷에 들어갈 필드
