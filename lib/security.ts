import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ENCRYPTION_PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const source = process.env.TOKEN_ENCRYPTION_KEY;
  if (!source) {
    return null;
  }

  return createHash("sha256").update(source).digest();
}

export function encryptToken(plainText: string): string {
  const key = getKey();

  if (!key) {
    return `plain:${Buffer.from(plainText, "utf8").toString("base64")}`;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptToken(stored: string): string {
  if (stored.startsWith("plain:")) {
    return Buffer.from(stored.slice("plain:".length), "base64").toString("utf8");
  }

  if (!stored.startsWith(ENCRYPTION_PREFIX)) {
    throw new Error("Unsupported token encryption format.");
  }

  const key = getKey();
  if (!key) {
    throw new Error("TOKEN_ENCRYPTION_KEY is required to decrypt tokens.");
  }

  const payload = stored.slice(ENCRYPTION_PREFIX.length);
  const [ivBase64, tagBase64, dataBase64] = payload.split(".");
  if (!ivBase64 || !tagBase64 || !dataBase64) {
    throw new Error("Malformed encrypted token payload.");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivBase64, "base64"));
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataBase64, "base64")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}
