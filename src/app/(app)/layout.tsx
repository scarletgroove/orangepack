import { AppRail } from "@/components/app-rail";
import { requireStaff } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const staff = await requireStaff();

  return (
    <div className="shell">
      <AppRail user={{ name: staff.name, email: staff.email }} />
      <main className="shell__main">{children}</main>
    </div>
  );
}
