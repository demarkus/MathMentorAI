import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const features = [
  ["Target weak spots", "A short diagnostic identifies the algebra topics that need attention first."],
  ["Learn through mistakes", "Hints come before solutions, so learners build real problem-solving habits."],
  ["See real progress", "Topic scores make improvement clear to learners and parents."],
];

export default function Home() {
  return (
    <main>
      <SiteHeader />
      <section className="overflow-hidden border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-14 px-5 py-20 md:grid-cols-[1.15fr_.85fr] md:py-28">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-brand/20 bg-brand/5 px-4 py-2 text-sm font-semibold text-brand">CAPS-aligned · Grade 9 & 10 Algebra</p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-0.045em] md:text-7xl">Maths feels better when every step makes sense.</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-muted">Focused algebra practice, useful hints, and progress you can see—built for South African learners preparing for tests and exams.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/beta" className="rounded-xl bg-brand px-6 py-3.5 font-semibold text-white hover:bg-brand-dark">Start Beta Access</Link>
              <Link href="/pricing" className="rounded-xl border border-line bg-white px-6 py-3.5 font-semibold hover:border-brand/40">See pricing</Link>
              <Link href="/auth/sign-up" className="rounded-xl border border-line bg-white px-6 py-3.5 font-semibold hover:border-brand/40">Start the free diagnostic</Link>
            </div>
          </div>
          <div className="relative rounded-[2rem] bg-brand p-7 text-white shadow-2xl shadow-brand/20">
            <div className="rounded-2xl bg-white/10 p-5">
              <p className="text-sm text-white/70">Today’s focus</p>
              <h2 className="mt-1 text-2xl font-semibold">Factorisation</h2>
              <div className="mt-7 h-2 rounded-full bg-white/15"><div className="h-2 w-[68%] rounded-full bg-accent" /></div>
              <p className="mt-2 text-sm text-white/70">68% topic confidence</p>
            </div>
            <div className="mt-4 rounded-2xl bg-white p-5 text-foreground">
              <p className="text-sm font-semibold text-brand">A small hint</p>
              <p className="mt-2 text-lg">What is the highest common factor of 6x and 12?</p>
              <p className="mt-5 font-mono text-2xl font-semibold">6x + 12 = ?</p>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="text-sm font-semibold uppercase tracking-[.18em] text-brand">Built for understanding</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Less guessing. More confidence.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {features.map(([title, body], index) => (
            <article key={title} className="rounded-2xl border border-line bg-white p-6">
              <span className="font-mono text-sm text-brand">0{index + 1}</span>
              <h3 className="mt-8 text-xl font-semibold">{title}</h3>
              <p className="mt-3 leading-7 text-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
