"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export function ProductImageUploader({
  productId,
  onUploaded,
  currentUrl,
}: {
  productId: string;
  onUploaded: (url: string | null) => Promise<void>;
  currentUrl?: string | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const choose = (next: File | null) => {
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };
  const upload = async () => {
    if (!file) return;
    setBusy(true);
    const image = new Image();
    image.src = preview!;
    await image.decode();
    const side = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
    const maxX = (image.naturalWidth - side) / 2;
    const maxY = (image.naturalHeight - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 800;
    canvas
      .getContext("2d")!
      .drawImage(
        image,
        Math.max(0, Math.min(image.naturalWidth - side, maxX - offset.x * image.naturalWidth)),
        Math.max(0, Math.min(image.naturalHeight - side, maxY - offset.y * image.naturalHeight)),
        side,
        side,
        0,
        0,
        800,
        800,
      );
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.9),
    );
    if (!blob) {
      setBusy(false);
      return;
    }
    const client = createClient();
    const path = `products/${productId}-${Date.now()}.webp`;
    const { error } = await client.storage
      .from("payment-assets")
      .upload(path, blob, { contentType: "image/webp", upsert: true });
    if (!error) {
      const { data } = client.storage.from("payment-assets").getPublicUrl(path);
      await onUploaded(data.publicUrl);
      const marker = "/storage/v1/object/public/payment-assets/";
      const previousPath = currentUrl?.split(marker)[1];
      if (previousPath)
        await client.storage.from("payment-assets").remove([decodeURIComponent(previousPath)]);
      choose(null);
    }
    setBusy(false);
  };
  return (
    <div className="w-full border-t border-[var(--color-border)] pt-3">
      <label className="form-label">Square drink image</label>
      <input
        type="file"
        accept="image/*"
        onChange={(event) => choose(event.target.files?.[0] ?? null)}
      />
      {preview && (
        <>
          <div
            className="mt-3 aspect-square w-40 cursor-move overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setDrag({ x: event.clientX, y: event.clientY });
            }}
            onPointerMove={(event) => {
              if (drag) {
                setOffset((value) => ({
                  x: Math.max(-0.5, Math.min(0.5, value.x + (event.clientX - drag.x) / 220)),
                  y: Math.max(-0.5, Math.min(0.5, value.y + (event.clientY - drag.y) / 220)),
                }));
                setDrag({ x: event.clientX, y: event.clientY });
              }
            }}
            onPointerUp={() => setDrag(null)}
          >
            <img
              className="h-full w-full object-cover"
              src={preview}
              alt="Crop preview"
              style={{
                transform: `scale(${zoom}) translate(${offset.x * 100}%, ${offset.y * 100}%)`,
              }}
            />
          </div>
          <label className="mt-3 block text-sm">
            Crop zoom{" "}
            <input
              className="ml-2 align-middle"
              type="range"
              min="1"
              max="2.5"
              step="0.1"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Drag the image to position the crop.
          </p>
          <button type="button" className="btn mt-3" disabled={busy} onClick={upload}>
            {busy ? "Uploading…" : "Crop & upload image"}
          </button>
        </>
      )}
    </div>
  );
}
