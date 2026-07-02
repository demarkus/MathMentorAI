import Link from "next/link";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className="border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-3 font-semibold">
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-lg text-white">M</span>
          <span>Math Mentor <span className="text-brand">AI</span></span>
        </Link>
        {!compact && (
          <nav className="flex items-center gap-3 text-sm font-medium">
            <Link href="/pricing" className="px-3 py-2 text-muted hover:text-foreground">Pricing</Link>
            <Link href="/auth/sign-in" className="px-3 py-2 text-muted hover:text-foreground">Log in</Link>
            <Link href="/auth/sign-up" className="rounded-xl bg-brand px-4 py-2.5 text-white hover:bg-brand-dark">Start practising</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
