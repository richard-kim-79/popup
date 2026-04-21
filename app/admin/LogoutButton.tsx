'use client'

import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.replace('/admin/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full rounded-lg px-3 py-2 text-left text-sm text-popup-faint transition-colors hover:bg-popup-bg hover:text-popup-muted"
    >
      로그아웃
    </button>
  )
}
