"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { ImagePlus, Lock, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { uploadTradeScreenshotAction, deleteScreenshotAction } from "./screenshot-actions";

export type TradeScreenshot = { id: string; url: string };

export function ScreenshotGallery({
  tradeId,
  screenshots,
  canUpload,
}: {
  tradeId: string;
  screenshots: TradeScreenshot[];
  canUpload: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadTradeScreenshotAction(tradeId, formData);
      if ("error" in result) {
        setError(result.error);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteScreenshotAction(id);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {screenshots.map((s) => (
          <div
            key={s.id}
            className="group relative size-24 overflow-hidden rounded-md border border-border"
          >
            <button
              type="button"
              className="block size-full cursor-zoom-in"
              onClick={() => setPreview(s.url)}
            >
              <Image
                src={s.url}
                alt="Trade screenshot"
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <button
                    type="button"
                    className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Delete screenshot"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this screenshot?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the image. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={pending}
                    onClick={() => handleDelete(s.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}

        {canUpload ? (
          <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:bg-muted/50">
            <ImagePlus className="size-5" />
            <span className="text-[10px]">{pending ? "Uploading…" : "Add"}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={pending}
              onChange={handleFileChange}
            />
          </label>
        ) : (
          <Link
            href="/pricing"
            className="flex size-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:bg-muted/50"
          >
            <Lock className="size-5" />
            <span className="text-center text-[10px] leading-tight">Pro feature</span>
          </Link>
        )}
      </div>

      {error && <p className="text-sm text-loss">{error}</p>}

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="sr-only">Screenshot</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="relative aspect-video w-full overflow-hidden rounded-md">
              <Image
                src={preview}
                alt="Trade screenshot"
                fill
                sizes="(max-width: 640px) 100vw, 640px"
                className="object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
