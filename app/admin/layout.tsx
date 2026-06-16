import Link from 'next/link'
import LogoutButton from './LogoutButton'

const NAV = [
  { href: '/admin',          label: '📊 개요' },
  { href: '/admin/growth',   label: '📈 성장' },
  { href: '/admin/pages',    label: '📄 페이지' },
  { href: '/admin/payments', label: '💳 결제' },
  { href: '/admin/reports',  label: '🚨 신고' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-popup-bg">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 flex w-52 flex-col border-r border-popup-border bg-popup-white">
        <div className="flex h-12 items-center gap-2 border-b border-popup-border px-4">
          <span className="text-base">🌿</span>
          <span className="text-sm font-bold text-popup-text">Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-popup-muted transition-colors hover:bg-popup-bg hover:text-popup-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-popup-border p-3">
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="ml-52 flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
