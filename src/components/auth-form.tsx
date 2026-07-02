import Link from "next/link";
import { Alert } from "@/components/ui/Alert";

export function AuthForm({ mode, action, error, message }: { mode: "login" | "signup"; action: (data: FormData) => void; error?: string; message?: string }) {
  const signup = mode === "signup";
  return (
    <div>
      <p className="text-sm font-semibold text-brand">{signup ? "Create your account" : "Welcome back"}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{signup ? "Let’s build maths confidence." : "Continue your practice."}</h1>
      <p className="mt-3 text-muted">{signup ? "Start with a focused diagnostic and get a personal practice path." : "Log in to pick up where you left off."}</p>
      {error && <Alert variant="error" className="mt-5">{error}</Alert>}
      {message && <Alert variant="success" className="mt-5">{message}</Alert>}
      <form action={action} className="mt-8 space-y-4">
        {signup && <label className="block text-sm font-medium">Full name<input name="fullName" required className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 outline-none focus:border-brand" /></label>}
        {signup && <label className="block text-sm font-medium">I am a…<select name="role" required defaultValue="learner" className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 outline-none focus:border-brand"><option value="learner">Learner</option><option value="parent">Parent</option><option value="teacher">Teacher</option><option value="admin">Admin</option></select></label>}
        <label className="block text-sm font-medium">Email address<input name="email" type="email" required className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 outline-none focus:border-brand" /></label>
        <label className="block text-sm font-medium">Password<input name="password" type="password" minLength={8} required className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 outline-none focus:border-brand" /></label>
        <button className="w-full rounded-xl bg-brand px-5 py-3.5 font-semibold text-white hover:bg-brand-dark">{signup ? "Create account" : "Log in"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">{signup ? "Already have an account?" : "New to Math Mentor?"} <Link className="font-semibold text-brand" href={signup ? "/auth/sign-in" : "/auth/sign-up"}>{signup ? "Log in" : "Create account"}</Link></p>
    </div>
  );
}
