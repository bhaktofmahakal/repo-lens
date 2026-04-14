import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const IV_BYTES = 12;

type TokenParts = {
  iv: Buffer;
  authTag: Buffer;
  ciphertext: Buffer;
};

function getEncryptionKey(): Buffer {
  const secret = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("Missing GITHUB_TOKEN_ENCRYPTION_KEY");
  }

  return createHash("sha256").update(secret).digest();
}

function parsePayload(payload: string): TokenParts {
  const [ivB64, tagB64, cipherB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !cipherB64) {
    throw new Error("Invalid encrypted token payload.");
  }

  return {
    iv: Buffer.from(ivB64, "base64"),
    authTag: Buffer.from(tagB64, "base64"),
    ciphertext: Buffer.from(cipherB64, "base64"),
  };
}

export function encryptGithubToken(token: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptGithubToken(payload: string): string {
  const key = getEncryptionKey();
  const { iv, authTag, ciphertext } = parsePayload(payload);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}
