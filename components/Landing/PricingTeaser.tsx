import Link from 'next/link'

// 가격 정보: 딱 한 줄, 클릭하면 연장 결제 페이지로
export default function PricingTeaser() {
  return (
    <div className="py-[140px] text-center">
      <Link
        href="/extend"
        className="text-[13px] text-popup-faint underline-offset-[3px] transition-colors hover:text-popup-muted hover:underline"
      >
        30일 이후 연장 · 1개월 1,000원 &nbsp;/&nbsp; 1년 10,000원
      </Link>
    </div>
  )
}
