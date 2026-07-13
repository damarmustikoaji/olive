import { Modal } from "@/components/modal";

export default function TaskModalLoading() {
  return (
    <Modal>
      <div className="animate-pulse space-y-6">
        <div className="h-6 w-2/3 rounded bg-neutral-800" />
        <div className="h-24 rounded border border-neutral-800 bg-neutral-900/50" />
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 rounded bg-neutral-900/50" />
          ))}
        </div>
      </div>
    </Modal>
  );
}
