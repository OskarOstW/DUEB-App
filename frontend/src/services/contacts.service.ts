import { mediaDataUrl } from './media.service';
import { authedGet } from './http';
import { API_ENDPOINTS } from '../config/constants';
import { db } from '../lib/db';
import type { Contact, GalleryImage } from '../types';

export const contactsService = {
  async fetchContacts(): Promise<Contact[]> {
    const store = db;
    const contacts = await authedGet<Contact[]>(API_ENDPOINTS.CONTACTS);
    await store.transaction('rw', store.contacts, async () => {
      await store.contacts.clear();
      await store.contacts.bulkPut(contacts);
    });
    return contacts;
  },
  async cachedContacts(): Promise<Contact[]> {
    return db.contacts.toArray();
  },
  async fetchGalleryImages(): Promise<GalleryImage[]> {
    const store = db;
    const images = await authedGet<GalleryImage[]>(API_ENDPOINTS.GALLERY_IMAGES);
    await Promise.all(images.map(async image => {
      if (image.image_url) image.image_url = await mediaDataUrl(image.image_url);
    }));
    await store.transaction('rw', store.galleryImages, async () => {
      await store.galleryImages.clear();
      await store.galleryImages.bulkPut(images);
    });
    return images;
  },
  async cachedGalleryImages(): Promise<GalleryImage[]> {
    return db.galleryImages.toArray();
  },
};
