import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { env } from "./env";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

/**
 * Session-aware client (anon key + cookies) — used ONLY for auth (login/logout/getUser).
 * Never used for domain data; that goes through the service-role RepositoryBundle
 * (see repositories.ts) so we don't need RLS policies for this internal tool.
 */
export async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet: CookieToSet[]) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — middleware refreshes the
          // session instead, so this can be safely ignored here.
        }
      },
    },
  });
}

/**
 * Wrapped in React's `cache()` so multiple calls within the same request's
 * RSC render tree (layout + page + nested server actions) dedupe into a
 * single Supabase Auth round-trip instead of one per call site.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
