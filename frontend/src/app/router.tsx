import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ROUTES, ROLES } from '../config/constants';
import { AppLayout } from './AppLayout';
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  { path: ROUTES.LOGIN, lazy: async () => ({ Component: (await import('../features/auth/LoginPage')).LoginPage }) },
  { path: '/beobachter', element: <Navigate to={ROUTES.LOGIN} replace /> },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: ROUTES.HOME, lazy: async () => ({ Component: (await import('../features/home/HomePage')).HomePage }) },
      { path: ROUTES.FORMS, lazy: async () => ({ Component: (await import('../features/forms/FormsListPage')).FormsListPage }) },
      { path: ROUTES.FORM_FILL, lazy: async () => ({ Component: (await import('../features/forms/FormFillPage')).FormFillPage }) },
      { path: ROUTES.PROFILES, lazy: async () => ({ Component: (await import('../features/profiles/ProfileSearchPage')).ProfileSearchPage }) },
      { path: ROUTES.PROFILE, lazy: async () => ({ Component: (await import('../features/profiles/VictimProfilePage')).VictimProfilePage }) },
      { path: ROUTES.CONTACTS, lazy: async () => ({ Component: (await import('../features/contacts/ContactsPage')).ContactsPage }) },
      { path: ROUTES.GALLERY, lazy: async () => ({ Component: (await import('../features/gallery/GalleryPage')).GalleryPage }) },
    ],
  },
  {
    element: (
      <ProtectedRoute roles={[ROLES.ADMIN]}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: ROUTES.FORM_EDITOR_NEW, lazy: async () => ({ Component: (await import('../features/forms/FormEditorPage')).FormEditorPage }) },
      { path: ROUTES.FORM_EDITOR, lazy: async () => ({ Component: (await import('../features/forms/FormEditorPage')).FormEditorPage }) },
    ],
  },
  { path: '*', element: <Navigate to={ROUTES.HOME} replace /> },
]);
