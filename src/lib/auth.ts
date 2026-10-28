import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

export type Role = "ADMIN" | "MERCHANT" | "USER";

export type SessionUser = {
  id: string;
  role: Role;
  name: string;
  phone?: string;
  shopId?: string;
  merchantId?: string;
};

const COOKIE_NAME = "hewei_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "hewei-dev-secret-change-me"
);

export async function signToken(user: SessionUser) {
  return new SignJWT({
    role: user.role,
    name: user.name,
    phone: user.phone,
    shopId: user.shopId,
    merchantId: user.merchantId
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token?: string | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || !payload.role) return null;
    return {
      id: payload.sub,
      role: payload.role as Role,
      name: (payload.name as string) || "",
      phone: payload.phone as string | undefined,
      shopId: payload.shopId as string | undefined,
      merchantId: payload.merchantId as string | undefined
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return verifyToken(store.get(COOKIE_NAME)?.value);
}

export async function getSessionFromRequest(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  return verifyToken(bearer || req.cookies.get(COOKIE_NAME)?.value);
}

export async function requireRole(req: NextRequest, roles: Role[]) {
  const session = await getSessionFromRequest(req);
  if (!session || !roles.includes(session.role)) return null;
  return session;
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}
