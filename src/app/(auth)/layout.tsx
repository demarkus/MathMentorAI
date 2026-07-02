import { SiteHeader } from "@/components/site-header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen"><SiteHeader compact /><div className="mx-auto max-w-md px-5 py-14">{children}</div></main>;
}
