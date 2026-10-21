import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, CompanyGuard } from '../features/auth/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { AuthPage } from '../pages/auth/AuthPage';
import { CompanyPage } from '../pages/empresa/CompanyPage';
import { CampusEntry } from '../pages/estacionamentos/HomePage';
import { Button, EmptyState, Loading } from '../components/ui';

// Bibliotecas de mapa, canvas e gráficos só carregam quando a tela precisa delas.
const LotsPage = lazy(() =>
  import('../pages/estacionamentos/LotsPage').then((m) => ({ default: m.LotsPage })),
);
const LotDetailPage = lazy(() =>
  import('../pages/estacionamentos/LotDetailPage').then((m) => ({ default: m.LotDetailPage })),
);
const DashboardPage = lazy(() =>
  import('../pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ManagementPage = lazy(() =>
  import('../pages/admin/ManagementPage').then((m) => ({ default: m.ManagementPage })),
);
const EditorPage = lazy(() =>
  import('../pages/editor/EditorPage').then((m) => ({ default: m.EditorPage })),
);

const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000, refetchOnWindowFocus: true } },
});
const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <AuthRoot />
      </AuthProvider>
    ),
    errorElement: (
      <EmptyState
        title="Algo saiu do esperado"
        description="Recarregue a página para tentar novamente."
      >
        <Button onClick={() => window.location.assign('/')}>Voltar ao início</Button>
      </EmptyState>
    ),
    children: [
      { path: '/', element: <CampusEntry /> },
      { path: '/entrar', element: <AuthPage /> },
      { path: '/login', element: <Navigate to="/entrar" replace /> },
      { path: '/cadastrar-empresa', element: <AuthPage register /> },
      { path: '/cadastro', element: <Navigate to="/cadastrar-empresa" replace /> },
      { path: '/estacionamentos', element: <Navigate to="/" replace /> },
      {
        element: <AppLayout />,
        children: [
          { path: '/c/:campusSlug', element: <LotsPage /> },
          { path: '/c/:campusSlug/:id', element: <LotDetailPage /> },
          {
            element: <CompanyGuard />,
            children: [
              { path: '/empresa', element: <CompanyPage /> },
              { path: '/perfil', element: <Navigate to="/empresa" replace /> },
              { path: '/admin', element: <DashboardPage /> },
              { path: '/admin/consulta/:id', element: <LotDetailPage /> },
              {
                path: '/admin/estacionamentos',
                element: <ManagementPage key="estacionamentos" resource="estacionamentos" />,
              },
              {
                path: '/admin/sensores',
                element: <ManagementPage key="sensores" resource="sensores" />,
              },
              { path: '/admin/editor', element: <EditorPage /> },
              { path: '/admin/editor/:id', element: <EditorPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
function AuthRoot() {
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
    </>
  );
}
export function App() {
  return (
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
      <Toaster theme="system" richColors containerAriaLabel="Notificações" position="top-right" />
    </QueryClientProvider>
  );
}
