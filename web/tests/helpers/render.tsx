// Renders the real routes inside fresh providers, starting at `route` (jsdom tests).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ToastProvider } from '../../src/components/ui/Toast'
import { AppRoutes } from '../../src/routes'

export function renderApp(route: string, options: { advanced?: boolean } = {}) {
  try {
    if (options.advanced) localStorage.setItem('ffe.advanced', '1')
    else localStorage.removeItem('ffe.advanced')
  } catch {
    // jsdom without storage
  }
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
