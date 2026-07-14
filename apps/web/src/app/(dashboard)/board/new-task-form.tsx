"use client";

import { useRef, useState, useTransition } from "react";
import { createManualTask } from "./actions";
import { DescriptionWithImage } from "./description-with-image";

/**
 * A plain <form action={createManualTask}> never resets — Server Actions
 * don't trigger a real navigation, so the DOM (and DescriptionWithImage's
 * own React state) just stays as the user left it after submit. This wraps
 * the action in a transition so we can explicitly reset both once it
 * resolves.
 */
export function NewTaskForm({
  cloudName,
  uploadPreset,
}: {
  cloudName?: string;
  uploadPreset?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [descriptionKey, setDescriptionKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createManualTask(formData);
      formRef.current?.reset();
      setDescriptionKey((k) => k + 1);
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="mt-4 space-y-3">
      <input
        name="title"
        placeholder="Judul task"
        required
        className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
      />
      {cloudName && uploadPreset ? (
        <DescriptionWithImage key={descriptionKey} cloudName={cloudName} uploadPreset={uploadPreset} />
      ) : (
        <textarea
          name="description"
          placeholder="Deskripsi (opsional)"
          rows={3}
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
        />
      )}
      <div className="flex gap-4">
        <label className="space-y-1 text-xs text-neutral-400">
          Severity
          <select
            name="severity"
            defaultValue="medium"
            className="block rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
          >
            <option value="minor">Minor</option>
            <option value="medium">Medium</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        <label className="space-y-1 text-xs text-neutral-400">
          Priority
          <select
            name="priority"
            defaultValue="medium"
            className="block rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
      >
        {isPending ? "Membuat..." : "Buat Task"}
      </button>
    </form>
  );
}
