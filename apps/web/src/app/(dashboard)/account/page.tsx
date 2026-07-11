import { getCurrentUser } from "@/lib/supabase-auth";
import { changePassword } from "./actions";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const user = await getCurrentUser();

  return (
    <div className="max-w-sm space-y-6">
      <h1 className="text-xl font-semibold">Account</h1>
      <p className="text-sm text-neutral-500">Login sebagai {user?.email}</p>

      <form action={changePassword} className="space-y-4 rounded border border-neutral-800 p-4">
        <h2 className="text-sm font-medium">Ganti Password</h2>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-400">Password berhasil diganti.</p>}

        <div className="space-y-1">
          <label className="text-sm text-neutral-400">Password baru</label>
          <input
            name="newPassword"
            type="password"
            required
            minLength={8}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-neutral-400">Konfirmasi password baru</label>
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded bg-neutral-100 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
        >
          Simpan
        </button>
      </form>
    </div>
  );
}
