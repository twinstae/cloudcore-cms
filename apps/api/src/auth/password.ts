// 무료 플랜 CPU 10ms 안에 들어가도록 WebCrypto PBKDF2를 쓴다(ADR-0005, 16).
// 반복 횟수는 첫 배포 뒤 Observability CPU time으로 맞춘다.
const ITERATIONS = 50_000;
const KEY_BITS = 256;
const SALT_BYTES = 16;
const SCHEME = "pbkdf2-sha256";

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const derive = async (password: string, salt: Uint8Array, iterations: number) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return `${SCHEME}$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
};

export const verifyPassword = async ({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> => {
  const [scheme, iterations, salt, expected] = hash.split("$");
  if (scheme !== SCHEME || !iterations || !salt || !expected) return false;

  const expectedBytes = fromBase64(expected);
  const actual = await derive(password, fromBase64(salt), Number(iterations));

  // 길이가 같을 때만 비교하고, 시간 차이로 정보가 새지 않도록 끝까지 XOR한다.
  if (actual.length !== expectedBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i += 1) diff |= actual[i]! ^ expectedBytes[i]!;
  return diff === 0;
};
