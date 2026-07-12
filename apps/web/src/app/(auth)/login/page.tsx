import Image from "next/image";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form action={login} className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-800 p-6">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="AI Workforce" width={28} height={28} />
          <h1 className="text-lg font-semibold">AI Workforce — Login</h1>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="space-y-1">
          <label className="text-sm text-neutral-400">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-neutral-400">Password</label>
          <input
            name="password"
            type="password"
            required
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded bg-neutral-100 py-2 font-medium text-neutral-900 hover:bg-white"
        >
          Masuk
        </button>

        <p className="text-xs text-neutral-500">
          Belum punya akun? Minta admin buat lewat Supabase Dashboard — tidak ada halaman registrasi publik.
        </p>
      </form>
    </main>
  );
}
