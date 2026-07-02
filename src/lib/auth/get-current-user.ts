import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role | null;
};

export type CurrentUser = {
  id: string;
  email?: string;
  profile: Profile | null;
};

/**
 * Returns the authenticated user together with their profile row, or null when
 * there is no session. Reads the session from cookies via the SSR client, so
 * Row Level Security applies (a user can only read their own profile).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", claims.sub)
    .maybeSingle();

  return {
    id: claims.sub as string,
    email: typeof claims.email === "string" ? claims.email : undefined,
    profile: (profile as Profile) ?? null,
  };
}
