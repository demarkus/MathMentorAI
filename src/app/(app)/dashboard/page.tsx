import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const role = user.profile?.role;
  if (!role) redirect("/onboarding");

  // "student" is the stored value for the learner role.
  if (role === "student") redirect("/learner");
  if (role === "parent") redirect("/parent");
  if (role === "teacher") redirect("/teacher");
  if (role === "admin") redirect("/admin");

  redirect("/onboarding");
}
