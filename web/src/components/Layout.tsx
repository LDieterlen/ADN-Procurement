// Shell: sidebar navigation, « BASE DE DEV » badge from /health, page outlet.
import { NavLink, Outlet } from 'react-router'
import { useHealth } from '../api/queries/health'

const LINKS = [
  { to: '/', label: 'Tableau de bord' },
  { to: '/projects', label: 'Projets' },
  { to: '/clients', label: 'Clients' },
  { to: '/products', label: 'Produits' },
  { to: '/suppliers', label: 'Fournisseurs' },
  { to: '/manufacturers', label: 'Fabricants' },
  { to: '/categories', label: 'Catégories' },
  { to: '/settings', label: 'Réglages' },
  { to: '/health', label: 'Santé' },
]

export function Layout() {
  const health = useHealth()
  const isDev = health.data?.isDevDb === true
  return (
    <div className="flex min-h-screen bg-neutral-50 font-sans text-neutral-900">
      <aside className="flex w-52 flex-col border-r border-neutral-200 bg-white">
        <div className="px-4 py-4">
          <span className="text-lg font-semibold">FFE</span>
          {isDev && <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">BASE DE DEV</span>}
        </div>
        <nav className="flex flex-col gap-0.5 px-2" aria-label="Navigation principale">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => `rounded px-2 py-1.5 text-sm ${isActive ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        {health.isError && <p className="mt-auto px-4 py-3 text-xs text-red-700">API injoignable</p>}
      </aside>
      <main className="flex-1 px-8 py-6">
        <Outlet />
      </main>
    </div>
  )
}
