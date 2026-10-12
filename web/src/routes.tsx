import { Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { HealthPage } from './pages/HealthPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { CategoriesPage } from './pages/categories/CategoriesPage'
import { CategoryEditPage } from './pages/categories/CategoryEditPage'
import { ClientEditPage } from './pages/clients/ClientEditPage'
import { ClientsPage } from './pages/clients/ClientsPage'
import { ManufacturerEditPage } from './pages/manufacturers/ManufacturerEditPage'
import { ManufacturersPage } from './pages/manufacturers/ManufacturersPage'
import { ProductEditPage } from './pages/products/ProductEditPage'
import { ProductsPage } from './pages/products/ProductsPage'
import { BudgetPage } from './pages/projects/BudgetPage'
import { ItemPage } from './pages/projects/ItemPage'
import { ProjectEditPage } from './pages/projects/ProjectEditPage'
import { ProjectPage } from './pages/projects/ProjectPage'
import { ProjectsPage } from './pages/projects/ProjectsPage'
import { SupplierEditPage } from './pages/suppliers/SupplierEditPage'
import { SuppliersPage } from './pages/suppliers/SuppliersPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ProjectsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/new" element={<ProjectEditPage />} />
        <Route path="/projects/:id" element={<ProjectPage />} />
        <Route path="/projects/:id/edit" element={<ProjectEditPage />} />
        <Route path="/projects/:id/budget" element={<BudgetPage />} />
        <Route path="/projects/:id/items/:itemId" element={<ItemPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/new" element={<ClientEditPage />} />
        <Route path="/clients/:id" element={<ClientEditPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/suppliers/new" element={<SupplierEditPage />} />
        <Route path="/suppliers/:id" element={<SupplierEditPage />} />
        <Route path="/manufacturers" element={<ManufacturersPage />} />
        <Route path="/manufacturers/new" element={<ManufacturerEditPage />} />
        <Route path="/manufacturers/:id" element={<ManufacturerEditPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/new" element={<ProductEditPage />} />
        <Route path="/products/:id" element={<ProductEditPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/categories/new" element={<CategoryEditPage />} />
        <Route path="/categories/:id" element={<CategoryEditPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="*" element={<p className="text-neutral-600">Page introuvable.</p>} />
      </Route>
    </Routes>
  )
}
