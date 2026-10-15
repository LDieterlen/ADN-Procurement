// Renders the real routes inside fresh providers, starting at `route` (jsdom tests).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { ToastProvider } from '../../src/components/ui/Toast'
import { AppRoutes } from '../../src/routes'

export function renderApp(route: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } } })
  // Same data router as `main.tsx` (a splat route around <AppRoutes>), in memory.
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        ),
      },
    ],
    { initialEntries: [route] },
  )
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}
