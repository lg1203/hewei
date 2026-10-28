import { clsx, type ClassValue } from "clsx";
import dayjs from "dayjs";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(cents: number, withSymbol = true) {
  const value = (cents / 100).toFixed(2);
  return withSymbol ? `¥${value}` : value;
}

export function formatMoneyShort(cents: number) {
  const value = cents / 100;
  return Number.isInteger(value) ? `¥${value}` : `¥${value.toFixed(2)}`;
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  return dayjs(value).format("MM-DD HH:mm");
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  return dayjs(value).format("YYYY-MM-DD");
}

export function todayKey() {
  return dayjs().format("YYYY-MM-DD");
}

export function startOfToday() {
  return dayjs().startOf("day").toDate();
}

export function endOfToday() {
  return dayjs().endOf("day").toDate();
}

export function generateOrderNo() {
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `D${dayjs().format("YYMMDDHHmmss")}${rand}`;
}

export function maskPhone(phone?: string | null) {
  if (!phone) return "-";
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
}

export function parseYuanToCents(value: string | number) {
  const num = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

export function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "操作失败，请稍后重试";
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
