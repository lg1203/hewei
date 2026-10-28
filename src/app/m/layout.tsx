import { MobileTabBar } from "@/components/mobile/TabBar";

export default function MobileLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#eef0f3]">
      <div className="relative mx-auto min-h-screen w-full max-w-[480px] bg-[#f6f7f9] pb-24 shadow-[0_0_60px_rgba(15,23,42,0.08)]">
        {children}
        <MobileTabBar />
      </div>
    </div>
  );
}
