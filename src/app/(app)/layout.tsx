import { AppRail } from "@/components/app-rail";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="shell">
      <AppRail />
      <main className="shell__main">{children}</main>
    </div>
  );
}
