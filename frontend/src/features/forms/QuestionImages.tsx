import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, ImageIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { StoredImage } from '../../lib/db';
import { MAX_IMAGES_PER_FORM } from '../../config/constants';
import { compressImage } from '../../utils/image';
import { registerDraftEditor } from '../../lib/draftSaves';
import { currentOwner } from '../../services/http';

interface QuestionImagesProps {
  images: StoredImage[];
  disabled?: boolean;
  onAdd: (blob: Blob) => Promise<boolean>;
  onRename: (id: string, name: string) => Promise<void>;
  onRemove: (id: string) => void;
}

export function QuestionImages({ images, disabled, onAdd, onRename, onRemove }: QuestionImagesProps) {
  const galleryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const names = useRef(new Map<string, string>());
  const saving = useRef<Promise<void> | null>(null);
  const uploads = useRef(new Set<Promise<void>>());
  const flushNames = useCallback(async () => {
    if (saving.current) await saving.current;
    if (!names.current.size) return;
    const task = (async () => {
      while (names.current.size) {
        for (const [id, name] of [...names.current]) {
          await onRename(id, name);
          if (names.current.get(id) === name) names.current.delete(id);
        }
      }
    })();
    saving.current = task;
    try { await task; } finally { if (saving.current === task) saving.current = null; }
  }, [onRename]);

  useEffect(() => registerDraftEditor({
    flush: async () => { await Promise.all([...uploads.current]); await flushNames(); },
    pending: () => names.current.size > 0 || uploads.current.size > 0,
  }), [flushNames]);

  const urls = useMemo(() => {
    const map: Record<string, string> = {};
    for (const img of images) map[img.id] = URL.createObjectURL(img.blob);
    return map;
  }, [images]);

  useEffect(() => {
    return () => {
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [urls]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const operation = (async () => {
      try {
        const owner = currentOwner();
        const blob = await compressImage(file);
        if (owner !== currentOwner()) throw new Error('Das Konto wurde gewechselt. Bitte das Bild erneut auswählen.');
        const added = await onAdd(blob);
        if (!added) {
          toast.warning('Limit erreicht', {
            description: `Maximal ${MAX_IMAGES_PER_FORM} Bilder pro Formular möglich.`,
          });
        }
      } catch (error) {
        toast.error('Bild konnte nicht gespeichert werden', {
          description: error instanceof Error ? error.message : 'Bitte eine gültige Bilddatei auswählen.',
        });
      }
    })();
    uploads.current.add(operation);
    try { await operation; } finally { uploads.current.delete(operation); }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          ref={galleryInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void handleFile(e.currentTarget.files?.[0]);
            e.currentTarget.value = '';
          }}
        />
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            void handleFile(e.currentTarget.files?.[0]);
            e.currentTarget.value = '';
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => galleryInput.current?.click()}
        >
          <ImageIcon className="size-4" />
          Bild
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => cameraInput.current?.click()}
        >
          <Camera className="size-4" />
          Foto
        </Button>
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <div key={img.id} className="w-[120px] space-y-1">
              <div className="relative">
                <button type="button" aria-label="Bild vergrößern" onClick={() => setZoomUrl(urls[img.id])}>
                <img
                  src={urls[img.id]}
                  alt={img.name || 'Bild'}
                  className="h-[90px] w-[120px] cursor-pointer rounded-md object-cover"
                />
                </button>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onRemove(img.id)}
                    aria-label="Bild löschen"
                    className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-md bg-destructive text-destructive-foreground"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              <Input
                className="h-8 text-xs"
                placeholder="Bezeichnung"
                aria-label="Bildbezeichnung"
                defaultValue={img.name}
                disabled={disabled}
                onChange={(e) => {
                  names.current.set(img.id, e.target.value);
                  void flushNames().catch(() => toast.error('Bildbezeichnung konnte nicht gespeichert werden. Bitte erneut versuchen.'));
                }}
              />
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!zoomUrl} onOpenChange={(o) => !o && setZoomUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">Bildvorschau</DialogTitle>
          {zoomUrl && <img src={zoomUrl} alt="Vorschau" className="max-h-[80vh] w-full object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
