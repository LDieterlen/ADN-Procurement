import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ToastProvider } from './components/ui/Toast'
import { AppRoutes } from './routes'
import './styles.css'

// Local, single-user API: no retries (errors must surface at once), short staleness.
export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5_000 }, mutations: { retry: false } } })

const root = document.getElementById('root')
if (!root) throw new Error('Élément #root introuvable')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
