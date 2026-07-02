import { saveProfile } from "./actions";

const roles = [
  ["student", "Learner", "Practise algebra and track your progress."],
  ["parent", "Parent", "Follow a learner’s progress and weak areas."],
  ["teacher", "Teacher", "Prepare resources and support learners."],
];

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <p className="text-sm font-semibold text-brand">One quick step</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">How will you use Math Mentor?</h1>
      <p className="mt-3 text-muted">Choose your role. Learners can also select their current grade.</p>
      {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      <form action={saveProfile} className="mt-9">
        <div className="grid gap-4 md:grid-cols-3">
          {roles.map(([value, title, body], index) => (
            <label key={value} className="cursor-pointer">
              <input className="peer sr-only" type="radio" name="role" value={value} defaultChecked={index === 0} />
              <span className="block h-full rounded-2xl border border-line bg-white p-5 peer-checked:border-brand peer-checked:ring-2 peer-checked:ring-brand/15">
                <strong className="text-lg">{title}</strong><span className="mt-2 block text-sm leading-6 text-muted">{body}</span>
              </span>
            </label>
          ))}
        </div>
        <label className="mt-6 block max-w-xs text-sm font-medium">Learner grade
          <select name="grade" className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3"><option value="9">Grade 9</option><option value="10">Grade 10</option></select>
        </label>
        <button className="mt-8 rounded-xl bg-brand px-6 py-3.5 font-semibold text-white hover:bg-brand-dark">Continue to dashboard</button>
      </form>
    </main>
  );
}
