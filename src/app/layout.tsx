import { ClerkProvider } from "@clerk/nextjs";
import { thTH } from "@clerk/localizations";
import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Thai, Prompt } from "next/font/google";
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

const localization = {
  ...thTH,
  signIn: {
    ...thTH.signIn,
    start: {
      ...thTH.signIn?.start,
      title: "เข้าสู่ระบบ",
      titleCombined: "เข้าสู่ระบบ",
      subtitle: "ใช้อีเมลที่ได้รับสิทธิ์จากผู้ดูแลระบบ",
    },
  },
};

export const metadata: Metadata = {
  title: { default: "OrangePack ERP", template: "%s · OrangePack ERP" },
  description: "ระบบออกใบเสนอราคาและจัดการข้อมูลลูกค้าของ OrangePack",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${prompt.variable} ${plexThai.variable} ${plexMono.variable}`}>
      <body>
        <ClerkProvider
          localization={localization}
          signInUrl="/sign-in"
          signInFallbackRedirectUrl="/quotations"
          appearance={{
            variables: {
              colorPrimary: "var(--color-accent)",
              colorPrimaryForeground: "var(--color-accent-ink)",
              colorForeground: "var(--color-ink)",
              colorMutedForeground: "var(--color-muted)",
              colorBackground: "var(--color-paper-3)",
              colorInput: "var(--color-paper-3)",
              colorInputForeground: "var(--color-ink)",
              colorBorder: "var(--color-rule-2)",
              colorDanger: "var(--color-error)",
              colorRing: "var(--color-focus)",
              fontFamily: "var(--font-body)",
              borderRadius: "var(--radius-sm)",
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
