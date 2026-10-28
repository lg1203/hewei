import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MERCHANT_NAV } from "@/lib/constants";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MerchantConsoleLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "MERCHANT") redirect("/merchant/login");

  const shop = session.shopId
    ? await prisma.shop.findUnique({
        where: { id: session.shopId },
        select: { name: true, status: true }
      })
    : null;

  if (!shop) redirect("/merchant/login");

  return (
    <DashboardShell
      nav={MERCHANT_NAV}
      roleLabel="商户经营者"
      name={session.name}
      subtitle={shop.name}
      variant="merchant"
    >
      {children}
    </DashboardShell>
  );
}
