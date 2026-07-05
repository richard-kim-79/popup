/**
 * ClaudeSection — Landing page section explaining Popup × Claude MCP integration
 */
const MCP_URL = 'https://popup2026.com/api/mcp'

const STEPS = [
  { label: 'Claude.ai 접속', desc: '설정 → 통합(Integrations) 메뉴를 엽니다' },
  { label: 'URL 추가 · 연결', desc: `${MCP_URL} 추가 → 구글 로그인 한 번` },
  { label: '대화로 페이지 제작', desc: '"카페 소개 페이지 만들어줘"처럼 말하면 즉시 완성' },
]

export default function ClaudeSection() {
  return (
    <section className="border-t border-popup-border bg-popup-white py-20 px-6">
      <div className="mx-auto max-w-2xl text-center">

        {/* 배지 */}
        <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-popup-border bg-popup-bg px-3 py-1 text-xs font-medium text-popup-muted">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Claude MCP 연동
        </span>

        <h2 className="mb-3 text-2xl font-bold tracking-tight text-popup-text sm:text-3xl">
          Claude에서 바로 만드세요
        </h2>
        <p className="mb-10 text-base text-popup-muted">
          Claude.ai에 URL 하나 추가하고 구글 로그인하면, 대화만으로 Popup 페이지를 만들어 공유하고
          내 계정에 자동 저장돼요. 별도 PIN 없이 <span className="whitespace-nowrap">/my-pages</span>에서 관리·수정합니다.
        </p>

        {/* URL 복사 박스 */}
        <div className="mb-10 flex items-center gap-2 rounded-xl border border-popup-border bg-popup-bg p-3 text-left">
          <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-sm text-popup-text">
            {MCP_URL}
          </code>
          <a
            href="https://claude.ai/settings/integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg bg-popup-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-popup-accentHover transition-colors"
          >
            연결하기 →
          </a>
        </div>

        {/* 3단계 */}
        <ol className="flex flex-col gap-4 text-left sm:flex-row">
          {STEPS.map((step, i) => (
            <li key={i} className="flex flex-1 gap-3 rounded-xl border border-popup-border bg-popup-bg p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-popup-accent text-xs font-bold text-white">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-popup-text">{step.label}</p>
                <p className="mt-0.5 text-xs text-popup-muted">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* 예시 대화 */}
        <div className="mt-10 rounded-xl border border-popup-border bg-popup-bg p-5 text-left">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-popup-faint">
            예시 대화
          </p>
          <div className="space-y-2">
            {[
              { who: '나', text: '우리 카페 오픈 소식 페이지 만들어줘. 위치는 강남역 3번 출구' },
              { who: 'Claude', text: '✅ 페이지가 생성됐습니다! 🔗 popup2026.com/abc123 · 내 페이지에 자동 저장돼요' },
              { who: '나', text: '사진이랑 예약 버튼도 추가해줘' },
              { who: 'Claude', text: '✅ 업데이트 완료! 이미지와 네이버 예약 버튼을 추가했습니다.' },
            ].map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.who === 'Claude' ? 'justify-end' : ''}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                  msg.who === 'Claude'
                    ? 'bg-popup-accent text-white'
                    : 'bg-popup-white border border-popup-border text-popup-text'
                }`}>
                  <span className="font-medium">{msg.who}: </span>{msg.text}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
