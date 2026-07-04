import { AuthForm } from "@/components/auth-form";
import { login } from "../../(auth)/actions";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; next?: string }> }) {
  const params = await searchParams;
  return <AuthForm mode="login" action={login} error={params.error} message={params.message} next={params.next} />;
}
