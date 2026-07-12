import { Modal } from "@/components/modal";
import { TaskDetailContent } from "@/components/task-detail-content";

export default async function TaskModal({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;

  return (
    <Modal>
      <TaskDetailContent taskId={taskId} />
    </Modal>
  );
}
