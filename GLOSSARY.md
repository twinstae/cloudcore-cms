# Glossary

Cloudcore는 소수의 작성자가 쓰는 Ghost 스타일의 self-hosted 출판 도구다.

## Content

- **Post**: 날짜가 있는 글. 피드, 목록, 태그 페이지에 나타나며 **Tag**를 가질 수 있다.
- **Page**: 날짜와 무관한 단독 문서(예: About). 피드나 목록에 나타나지 않는다.
- **Content**: **Post**와 **Page**를 함께 가리킬 때 쓰는 말.
- **Body**: **Content**의 본문. 하나의 연속된 문서로, WYSIWYG 에디터에서 작성한다.
  _Avoid_: blocks, block array
- **Card**: **Body** 안에 끼워 넣는 구조화된 요소(이미지, 코드, 임베드, 콜아웃, 구분선, HTML, CTA 버튼). 일반 문단과 달리 자체 옵션을 가진다.
  _Avoid_: block
- **Table**: **Body** 안의 행과 열 구조. Card가 아니라 Body의 일부다.
- **Footnote**: **Body** 안의 각주. 본문의 번호와 글 끝의 설명이 한 쌍이다.
- **Status**: **Content**의 발행 상태. `draft`(초안), `scheduled`(예약 발행 시각이 정해짐), `published`(공개됨) 중 하나다.
  _Avoid_: pending review
- **Tag**: **Post**를 분류하는 평평한 라벨. 카테고리는 따로 두지 않고 **Tag**로 통합한다.
  _Avoid_: category
- **Revision**: 특정 시점의 **Content** 스냅샷. 서버 저장과 발행 때 생긴다. 이전 상태로 복원할 수 있다. 자동 저장 자체는 **Revision**이 아니다.
- **Trash**: 삭제한 **Content**가 영구 삭제 전까지 머무는 곳. **Status**와 별개이며 복원할 수 있다. 영구 삭제하면 그 **Content**의 **Revision**과 **Media**도 함께 지운다.
- **Media**: 업로드된 파일(주로 이미지). **Card**와 대표 이미지에서 참조한다.
- **Site Settings**: 사이트 전체에 적용되는 설정(제목, 설명, 로고, 아이콘, 대표 색상, 기본 OG 이미지, 내비게이션 메뉴, 소셜 링크, timezone).

## Apps

- **Admin**: 작성자가 **Content**를 쓰고 관리하는 화면.
- **Site**: 독자가 보는 공개 웹사이트.
- **API**: **Admin**과 **Site**가 사용하는 서버.
- **Site Build**: 발행된 **Content**로 **Site**를 정적으로 다시 만드는 일. 발행, 수정, 발행 취소는 다음 **Site Build**가 끝난 뒤에야 독자에게 보인다.
  _Avoid_: deploy, cache purge

## People

- **Owner**: 사이트 소유자. 단 한 명이며 모든 권한을 갖고 **Author**를 초대한다.
- **Author**: **Owner**가 초대한 작성자. 자신의 **Post**를 쓰고 발행한다.
  _Avoid_: editor, contributor
- **Invitation**: **Owner**가 발급해 직접 전달하는 가입 링크. 초대 없이는 가입할 수 없다.
