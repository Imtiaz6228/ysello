import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function issueVisitorSession(fingerprint: string, secret: string, now = Date.now()) {
  const payload = `${now}.${randomBytes(16).toString("hex")}`;
  const signature = createHmac("sha256", secret).update(`${payload}|${fingerprint}`).digest("hex");
  return `${payload}.${signature}`;
}

export function validVisitorSession(token: unknown, fingerprint: string, secret: string, now = Date.now(), minimumAgeMs = 30000) {
  if (typeof token !== "string" || !/^\d{13}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(token)) return false;
  const [issued, nonce, signature] = token.split(".");
  const age = now - Number(issued);
  if (age < minimumAgeMs || age > 2 * 60 * 60_000) return false;
  const expected = createHmac("sha256", secret).update(`${issued}.${nonce}|${fingerprint}`).digest();
  return timingSafeEqual(Buffer.from(signature, "hex"), expected);
}
