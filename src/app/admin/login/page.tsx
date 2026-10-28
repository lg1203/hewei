import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { getSession } from "@/lib/auth";

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session?.role === "ADMIN") redirect("/admin");

  return (
    <AuthShell
      eyebrow="Platform Console"
      title="把每一家门店，经营得更清楚。"
      description="统一管理商户、用户、优惠券与平台流水，掌握全平台经营数据。"
    >
      <LoginForm
        role="ADMIN"
        title="管理员登录"
        subtitle="使用平台管理员账号进入运营后台。"
        accountLabel="管理员账号"
        accountPlaceholder="请输入管理员账号"
        demoAccount="admin"
        demoPassword="admin123"
        redirectTo="/admin"
      />
    </AuthShell>
  );
}
