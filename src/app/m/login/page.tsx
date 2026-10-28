"use client";

import { ChevronLeft, ChefHat, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { postJson } from "@/lib/api";
import { cn } from "@/lib/utils";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/m";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await postJson("/api/auth/login", {
          role: "USER",
          account: phone.trim(),
          password
        });
        toast.success("登录成功");
      } else {
        await postJson("/api/auth/register", {
          phone: phone.trim(),
          name: name.trim(),
          password
        });
        toast.success("注册成功，已自动登录");
      }
      const target = redirect.startsWith("/") ? redirect : "/m";
      router.replace(target);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setMode("login");
    setPhone("13900000001");
    setPassword("123456");
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[480px] px-5">
        <div className="flex h-14 items-center">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition hover:bg-ink-100"
            aria-label="返回"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <Link href="/m" className="ml-auto text-xs text-ink-400 hover:text-brand-600">
            返回首页
          </Link>
        </div>

        <div className="mt-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/25">
            <ChefHat className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink-900">
            {mode === "login" ? "欢迎回来" : "加入禾味会员"}
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            {mode === "login"
              ? "登录后可扫码点餐、使用积分与优惠券。"
              : "注册即可享受消费积分、余额支付与专属优惠。"}
          </p>
        </div>

        <div className="mt-6 flex rounded-xl bg-ink-50 p-1">
          {[
            { key: "login", label: "登录" },
            { key: "register", label: "注册" }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setMode(item.key as "login" | "register")}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-medium transition",
                mode === item.key
                  ? "bg-white text-ink-900 shadow-sm"
                  : "text-ink-500"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          {mode === "register" ? (
            <div>
              <Label>昵称</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="怎么称呼你"
                maxLength={20}
                required
              />
            </div>
          ) : null}
          <div>
            <Label>手机号</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入 11 位手机号"
              inputMode="numeric"
              autoComplete="username"
              maxLength={11}
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>密码</Label>
              {mode === "login" ? (
                <button
                  type="button"
                  onClick={fillDemo}
                  className="mb-1.5 text-xs font-medium text-brand-600"
                >
                  填入演示账号
                </button>
              ) : null}
            </div>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "至少 6 位密码" : "请输入密码"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="pr-11"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-400"
                aria-label={show ? "隐藏密码" : "显示密码"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" loading={loading}>
            {mode === "login" ? "登录" : "注册并登录"}
          </Button>
        </form>

        {mode === "login" ? (
          <div className="mt-4 rounded-xl bg-ink-50 px-4 py-3 text-xs leading-6 text-ink-500">
            演示会员：<span className="font-medium text-ink-700">13900000001</span>
            <span className="mx-2 text-ink-300">/</span>
            密码：<span className="font-medium text-ink-700">123456</span>
          </div>
        ) : (
          <p className="mt-4 text-center text-[11px] leading-5 text-ink-400">
            注册即代表同意平台服务条款与隐私政策
          </p>
        )}

        <div className="mt-8 flex items-center justify-center gap-3 text-xs text-ink-400">
          <Link href="/admin/login" className="hover:text-brand-600">
            管理员端
          </Link>
          <span className="text-ink-200">|</span>
          <Link href="/merchant/login" className="hover:text-brand-600">
            商户端
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MobileLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-ink-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          加载中
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
