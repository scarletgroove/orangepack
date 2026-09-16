import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default function SignInPage() {
  return (
    <main className="auth">
      <section className="auth__intro">
        <Image src="/brand/logo.png" alt="OrangePack" width={96} height={96} priority className="auth__logo" />
        <h1 className="auth__title">OrangePack ERP</h1>
        <p className="auth__lede">ระบบออกใบเสนอราคาสำหรับทีมงาน OrangePack เข้าสู่ระบบด้วยอีเมลที่ได้รับสิทธิ์</p>
      </section>
      <div className="auth__panel">
        <SignIn withSignUp fallbackRedirectUrl="/quotations" />
      </div>
    </main>
  );
}
