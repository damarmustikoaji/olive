function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),
  OPENROUTER_API_KEY: required("OPENROUTER_API_KEY"),
  // Auth (auth.users) is shared with every other app in the Sandbox Supabase
  // project — being authenticated there does NOT mean being authorized here.
  // This allowlist is the actual access boundary for the AI Workforce dashboard.
  ALLOWED_ADMIN_EMAILS: required("ALLOWED_ADMIN_EMAILS")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
};
