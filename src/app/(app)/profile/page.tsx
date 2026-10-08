import type { Metadata } from "next";
import { ProfileActions } from "@/components/profile-actions";

export const metadata: Metadata = { title: "โปรไฟล์บริษัท" };

// Served from public/ and excluded from the sign-in proxy, so the link works for customers too.
const PROFILE_PATH = "/brand/orangepack-company-profile.pdf";

export default function ProfilePage() {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">โปรไฟล์บริษัท</h1>
          <p className="page__lede">ดาวน์โหลดหรือแชร์ให้ลูกค้า · ลิงก์เปิดได้โดยไม่ต้องเข้าสู่ระบบ</p>
        </div>
        <ProfileActions path={PROFILE_PATH} fileName="OrangePack-Company-Profile.pdf" />
      </div>
      <object data={PROFILE_PATH} type="application/pdf" className="profile-viewer" aria-label="โปรไฟล์บริษัท OrangePack">
        <p className="profile-viewer__fallback">
          เบราว์เซอร์นี้แสดงตัวอย่าง PDF ไม่ได้ —{" "}
          <a href={PROFILE_PATH} target="_blank" rel="noreferrer">
            เปิดไฟล์
          </a>
        </p>
      </object>
    </div>
  );
}
