import { useRef, useState, useCallback } from "react";
import { Camera, X, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 5;
const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.85;

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not available")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else reject(new Error("Compression failed")); },
        "image/jpeg",
        JPEG_QUALITY,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

async function uploadPhoto(file: File | Blob, name: string): Promise<string> {
  const token = localStorage.getItem("bidwrenx_token") ?? "";
  const urlRes = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, size: file.size, contentType: "image/jpeg" }),
  });
  if (!urlRes.ok) throw new Error("Failed to get upload URL");
  const { uploadURL, objectPath } = await urlRes.json();

  const putRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: file,
  });
  if (!putRes.ok) throw new Error("Upload to storage failed");
  return objectPath as string;
}

interface JobPhotoUploaderProps {
  value: string[];
  onChange: (paths: string[]) => void;
  disabled?: boolean;
}

export function JobPhotoUploader({ value, onChange, disabled }: JobPhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || uploading || disabled) return;
    const remaining = MAX_PHOTOS - value.length;
    if (remaining <= 0) return;

    const toProcess = Array.from(files).slice(0, remaining);
    setUploading(true);
    const newPaths: string[] = [];

    for (const file of toProcess) {
      try {
        const compressed = await compressImage(file);
        const previewUrl = URL.createObjectURL(compressed);
        const objectPath = await uploadPhoto(compressed, file.name.replace(/\.[^.]+$/, ".jpg"));
        newPaths.push(objectPath);
        setPreviews((prev) => ({ ...prev, [objectPath]: previewUrl }));
      } catch {
        // skip failed uploads silently; user sees no new thumbnail
      }
    }

    setUploading(false);
    if (newPaths.length) onChange([...value, ...newPaths]);
    if (inputRef.current) inputRef.current.value = "";
  }, [value, onChange, uploading, disabled]);

  const removePhoto = (path: string) => {
    onChange(value.filter((p) => p !== path));
    setPreviews((prev) => {
      const next = { ...prev };
      if (next[path]) { URL.revokeObjectURL(next[path]); delete next[path]; }
      return next;
    });
  };

  const thumbSrc = (path: string) =>
    previews[path] ?? `/api/storage${path}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {value.map((path) => (
          <div key={path} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted/30">
            <img
              src={thumbSrc(path)}
              alt="repair photo"
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => removePhoto(path)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-background/80 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            )}
          </div>
        ))}

        {value.length < MAX_PHOTOS && !disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors",
              uploading && "opacity-50 cursor-not-allowed",
            )}
          >
            {uploading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Plus size={16} />
                <Camera size={14} />
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {value.length}/{MAX_PHOTOS} photos · Images are compressed to ~1200px before upload
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
