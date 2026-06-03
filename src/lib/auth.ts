import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { ensureDatabaseReady } from "./runtime-db";

const SESSION_COOKIE = "internpilot_session";
const SESSION_DAYS = 30;
const REMEMBERED_SESSION_DAYS = 90;
const SIGNED_SESSION_VERSION = 1;

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
};

type SignedSessionPayload = {
  v: typeof SIGNED_SESSION_VERSION;
  id: string;
  email: string;
  displayName: string | null;
  exp: number;
  iat: number;
};

export async function signUp(input: { email: string; password: string; displayName?: string }) {
  await ensureDatabaseReady();
  const email = normalizeEmail(input.email);
  const existing = await prisma.userAccount.findUnique({ where: { email } });
  if (existing) throw new Error("An account already exists for this email.");

  const { hash, salt } = await hashPassword(input.password);
  const user = await prisma.userAccount.create({
    data: {
      email,
      displayName: input.displayName || null,
      passwordHash: hash,
      passwordSalt: salt,
    },
  });
  await createSession(user, REMEMBERED_SESSION_DAYS);
  return user;
}

export async function signIn(input: { email: string; password: string; remember?: boolean }) {
  await ensureDatabaseReady();
  const email = normalizeEmail(input.email);
  const user = await prisma.userAccount.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid email or password.");

  const valid = await verifyPassword(input.password, user.passwordSalt, user.passwordHash);
  if (!valid) throw new Error("Invalid email or password.");

  await createSession(user, input.remember ? REMEMBERED_SESSION_DAYS : SESSION_DAYS);
  return user;
}

export async function signOut() {
  await ensureDatabaseReady();
  const token = await readSessionToken();
  if (token) {
    await prisma.userSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<AuthUser | null> {
  await ensureDatabaseReady();
  const token = await readSessionToken();
  if (!token) return null;

  const signedSession = verifySignedSessionToken(token);
  if (signedSession) {
    if (signedSession.exp < Date.now()) {
      const cookieStore = await cookies();
      cookieStore.delete(SESSION_COOKIE);
      return null;
    }

    const restoredUser = await ensureUserFromSignedSession(signedSession);
    return {
      id: restoredUser.id,
      email: restoredUser.email,
      displayName: restoredUser.displayName,
    };
  }

  const session = await prisma.userSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { userAccount: true },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.userSession.delete({ where: { id: session.id } });
    return null;
  }

  return {
    id: session.userAccount.id,
    email: session.userAccount.email,
    displayName: session.userAccount.displayName,
  };
}

export async function requireUser(nextPath = "/"): Promise<AuthUser> {
  const user = await currentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  return user;
}

async function createSession(user: { id: string; email: string; displayName: string | null }, sessionDays = SESSION_DAYS) {
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
  const token = createSignedSessionToken({
    v: SIGNED_SESSION_VERSION,
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    exp: expiresAt.getTime(),
    iat: Date.now(),
  });
  await prisma.userSession.create({
    data: {
      userAccountId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

async function readSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function ensureUserFromSignedSession(session: SignedSessionPayload) {
  const email = normalizeEmail(session.email);
  const byId = await prisma.userAccount.findUnique({ where: { id: session.id } });
  if (byId) return byId;

  return prisma.userAccount.upsert({
    where: { email },
    update: session.displayName ? { displayName: session.displayName } : {},
    create: {
      id: session.id,
      email,
      displayName: session.displayName,
      passwordHash: "restored-from-signed-session",
      passwordSalt: "restored-from-signed-session",
    },
  });
}

function createSignedSessionToken(payload: SignedSessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signSessionBody(body);
  return `${body}.${signature}`;
}

function verifySignedSessionToken(token: string): SignedSessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expectedSignature = signSessionBody(body);
  if (!safeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SignedSessionPayload;
    if (payload.v !== SIGNED_SESSION_VERSION || !payload.id || !payload.email || typeof payload.exp !== "number") return null;
    return payload;
  } catch {
    return null;
  }
}

function signSessionBody(body: string) {
  return crypto.createHmac("sha256", sessionSecret()).update(body).digest("base64url");
}

function sessionSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "momentum-local-session-secret-change-me";
}

function safeEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  if (firstBuffer.byteLength !== secondBuffer.byteLength) return false;
  return crypto.timingSafeEqual(firstBuffer, secondBuffer);
}

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = await scrypt(password, salt);
  return { hash, salt };
}

async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actualHash = await scrypt(password, salt);
  return crypto.timingSafeEqual(Buffer.from(actualHash, "hex"), Buffer.from(expectedHash, "hex"));
}

function scrypt(password: string, salt: string) {
  return new Promise<string>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey.toString("hex"));
    });
  });
}
