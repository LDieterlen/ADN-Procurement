import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { ToastProvider } from './components/ui/Toast'
import { AppRoutes } from './routes'
import './styles.css'

// Local, single-user API: no retries (errors must surface at once), short staleness.
export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5_000 }, mutations: { retry: false } } })

// A data router (one splat route around the app's <Routes>): needed by `useBlocker`, which keeps
// the article page from being left with unsaved changes (2026-10-15).
const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    ),
  },
])

const root = document.getElementById('root')
if (!root) throw new Error('Élément #root introuvable')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
