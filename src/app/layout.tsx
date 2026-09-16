import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Thai, Prompt } from "next/font/google";
import { AppRail } from "@/components/app-rail";
import "./globals.css";

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["thai", "latin"],
  weight: ["600", "700"],
  display: "swap",
});

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "OrangePack ERP", template: "%s · OrangePack ERP" },
  description: "ระบบออกใบเสนอราคาและจัดการข้อมูลลูกค้าของ OrangePack",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${prompt.variable} ${plexThai.variable} ${plexMono.variable}`}>
      <body>
        <div className="shell">
          <AppRail />
          <main className="shell__main">{children}</main>
        </div>
      </body>
    </html>
  );
}
