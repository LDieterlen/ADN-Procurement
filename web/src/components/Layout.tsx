// Shell (ADR-0013): a thin top bar with the brand and the catalogue links, the page below.
import { NavLink, Outlet } from 'react-router'
import { useHealth } from '../api/queries/health'

const LINKS: { to: string; label: string }[] = [
  { to: '/', label: 'Projets' },
  { to: '/clients', label: 'Clients' },
  { to: '/suppliers', label: 'Fournisseurs' },
  { to: '/professionals', label: 'Professionnels' },
  { to: '/categories', label: 'Types' },
  { to: '/settings', label: 'Réglages' },
]

export function Layout() {
  const health = useHealth()
  const isDev = health.data?.isDevDb === true
  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-3">
          <NavLink to="/" className="text-base font-semibold tracking-tight">
            FF&amp;E
          </NavLink>
          <nav className="flex flex-1 items-center gap-5" aria-label="Navigation principale">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) => `text-sm ${isActive ? 'font-semibold text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'}`}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          {isDev && <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">base de dev</span>}
          {health.isError && (
            <NavLink to="/health" className="text-xs text-red-700">
              API injoignable
            </NavLink>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
