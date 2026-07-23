import type { Metadata } from "next";
import "./globals.css";
import "./brand-overrides.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { AppGate } from "@/components/AppGate";
import { AppProvider } from "@/context/AppContext";

export const metadata: Metadata = {
  title: "宝を探そう",
  description: "夫婦で聖書通読と研究を続けるための管理アプリ",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <ServiceWorkerRegister />
        <AppProvider>
          <AppGate>
            <main className="app-shell">{children}</main>
          </AppGate>
        </AppProvider>
      </body>
    </html>
  );
}
