import { LayoutDashboard, ClipboardList, Stethoscope, Contact, Images } from 'lucide-react';
import type { ComponentType } from 'react';
import { ROUTES } from '../config/constants';
import type { Session } from '../types';
import { canSeeProfiles } from '../lib/access';

export interface NavItem {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  to: string;
}

/** Primäre Navigation (Sidebar + Bottom-Tabs). */
export const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Dashboard', icon: LayoutDashboard, to: ROUTES.HOME },
  { key: 'forms', label: 'Formulare', icon: ClipboardList, to: ROUTES.FORMS },
  { key: 'profiles', label: 'Profile', icon: Stethoscope, to: ROUTES.PROFILES },
  { key: 'contacts', label: 'Kontakte', icon: Contact, to: ROUTES.CONTACTS },
  { key: 'gallery', label: 'Galerie', icon: Images, to: ROUTES.GALLERY },
];

/** Navigationseintraege gefiltert nach den Rechten der aktuellen Sitzung
 *  (Beobachter ohne Profil-Recht sehen den Profile-Tab nicht). */
export function visibleNavItems(session: Session | null): NavItem[] {
  return NAV_ITEMS.filter((item) => item.key !== 'profiles' || canSeeProfiles(session));
}
