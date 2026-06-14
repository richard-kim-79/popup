'use client'

import { useEffect, useState } from 'react'
import ExpireNowModal from '@/components/Modal/ExpireNowModal'

interface Props {
  slug: string
}

/**
 * 페이지 뷰어 footer에 띄우는 "지금 만료" 보조 링크.
 *
 * localStorage에 `popup_token_${slug}`가 있는 브라우저(= 이 페이지의 편집 권한자)에게만 노출.
 * 일반 방문자에겐 보이지 않음.
 *
 * 클릭 → ExpireNowModal → 만료 후 페이지 새로고침 (만료 차단 화면으로 자연 전환)
 */
export default function ExpireNowButton({ slug }: Props) {
  const [hasToken, setHasToken] = useState(false)
  const [editToken, setEditToken] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem(`popup_token_${slug}`)
    if (token) {
      setHasToken(true)
      setEditToken(token)
    }
  }, [slug])

  if (!hasToken) return null

  return (
    <>
      <span className="text-popup-faint">·</span>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="text-xs text-popup-faint hover:text-popup-warn transition-colors"
        title="지금 만료시키기"
      >
        지금 만료
      </button>

      {showModal && (
        <ExpireNowModal
          slug={slug}
          editToken={editToken}
          onClose={() => setShowModal(false)}
          onExpired={() => {
            // 만료 후 페이지 새로고침 → 만료 차단 화면이 자동으로 보임
            window.location.reload()
          }}
        />
      )}
    </>
  )
}
