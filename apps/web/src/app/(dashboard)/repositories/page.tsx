import { repositories } from "@/lib/repositories.js";
import { addWatchedRepository, toggleActive } from "./actions.js";

export default async function RepositoriesPage() {
  const watched = await repositories.watchedRepositories.listAll();

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Watched Repositories</h1>

      <form action={addWatchedRepository} className="flex gap-2">
        <input
          name="owner"
          placeholder="owner (e.g. damaraji)"
          required
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
        />
        <input
          name="repo"
          placeholder="repo (e.g. forge-mango)"
          required
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
        >
          Tambah
        </button>
      </form>

      <ul className="divide-y divide-neutral-800 rounded border border-neutral-800">
        {watched.map((repo) => (
          <li key={repo.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <span className="font-medium">
                {repo.owner}/{repo.repo}
              </span>
              <span className="ml-2 text-neutral-500">
                last: {repo.lastReleaseTag ?? "-"}
              </span>
            </div>
            <form action={toggleActive.bind(null, repo.id, !repo.isActive)}>
              <button
                type="submit"
                className={
                  repo.isActive
                    ? "rounded border border-neutral-700 px-3 py-1 text-neutral-300 hover:bg-neutral-900"
                    : "rounded border border-neutral-700 px-3 py-1 text-neutral-600 hover:bg-neutral-900"
                }
              >
                {repo.isActive ? "Aktif" : "Nonaktif"}
              </button>
            </form>
          </li>
        ))}
        {watched.length === 0 && (
          <li className="px-4 py-3 text-sm text-neutral-500">Belum ada repo yang dipantau.</li>
        )}
      </ul>
    </div>
  );
}
