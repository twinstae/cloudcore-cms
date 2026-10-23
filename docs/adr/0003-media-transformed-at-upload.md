# 이미지는 업로드할 때 변환하고, 구입한 커스텀 도메인의 CDN으로 서빙한다

이미지는 업로드할 때 Cloudflare Images binding으로 webp로 변환하고 데스크톱/모바일 두 크기로 줄여 R2에 저장한다. 원본은 보관하지 않는다. 전달 시점 변환(`/cdn-cgi/image`)은 쓰지 않는다. 무료 변환 한도를 업로드 횟수에만 쓰기 위해서다. r2.dev는 rate limit이 걸리고 캐시되지 않는 개발용이므로 Cloudflare Registrar에서 도메인을 구입하고, R2 버킷을 그 zone의 커스텀 도메인으로 공개한다.
