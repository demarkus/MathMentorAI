import { AuthForm } from "@/components/auth-form";
import { signup } from "../../(auth)/actions";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <AuthForm mode="signup" action={signup} error={params.error} />;
}
