import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { db } from '../../lib/db';
import { useGalleryImages } from '../home/queries';
import { resolveMediaUrl } from '../../utils/image';
import type { GalleryImage } from '../../types';

export function GalleryPage() {
  useGalleryImages();
  const images = useLiveQuery(() => db.galleryImages.toArray(), [], undefined);
  const [active, setActive] = useState<GalleryImage | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader title="Galerie" subtitle="Bildmaterial zur Übung" />

      {images && images.length === 0 ? (
        <EmptyState
          icon={<ImageIcon />}
          title="Keine Bilder"
          description="Es sind keine Galerie-Bilder verfügbar."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {(images ?? []).map((img) => {
            const src = resolveMediaUrl(img.image_url);
            return (
              <button
                key={img.id}
                type="button"
                disabled={!src}
                onClick={() => src && setActive(img)}
                className="overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-shadow hover:shadow-md disabled:cursor-default"
              >
                {src ? (
                  <img
                    src={src}
                    alt={img.description || 'Galerie-Bild'}
                    className="h-36 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-36 w-full items-center justify-center bg-secondary text-muted-foreground">
                    <ImageIcon className="size-6" />
                  </div>
                )}
                {img.description && (
                  <p className="line-clamp-2 px-2 py-1.5 text-xs text-muted-foreground">
                    {img.description}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{active?.description || 'Galerie'}</DialogTitle>
          </DialogHeader>
          {active && (
            <img
              src={resolveMediaUrl(active.image_url)}
              alt={active.description || 'Galerie-Bild'}
              className="max-h-[75vh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
