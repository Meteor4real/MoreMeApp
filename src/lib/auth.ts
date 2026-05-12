import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { pool, query, SCHEMA_SQL } from "@/lib/db";

export const SESSION_COOKIE = "chuckhub_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

export type Account = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

type AccountRow = Account & { password_hash: string | null };

function secret(): Uint8Array {
  const s = process.env.CHUCKHUB_SECRET || process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "CHUCKHUB_SECRET (or AUTH_SECRET) must be set to a string of at least 16 chars."
    );
  }
  return new TextEncoder().encode(s);
}

let schemaReady: Promise<void> | null = null;
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(SCHEMA_SQL).then(() => undefined);
  }
  return schemaReady;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createAccount(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<Account> {
  await ensureSchema();
  const email = input.email.trim().toLowerCase();
  const password_hash = await hashPassword(input.password);
  const display = input.displayName?.trim() || email.split("@")[0];
  const rows = await query<AccountRow>(
    `insert into chuckhub_accounts (email, password_hash, display_name)
     values ($1, $2, $3)
     returning id, email, display_name, avatar_url, password_hash, created_at`,
    [email, password_hash, display]
  );
  const row = rows[0]!;
  return stripHash(row);
}

export async function findAccountByEmail(email: string): Promise<AccountRow | null> {
  await ensureSchema();
  const rows = await query<AccountRow>(
    `select id, email, display_name, avatar_url, password_hash, created_at
     from chuckhub_accounts where email = $1 limit 1`,
    [email.trim().toLowerCase()]
  );
  return rows[0] ?? null;
}

export async function findAccountById(id: string): Promise<Account | null> {
  await ensureSchema();
  const rows = await query<AccountRow>(
    `select id, email, display_name, avatar_url, password_hash, created_at
     from chuckhub_accounts where id = $1 limit 1`,
    [id]
  );
  return rows[0] ? stripHash(rows[0]) : null;
}

function stripHash(row: AccountRow): Account {
  const { password_hash: _ignored, ...rest } = row;
  void _ignored;
  return rest;
}

export async function signSessionToken(accountId: string): Promise<string> {
  return new SignJWT({ sub: accountId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(accountId: string): Promise<void> {
  const token = await signSessionToken(accountId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentAccount(): Promise<Account | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const id = await verifySessionToken(token);
  if (!id) return null;
  return findAccountById(id);
}

export async function requireAccount(): Promise<Account> {
  const account = await getCurrentAccount();
  if (!account) throw new AuthError("unauthorized");
  return account;
}

export class AuthError extends Error {}
