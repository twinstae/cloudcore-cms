import { createApiClient } from "@cloudcore/api/client";

// Admin은 API와 같은 origin에서 서빙된다(dev는 Vite proxy).
export const api = createApiClient(window.location.origin);
