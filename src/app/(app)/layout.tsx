import { DashboardNav } from "@/components/dashboard-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <><DashboardNav /><main className="mx-auto max-w-6xl px-5 py-10">{children}</main></>;
}
