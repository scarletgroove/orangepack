import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth-buttons";
import { getStaffStatus } from "@/lib/auth";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const status = await getStaffStatus();
  if (status.signedIn) redirect(status.allowed ? "/quotations" : "/no-access");

  const { error } = await searchParams;

  return (
    <main className="auth">
      <section className="auth__intro">
        <Image src="/brand/logo.png" alt="OrangePack" width={96} height={96} priority className="auth__logo" />
        <h1 className="auth__title">OrangePack ERP</h1>
        <p className="auth__lede">ระบบออกใบเสนอราคาสำหรับทีมงาน OrangePack เข้าสู่ระบบด้วยอีเมลที่ได้รับสิทธิ์</p>
      </section>
      <div className="auth__panel auth__panel--note">
        <h2 className="auth__panel-title">เข้าสู่ระบบ</h2>
        <p>ใช้บัญชี Google ของอีเมลที่ได้รับสิทธิ์จากผู้ดูแลระบบ</p>
        {error && (
          <p className="auth__error" role="alert">
            {/* Better Auth reports a blocked sign-up with a generic code, so cover both causes. */}
            เข้าสู่ระบบไม่สำเร็จ ถ้าอีเมลนี้ยังไม่ได้รับสิทธิ์ ให้ติดต่อผู้ดูแลระบบเพื่อขอเพิ่มในรายชื่อทีมงาน
            หรือลองใหม่อีกครั้ง
          </p>
        )}
        <GoogleSignInButton />
      </div>
    </main>
  );
}
