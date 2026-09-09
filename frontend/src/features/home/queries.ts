import { useQuery } from '@tanstack/react-query';
import { formsService } from '../../services/forms.service';
import { profilesService } from '../../services/profiles.service';
import { contactsService } from '../../services/contacts.service';

export const queryKeys = {
  forms: ['forms'] as const,
  scenarioVictims: ['scenarioVictims'] as const,
  contacts: ['contacts'] as const,
  galleryImages: ['galleryImages'] as const,
};

/**
 * Diese Queries aktualisieren die Dexie-Snapshots im Hintergrund.
 * Die UI liest die Zähler/Listen offline-first via useLiveQuery aus Dexie,
 * sodass ein fehlgeschlagenes Refetch (offline) die Anzeige nicht leert.
 */

export function useForms() {
  return useQuery({ queryKey: queryKeys.forms, queryFn: formsService.fetchForms });
}

export function useScenarioVictims() {
  return useQuery({ queryKey: queryKeys.scenarioVictims, queryFn: profilesService.fetchScenarioVictims });
}

export function useContacts() {
  return useQuery({ queryKey: queryKeys.contacts, queryFn: contactsService.fetchContacts });
}

export function useGalleryImages() {
  return useQuery({
    queryKey: queryKeys.galleryImages,
    queryFn: contactsService.fetchGalleryImages,
    retry: false,
  });
}
