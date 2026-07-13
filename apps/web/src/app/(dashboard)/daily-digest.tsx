import Link from "next/link";
import type { Task, TaskSource } from "@ai-workforce/core";

/** Local server time, not Asia/Jakarta-aware — good enough for a dashboard glance. */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const SOURCE_LABEL: Record<TaskSource, string> = {
  github_release: "release",
  github_issue: "issue",
  manual: "manual",
  support_ticket: "tiket support",
  research: "ide riset",
  insight: "rekomendasi insight",
};

/**
 * Pure aggregation over data that already exists — no AI call, no extra
 * cost. The point is to make the day's activity legible at a glance without
 * clicking into every task, not to generate new insight.
 */
export function DailyDigest({
  allTasks,
  publishedTodayThreadsCount,
}: {
  allTasks: Task[];
  publishedTodayThreadsCount: number;
}) {
  const today = startOfToday();

  const newToday = allTasks.filter((t) => t.createdAt >= today);
  const doneToday = allTasks.filter(
    (t) => (t.status === "done" || t.status === "approved") && t.updatedAt >= today,
  );
  const readyForReview = allTasks.filter((t) => t.status === "ready_for_review");

  const newBySource = newToday.reduce<Partial<Record<TaskSource, number>>>((acc, t) => {
    acc[t.source] = (acc[t.source] ?? 0) + 1;
    return acc;
  }, {});

  const todayLabel = new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(today);

  return (
    <section className="rounded border border-neutral-800 bg-neutral-900/40 p-4">
      <h2 className="mb-3 text-sm font-medium text-neutral-400">Ringkasan Hari Ini — {todayLabel}</h2>

      <ul className="mb-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <li className="rounded border border-neutral-800 px-3 py-2">
          <div className="text-lg font-semibold">{newToday.length}</div>
          <div className="text-neutral-500">task baru masuk</div>
        </li>
        <li className="rounded border border-neutral-800 px-3 py-2">
          <div className="text-lg font-semibold">{doneToday.length}</div>
          <div className="text-neutral-500">task selesai</div>
        </li>
        <li className="rounded border border-neutral-800 px-3 py-2">
          <div className="text-lg font-semibold">{publishedTodayThreadsCount}</div>
          <div className="text-neutral-500">published ke Threads</div>
        </li>
        <li className="rounded border border-neutral-800 px-3 py-2">
          <div className="text-lg font-semibold">{readyForReview.length}</div>
          <div className="text-neutral-500">butuh review kamu</div>
        </li>
      </ul>

      {Object.keys(newBySource).length > 0 && (
        <p className="mb-4 text-xs text-neutral-500">
          Task baru dari:{" "}
          {Object.entries(newBySource)
            .map(([source, count]) => `${count} ${SOURCE_LABEL[source as TaskSource]}`)
            .join(", ")}
        </p>
      )}

      {readyForReview.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Butuh perhatian kamu
          </h3>
          <ul className="divide-y divide-neutral-800 rounded border border-neutral-800">
            {readyForReview.slice(0, 8).map((task) => (
              <li key={task.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <Link href={`/tasks/${task.id}`} className="hover:underline">
                  {task.title}
                </Link>
                <span className="text-neutral-500">
                  {SOURCE_LABEL[task.source]} · {task.severity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
