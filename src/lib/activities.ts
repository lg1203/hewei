export const ACTIVITY_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "展示中",
  DISABLED: "已停用"
};

export type ParsedActivityDate =
  | { ok: true; value: Date | null | undefined }
  | { ok: false; message: string };

export function parseOptionalDate(
  value: string | null | undefined
): ParsedActivityDate {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null || value === "") return { ok: true, value: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, message: "活动时间格式不正确" };
  }
  return { ok: true, value: date };
}

export function validateActivityUrl(value: string) {
  if (!value) return null;
  return /^(https?:\/\/|\/)/.test(value)
    ? null
    : "需以 http(s):// 或 / 开头";
}
