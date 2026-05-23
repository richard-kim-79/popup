import Link from 'next/link'
import { isFreeExtensionPeriod, PROMO_HEADLINE } from '@/lib/promo'

// 가격 정보: 딱 한 줄, 클릭하면 연장 결제 페이지로
export default function PricingTeaser() {
  const promo = isFreeExtensionPeriod()
  return (
    <div className="py-[140px] text-center">
      <Link
        href="/extend"
        className={
          promo
            ? 'text-[13px] font-medium text-popup-accent underline-offset-[3px] transition-colors hover:underline'
            : 'text-[13px] text-popup-faint underline-offset-[3px] transition-colors hover:text-popup-muted hover:underline'
        }
      >
        {promo ? PROMO_HEADLINE : (
          <>30일 이후 연장 · 1개월 1,000원 &nbsp;/&nbsp; 1년 10,000원</>
        )}
      </Link>
    </div>
  )
}
