import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "禾味点餐 · 智慧餐饮",
  description: "管理员、商户、用户三端一体的扫码点餐与会员积分系统"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f97316"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{ className: "text-sm" }}
        />
      </body>
    </html>
  );
}
