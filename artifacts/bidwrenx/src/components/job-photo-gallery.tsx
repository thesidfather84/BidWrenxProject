import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Images } from "lucide-react";
import { cn } from "@/lib/utils";

interface JobPhotoGalleryProps {
  photos: string[];
  compact?: boolean;
  onDelete?: (path: string) => void;
}

export function JobPhotoGallery({ photos, compact = false, onDelete }: JobPhotoGalleryProps) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (!photos || photos.length === 0) return null;

  const src = (p: string) => `/api/storage${p}`;

  const prev = () => setLightbox((i) => (i != null && i > 0 ? i - 1 : photos.length - 1));
  const next = () => setLightbox((i) => (i != null && i < photos.length - 1 ? i + 1 : 0));

  return (
    <>
      <div className={cn("flex flex-wrap gap-2", compact && "gap-1.5")}>
        {photos.map((path, idx) => (
          <div
            key={path}
            className={cn(
              "relative group rounded-lg overflow-hidden border border-border bg-muted/30 cursor-pointer hover:border-primary/40 transition-colors",
              compact ? "w-14 h-14" : "w-20 h-20",
            )}
          >
            <img
              src={src(path)}
              alt={`repair photo ${idx + 1}`}
              className="w-full h-full object-cover"
              onClick={() => setLightbox(idx)}
            />
            {onDelete && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(path); }}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-background/80 border border-red-500/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-red-400"
                title="Remove photo"
              >
                <X size={10} />
              </button>
            )}
          </div>
        ))}
        {compact && photos.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground self-center">
            <Images size={12} />
            {photos.length}
          </div>
        )}
      </div>

      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={() => setLightbox(null)}
          >
            <X size={16} />
          </button>
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-4 w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center"
                onClick={(e) => { e.stopPropagation(); prev(); }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="absolute right-4 w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center"
                onClick={(e) => { e.stopPropagation(); next(); }}
              >
                <ChevronRight size={16} />
              </button>
            </>
          )}
          <img
            src={src(photos[lightbox])}
            alt={`repair photo ${lightbox + 1}`}
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-4 text-xs text-muted-foreground">
            {lightbox + 1} / {photos.length}
          </p>
        </div>
      )}
    </>
  );
}
