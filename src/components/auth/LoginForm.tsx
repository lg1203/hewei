"use client";

import { Eye, EyeOff, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { postJson } from "@/lib/api";

type Role = "ADMIN" | "MERCHANT" | "USER";

export function LoginForm({
  role,
  title,
  subtitle,
  accountLabel,
  accountPlaceholder,
  demoAccount,
  demoPassword,
  redirectTo,
  footer
}: {
  role: Role;
  title: string;
  subtitle: string;
  accountLabel: string;
  accountPlaceholder: string;
  demoAccount: string;
  demoPassword: string;
  redirectTo: string;
  footer?: React.ReactNode;
}) {
  const router = useRouter();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await postJson("/api/auth/login", { role, account, password });
      toast.success("登录成功");
      router.replace(redirectTo);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setAccount(demoAccount);
    setPassword(demoPassword);
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-brand-600">欢迎回来</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-500">{subtitle}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label>{accountLabel}</Label>
          <Input
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder={accountPlaceholder}
            autoComplete="username"
            required
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label>密码</Label>
            <button
              type="button"
              onClick={fillDemo}
              className="mb-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              填入演示账号
            </button>
          </div>
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
              className="pr-11"
              required
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              aria-label={show ? "隐藏密码" : "显示密码"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          <LogIn className="h-4 w-4" />
          登录
        </Button>
      </form>

      <div className="mt-4 rounded-xl bg-ink-50 px-4 py-3 text-xs leading-6 text-ink-500">
        演示账号：<span className="font-medium text-ink-700">{demoAccount}</span>
        <span className="mx-2 text-ink-300">/</span>
        密码：<span className="font-medium text-ink-700">{demoPassword}</span>
      </div>

      {footer ? <div className="mt-8 text-center text-sm text-ink-500">{footer}</div> : null}

      <div className="mt-8 flex items-center justify-center gap-4 text-xs text-ink-400">
        <Link href="/admin/login" className="hover:text-brand-600">
          管理员端
        </Link>
        <span className="text-ink-200">|</span>
        <Link href="/merchant/login" className="hover:text-brand-600">
          商户端
        </Link>
        <span className="text-ink-200">|</span>
        <Link href="/m" className="hover:text-brand-600">
          用户端
        </Link>
      </div>
    </div>
  );
}
