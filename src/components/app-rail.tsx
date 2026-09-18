"use client";

import { UserButton } from "@clerk/nextjs";
import { ClipboardList, FileText, LayoutDashboard, Package, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/quotations", label: "ใบเสนอราคา", icon: FileText },
  { href: "/orders", label: "ใบสั่งขาย", icon: ClipboardList },
  { href: "/customers", label: "ลูกค้า", icon: Users },
  { href: "/products", label: "สินค้า", longLabel: "และราคา", icon: Package },
];

export function AppRail() {
  const pathname = usePathname();

  return (
    <header className="rail">
      <Link href="/" className="rail__brand">
        <Image src="/brand/logo.png" alt="" width={32} height={32} priority />
        <span className="rail__wordmark">
          OrangePack <span>ERP</span>
        </span>
      </Link>
      <nav className="rail__nav" aria-label="เมนูหลัก">
        {links.map(({ href, label, longLabel, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`rail__link${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} aria-hidden />
              {label}
              {longLabel && <span className="rail__label-long">{longLabel}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="rail__user">
        <UserButton showName />
      </div>
      <p className="rail__foot">ราคาสินค้านำเข้าจาก theorangepack.com</p>
    </header>
  );
}
