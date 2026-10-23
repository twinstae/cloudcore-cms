import { env, exports } from "cloudflare:workers";
import { createCredentialUser } from "../src/auth/store";
import { createDb } from "../src/db";
import type { AppBindings } from "../src/types";

export const BASE_URL = "https://admin.example.test";
export const PASSWORD = "password-1234";

export const rawRequest = (path: string, init?: RequestInit) =>
  exports.default.fetch(new Request(`${BASE_URL}${path}`, init));

const cookiesOf = (res: Response): string => {
  const list =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie") ?? ""];
  return list
    .map((cookie) => cookie.split(";")[0])
    .filter(Boolean)
    .join("; ");
};

export const signIn = async (email: string, password = PASSWORD): Promise<string> => {
  const res = await rawRequest("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`로그인 실패 ${res.status}: ${await res.text()}`);
  return cookiesOf(res);
};

/** 공개 가입이 없으므로 테스트 계정도 저장소에 직접 만든다. */
export const createUser = (input: {
  email: string;
  role: "owner" | "author";
  name?: string;
  password?: string;
}) =>
  createCredentialUser(createDb(env.DB as AppBindings["DB"]), {
    name: input.name ?? input.email,
    email: input.email,
    password: input.password ?? PASSWORD,
    role: input.role,
  });

export const signInAsNewUser = async (input: {
  email: string;
  role: "owner" | "author";
  name?: string;
  password?: string;
}): Promise<string> => {
  await createUser(input);
  return signIn(input.email, input.password ?? PASSWORD);
};
