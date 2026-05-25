import Link from 'next/link'
import { getSupabaseServer } from '@/lib/supabase-server'

export default async function Nav() {
  const supabase = await getSupabaseServer()
  const { data } = await supabase.auth.getUser()
  const user = data.user
  const avatar = (user?.user_metadata?.avatar_url as string | undefined) ?? null

  return (
    <nav className="flex h-11 items-center justify-between px-7">
      <span className="text-sm font-semibold tracking-tight text-popup-text opacity-70">Popup</span>
      <div className="flex items-center gap-4">
        <Link
          href="/search"
          className="text-popup-muted transition-colors hover:text-popup-text"
          title="검색"
          aria-label="팝업 검색"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </Link>
        {user ? (
          <Link
            href="/my-pages"
            className="text-popup-muted transition-colors hover:text-popup-text"
            title="내 페이지"
            aria-label="내 페이지"
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="h-[22px] w-[22px] rounded-full object-cover" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
                <path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-popup-muted transition-colors hover:text-popup-text"
            title="로그인"
            aria-label="로그인"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </Link>
        )}
      </div>
    </nav>
  )
}
