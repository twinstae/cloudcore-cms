import { createAuthClient } from "better-auth/react";

// Admin과 API는 같은 origin이다(dev는 Vite proxy). Better Auth 클라이언트가 쿠키를 다룬다.
export const authClient = createAuthClient({ baseURL: window.location.origin });
