import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-popup-border bg-popup-bg px-6 py-10 text-center">

      {/* 정책 링크 */}
      <div className="mb-6 flex items-center justify-center gap-5 text-[13px] text-popup-muted">
        <Link href="/privacy" className="hover:text-popup-text transition-colors">
          개인정보처리방침
        </Link>
        <span className="text-popup-faint">|</span>
        <Link href="/terms" className="hover:text-popup-text transition-colors">
          이용약관
        </Link>
      </div>

      {/* 사업자 정보 */}
      <div className="mb-4 space-y-1.5 text-[12px] text-popup-faint leading-relaxed">
        <p>
          <span>상호: 연주미디어</span>
          <span className="mx-2.5">|</span>
          <span>대표자: 김민용</span>
          <span className="mx-2.5">|</span>
          <span>연락처: 010-4298-0701</span>
        </p>
        <p>
          <a
            href="https://www.ftc.go.kr/bizCommPop.do?wrkr_no=4599401364"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-popup-muted underline decoration-popup-faint underline-offset-2 transition-colors"
            title="공정위 사업자 정보확인"
          >
            사업자등록번호: 459-94-01364
          </a>
        </p>
        <p>주소: 제주특별자치도 서귀포시 대정읍 에듀시티로 148 128/403</p>
      </div>

      {/* 고객지원 */}
      <div className="mb-5 flex items-center justify-center gap-4 text-[12px] text-popup-faint">
        <span>
          <span className="mr-1 opacity-60">✉</span>
          <a href="mailto:blueslap@naver.com" className="hover:text-popup-muted transition-colors">
            blueslap@naver.com
          </a>
        </span>
        <span className="text-popup-faint/50">·</span>
        <span>평일 09:00 – 18:00</span>
      </div>

      {/* 저작권 */}
      <p className="text-[11px] text-popup-faint/70">
        © {new Date().getFullYear()} 연주미디어. All rights reserved.
      </p>
    </footer>
  )
}
