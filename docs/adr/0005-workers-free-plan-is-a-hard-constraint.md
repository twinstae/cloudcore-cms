# Cloudflare Workers 무료 플랜을 반드시 지킨다

모든 Worker는 Workers Free 플랜(요청당 CPU 10ms, 하루 요청 10만 건)에서 동작해야 한다. 유료 플랜으로 문제를 푸는 것은 선택지가 아니다. 이 제약 때문에 Better Auth의 기본 scrypt 비밀번호 해시(약 70ms)를 그대로 쓸 수 없다. 해시 함수와 강도는 측정해서 한도 안에 맞춘다. 같은 이유로 무거운 작업(Site 렌더링, 이미지 변환)은 요청 경로 밖(빌드 시점, Images binding)으로 보낸다.
