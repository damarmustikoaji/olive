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
  // Optional: emergency fallback if OpenRouter itself is down/rate-limited.
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  // Optional: only needed for the "Publish to X" action. Left unset, that
  // button fails with a clear error instead of crashing the whole app at boot.
  X_API_KEY: process.env.X_API_KEY,
  X_API_SECRET: process.env.X_API_SECRET,
  X_ACCESS_TOKEN: process.env.X_ACCESS_TOKEN,
  X_ACCESS_TOKEN_SECRET: process.env.X_ACCESS_TOKEN_SECRET,
  // Optional: only needed for the "Publish to Threads" action.
  THREADS_USER_ID: process.env.THREADS_USER_ID,
  THREADS_ACCESS_TOKEN: process.env.THREADS_ACCESS_TOKEN,
  // Optional: only needed for the "lampirkan gambar" upload on manual tasks.
  // Neither value is secret (cloud name is public in URLs anyway, and an
  // unsigned preset is meant to be embedded client-side) — passed as props
  // to the upload component from a server component, not read via NEXT_PUBLIC_.
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET,
  // Auth (auth.users) is shared with every other app in the Sandbox Supabase
  // project — being authenticated there does NOT mean being authorized here.
  // This allowlist is the actual access boundary for the AI Workforce dashboard.
  ALLOWED_ADMIN_EMAILS: required("ALLOWED_ADMIN_EMAILS")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
};
