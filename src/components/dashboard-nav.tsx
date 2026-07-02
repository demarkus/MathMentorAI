import Link from "next/link";

export function DashboardNav() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/dashboard" className="font-semibold">Math Mentor <span className="text-brand">AI</span></Link>
        <nav className="flex gap-5 text-sm font-medium text-muted">
          <Link href="/dashboard" className="hover:text-brand">Dashboard</Link>
          <Link href="/learner/practice" className="hover:text-brand">Practice</Link>
          <form action="/auth/sign-out" method="post"><button className="hover:text-brand">Sign out</button></form>
        </nav>
      </div>
    </header>
  );
}
