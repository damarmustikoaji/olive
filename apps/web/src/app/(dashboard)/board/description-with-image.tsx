"use client";

import { useState } from "react";

/**
 * Uploads straight from the browser to Cloudinary's unsigned endpoint — no
 * API secret ever touches the server, so this needs no backend route at all.
 * The resulting URL gets appended to the description as a markdown image
 * link, which the task detail page already renders via MarkdownContent.
 */
export function DescriptionWithImage({
  cloudName,
  uploadPreset,
}: {
  cloudName: string;
  uploadPreset: string;
}) {
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(await response.text());

      const data = (await response.json()) as { secure_url: string };
      setDescription((prev) => `${prev}${prev ? "\n\n" : ""}![lampiran](${data.secure_url})`);
    } catch {
      setError("Upload gagal, coba lagi.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        name="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Deskripsi (opsional)"
        rows={4}
        className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-2 text-xs">
        <label className="cursor-pointer rounded border border-neutral-700 px-2 py-1 hover:bg-neutral-900">
          📎 Lampirkan gambar
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
        {uploading && <span className="text-neutral-500">Mengupload...</span>}
        {error && <span className="text-red-400">{error}</span>}
      </div>
    </div>
  );
}
