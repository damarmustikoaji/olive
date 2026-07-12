import Link from "next/link";
import { TaskDetailContent } from "@/components/task-detail-content";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;

  return (
    <div className="max-w-2xl space-y-4">
      <Link href="/board" className="text-sm text-neutral-500 hover:underline">
        ← Board
      </Link>
      <TaskDetailContent taskId={taskId} />
    </div>
  );
}
