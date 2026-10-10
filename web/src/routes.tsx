import { Navigate, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { HealthPage } from './pages/HealthPage'
import { ClientEditPage } from './pages/clients/ClientEditPage'
import { ClientsPage } from './pages/clients/ClientsPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/clients" replace />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/new" element={<ClientEditPage />} />
        <Route path="/clients/:id" element={<ClientEditPage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="*" element={<p className="text-neutral-600">Page introuvable.</p>} />
      </Route>
    </Routes>
  )
}
