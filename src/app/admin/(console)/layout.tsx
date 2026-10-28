import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ADMIN_NAV } from "@/lib/constants";
import { getSession } from "@/lib/auth";

export default async function AdminConsoleLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/admin/login");

  return (
    <DashboardShell
      nav={ADMIN_NAV}
      roleLabel="平台管理员"
      name={session.name}
      subtitle="全平台运营中心"
      variant="admin"
    >
      {children}
    </DashboardShell>
  );
}
