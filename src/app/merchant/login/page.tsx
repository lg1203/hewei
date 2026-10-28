import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { getSession } from "@/lib/auth";

export default async function MerchantLoginPage() {
  const session = await getSession();
  if (session?.role === "MERCHANT") redirect("/merchant");

  return (
    <AuthShell
      eyebrow="Merchant Console"
      title="你的门店，今天生意怎么样？"
      description="实时查看营业额、桌台状态与菜品库存，管理优惠券和线下点餐。"
    >
      <LoginForm
        role="MERCHANT"
        title="商户登录"
        subtitle="使用商户手机号进入门店经营后台。"
        accountLabel="商户手机号"
        accountPlaceholder="请输入 11 位手机号"
        demoAccount="13800000001"
        demoPassword="123456"
        redirectTo="/merchant"
      />
    </AuthShell>
  );
}
