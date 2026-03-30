interface HeroProps {
  onStart: () => void
}

export default function Hero({ onStart }: HeroProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 pb-20 pt-16 text-center">

      {/* 헤드라인: 딱 한 줄 아이디어 */}
      <h1 className="mb-4 max-w-md text-[2.6rem] font-bold leading-[1.18] tracking-[-0.04em] text-popup-text">
        링크 하나로<br />
        웹페이지를 공유해요
      </h1>

      {/* 서브: 세 단어로 끝 */}
      <p className="mb-10 text-base text-popup-muted">
        로그인 없이 &nbsp;·&nbsp; 30일 무료 &nbsp;·&nbsp; PIN 보호
      </p>

      {/* 단 하나의 CTA */}
      <button
        onClick={onStart}
        className="rounded-xl bg-popup-accent px-10 py-3.5 text-[15px] font-medium text-white hover:bg-popup-accent-hover active:scale-[.98]"
      >
        새 페이지 만들기
      </button>

    </div>
  )
}
