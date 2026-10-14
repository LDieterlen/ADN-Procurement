// Shell: a 56 px top bar (brand mark, links with an inset underline when active), the page below.
import { NavLink, Outlet } from 'react-router'
import { useHealth } from '../api/queries/health'

const LINKS: { to: string; label: string }[] = [
  { to: '/', label: 'Projets' },
  { to: '/clients', label: 'Clients' },
  { to: '/suppliers', label: 'Fournisseurs' },
  { to: '/professionals', label: 'Professionnels' },
  { to: '/categories', label: 'Listes' },
  { to: '/settings', label: 'Réglages' },
]

export function Layout() {
  const health = useHealth()
  const isDev = health.data?.isDevDb === true
  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-9 px-10">
          <NavLink to="/" className="flex items-center gap-2 text-[15px] font-semibold text-ink hover:text-ink">
            <span className="inline-block h-[18px] w-[18px] rounded-[4px] bg-accent" aria-hidden="true" />
            FF&amp;E
          </NavLink>
          <nav className="flex h-full flex-1 items-stretch" aria-label="Navigation principale">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `flex items-center px-3 text-sm transition-colors ${isActive ? 'font-medium text-ink shadow-[inset_0_-2px_0_var(--color-accent)]' : 'text-ink-2 hover:text-ink'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          {isDev && <span className="rounded-[4px] bg-warn-soft px-2 py-[3px] text-[11.5px] font-medium text-warn">base de dev</span>}
          {health.isError && (
            <NavLink to="/health" className="text-xs font-medium text-danger">
              API injoignable
            </NavLink>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-10 pt-7 pb-12">
        <Outlet />
      </main>
    </div>
  )
}
