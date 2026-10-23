# Body는 에디터 JSON을 원본으로 저장하고, 저장할 때 HTML과 plaintext를 함께 만든다

Body의 원본(source of truth)은 WYSIWYG 에디터의 네이티브 JSON이다. API가 저장할 때 같은 트랜잭션에서 `html`과 `plaintext`를 렌더링해 함께 저장하고, Site는 `html`을 그대로 출력한다(Ghost와 같은 방식). 이렇게 하면 Site가 에디터 라이브러리에 의존하지 않고 렌더링 비용도 없다. 대신 렌더러나 Card 마크업이 바뀌면 모든 Content를 다시 렌더링하는 스크립트가 필요하다.
