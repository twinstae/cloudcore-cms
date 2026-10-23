# Site는 정적으로 빌드하고, 발행할 때 다시 빌드한다

Site(Astro)는 요청마다 SSR하지 않고 정적으로 빌드해 Workers Static Assets로 서빙한다. Content가 발행·수정·발행 취소되거나 예약 발행 시각이 되면 API가 Site 재빌드를 트리거한다. 빌드할 때는 인터넷에 공개된 읽기 API(발행된 Content만)를 호출한다. 방문자 트래픽이 Worker 요청 한도와 CPU 한도를 쓰지 않게 하고, 캐시 설계(Workers Cache, SWR, purge)를 통째로 없애기 위해서다. 대신 발행이 Site에 반영되기까지 빌드 시간(수 분)만큼 늦어지고, 글이 아주 많아지면 빌드 시간이 길어진다.

## Considered Options

- SSR + Workers Cache(짧은 TTL + SWR): 반영이 빠르지만, 캐시 hit와 정적 자산 요청까지 요청 한도에 집계되고 SSR CPU가 무료 플랜 한도를 위협한다.
