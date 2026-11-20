import { createBrowserRouter, Navigate } from 'react-router';
import { site } from '@/config/site';
import { LangLayout } from '@/i18n/LangLayout';
import Home from '@/pages/Home';
import NotFound from '@/pages/NotFound';

/**
 * /            → /{defaultLang}
 * /:lang       → Home (ar | en)
 * /:lang/privacy (Phase 4)
 */
export const router = createBrowserRouter([
  { path: '/', element: <Navigate to={`/${site.defaultLang}`} replace /> },
  {
    path: '/:lang',
    element: <LangLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
