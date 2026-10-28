export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include"
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.error || "请求失败", res.status);
  }
  return data as T;
}

export function postJson<T>(url: string, body?: unknown) {
  return apiFetch<T>(url, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

export function patchJson<T>(url: string, body?: unknown) {
  return apiFetch<T>(url, {
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

export function putJson<T>(url: string, body?: unknown) {
  return apiFetch<T>(url, {
    method: "PUT",
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

export function deleteJson<T>(url: string) {
  return apiFetch<T>(url, { method: "DELETE" });
}
