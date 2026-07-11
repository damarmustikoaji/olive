import { repositories } from "@/lib/repositories";
import { retryTaskRun } from "./actions";

const STATUS_COLOR: Record<string, string> = {
  pending: "text-neutral-400",
  running: "text-blue-400",
  done: "text-green-400",
  failed: "text-red-400",
};

export default async function RunsPage() {
  const runs = await repositories.taskRuns.listRecent(50);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Task Runs</h1>
      <p className="text-sm text-neutral-500">
        Retry di sini hanya mengubah status jadi "pending" — eksekusi ulang baru terjadi saat
        GitHub Actions cron berjalan berikutnya.
      </p>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-neutral-500">
            <th className="py-2">Workflow</th>
            <th className="py-2">Trigger</th>
            <th className="py-2">Status</th>
            <th className="py-2">Attempts</th>
            <th className="py-2">Error</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-900">
          {runs.map((run) => (
            <tr key={run.id}>
              <td className="py-2">{run.workflowName}</td>
              <td className="py-2 text-neutral-400">{run.triggerRef}</td>
              <td className={`py-2 ${STATUS_COLOR[run.status] ?? ""}`}>{run.status}</td>
              <td className="py-2">{run.attemptCount}</td>
              <td className="max-w-xs truncate py-2 text-neutral-500" title={run.errorMessage ?? ""}>
                {run.errorMessage ?? "-"}
              </td>
              <td className="py-2">
                {run.status === "failed" && (
                  <form action={retryTaskRun.bind(null, run.id)}>
                    <button type="submit" className="text-xs underline text-neutral-300 hover:text-white">
                      Retry
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
          {runs.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-center text-neutral-500">
                Belum ada task run.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
