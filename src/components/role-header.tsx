import Link from "next/link";

export function RoleHeader({ role }: { role: string }) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/dashboard" className="font-semibold">Math Mentor <span className="text-brand">AI</span></Link>
        <nav className="flex items-center gap-5 text-sm font-medium text-muted">
          <span className="capitalize">{role}</span>
          <form action="/auth/sign-out" method="post"><button className="hover:text-brand">Sign out</button></form>
        </nav>
      </div>
    </header>
  );
}
