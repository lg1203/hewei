import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/utils";

export function ok<T>(data: T) {
  return NextResponse.json(data);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function serverError(error: unknown) {
  console.error(error);
  return fail(getErrorMessage(error) || "服务器错误", 500);
}

export async function readBody<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export function intParam(value: string | null, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.floor(num) : fallback;
}
