import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { loadCipherKey } from "@/lib/secret";

const ALGO = "aes-256-gcm";

export async function encryptSecret(
  plain: string
): Promise<{ ciphertext: string; iv: string }> {
  const key = await loadCipherKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([enc, tag]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

export async function decryptSecret(
  ciphertext: string,
  ivB64: string
): Promise<string> {
  const key = await loadCipherKey();
  const data = Buffer.from(ciphertext, "base64");
  const iv = Buffer.from(ivB64, "base64");
  const tag = data.subarray(data.length - 16);
  const enc = data.subarray(0, data.length - 16);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function maskSecret(plain: string): string {
  if (plain.length <= 8) return "•".repeat(plain.length);
  return `${plain.slice(0, 4)}${"•".repeat(Math.min(plain.length - 8, 16))}${plain.slice(-4)}`;
}
