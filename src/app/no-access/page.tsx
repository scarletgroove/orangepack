import { SignOutButton } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getStaffStatus } from "@/lib/auth";

export const metadata: Metadata = { title: "ไม่มีสิทธิ์เข้าใช้งาน" };

export default async function NoAccessPage() {
  const status = await getStaffStatus();
  if (!status.signedIn) redirect("/sign-in");
  if (status.allowed) redirect("/quotations");

  return (
    <main className="auth">
      <section className="auth__intro">
        <Image src="/brand/logo.png" alt="OrangePack" width={96} height={96} className="auth__logo" />
        <h1 className="auth__title">ยังไม่มีสิทธิ์เข้าใช้งาน</h1>
        <p className="auth__lede">
          อีเมล <strong>{status.email ?? "ของบัญชีนี้"}</strong> ยังไม่ได้รับสิทธิ์เข้าระบบ OrangePack ERP
          ติดต่อผู้ดูแลระบบเพื่อขอเพิ่มอีเมลนี้ในรายชื่อทีมงาน
        </p>
      </section>
      <div className="auth__panel auth__panel--note">
        <ShieldAlert size={28} aria-hidden />
        <p>ถ้าคุณมีอีเมลอื่นที่ได้รับสิทธิ์ ให้ออกจากระบบแล้วเข้าสู่ระบบใหม่ด้วยอีเมลนั้น</p>
        <SignOutButton redirectUrl="/sign-in">
          <button type="button" className="btn btn--primary">
            ออกจากระบบ
          </button>
        </SignOutButton>
      </div>
    </main>
  );
}
