import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: 'Popup 서비스의 개인정보처리방침입니다.',
  robots: { index: false },
}

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-bold text-popup-text">
        제{num}조 {title}
      </h2>
      <div className="space-y-2 text-[15px] leading-relaxed text-popup-muted">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <article>
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-popup-text">개인정보처리방침</h1>
      <p className="mb-10 text-sm text-popup-faint">시행일: 2025년 1월 1일 &nbsp;·&nbsp; 최종 수정: 2025년 4월 1일</p>

      <p className="mb-10 text-[15px] leading-relaxed text-popup-muted">
        연주미디어(이하 "회사")는 Popup 서비스(이하 "서비스") 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 및
        관련 법령에 따라 아래와 같이 개인정보처리방침을 수립·공개합니다.
      </p>

      <Section num="1" title="수집하는 개인정보 항목">
        <p>회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집할 수 있습니다.</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>필수: 이메일 주소 (결제 및 서비스 안내 목적, 결제 시에만 수집)</li>
          <li>필수: 결제 정보 (카드사명, 마스킹된 카드번호 — 토스페이먼츠가 처리, 회사는 저장하지 않음)</li>
          <li>자동 수집: IP 주소, 브라우저 종류, 방문 일시, 서비스 이용 기록</li>
        </ul>
        <p className="mt-2 text-sm text-popup-faint">로그인 없이 서비스를 이용할 수 있으며, 이 경우 개인을 식별할 수 있는 정보를 수집하지 않습니다.</p>
      </Section>

      <Section num="2" title="개인정보 수집 및 이용 목적">
        <ul className="ml-4 list-disc space-y-1">
          <li>유료 서비스 결제 처리 및 확인</li>
          <li>서비스 이용 관련 공지 및 안내 발송</li>
          <li>서비스 품질 개선 및 통계 분석</li>
          <li>법령상 의무 이행 및 분쟁 해결</li>
        </ul>
      </Section>

      <Section num="3" title="개인정보 보유 및 이용 기간">
        <ul className="ml-4 list-disc space-y-1">
          <li>결제 관련 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
          <li>서비스 이용 기록, 접속 로그: 3개월 (통신비밀보호법)</li>
          <li>이메일 주소: 수집 목적 달성 후 즉시 파기</li>
        </ul>
        <p>이용자가 파기를 요청하는 경우 관련 법령에 따라 보존이 필요한 정보를 제외하고 즉시 파기합니다.</p>
      </Section>

      <Section num="4" title="개인정보의 제3자 제공">
        <p>
          회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>이용자가 동의한 경우</li>
          <li>법령에 의한 경우 (수사기관 요청 등)</li>
          <li>결제 처리를 위해 토스페이먼츠(주)에 최소한의 정보 제공</li>
        </ul>
        <div className="mt-3 rounded-lg border border-popup-border bg-popup-white p-4 text-sm">
          <p className="font-medium text-popup-text">토스페이먼츠 결제 대행</p>
          <p className="mt-1 text-popup-muted">제공 항목: 이메일, 주문 번호, 결제 금액</p>
          <p className="text-popup-muted">이용 목적: 결제 처리 및 사기 방지</p>
          <p className="text-popup-muted">보유 기간: 토스페이먼츠 개인정보처리방침에 따름</p>
        </div>
      </Section>

      <Section num="5" title="개인정보 처리 위탁">
        <p>회사는 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 위탁합니다.</p>
        <div className="mt-2 overflow-hidden rounded-lg border border-popup-border">
          <table className="w-full text-sm">
            <thead className="bg-popup-bg">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-popup-text">수탁업체</th>
                <th className="px-4 py-2.5 text-left font-medium text-popup-text">위탁 업무</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-popup-border bg-popup-white">
              <tr>
                <td className="px-4 py-2.5 text-popup-muted">Supabase Inc.</td>
                <td className="px-4 py-2.5 text-popup-muted">데이터베이스 및 파일 저장</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-popup-muted">Vercel Inc.</td>
                <td className="px-4 py-2.5 text-popup-muted">서버 인프라 및 서비스 호스팅</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-popup-muted">토스페이먼츠(주)</td>
                <td className="px-4 py-2.5 text-popup-muted">결제 처리</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section num="6" title="정보주체의 권리·의무">
        <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>개인정보 열람 요구</li>
          <li>오류 정정 요구</li>
          <li>삭제 요구</li>
          <li>처리 정지 요구</li>
        </ul>
        <p>위 권리 행사는 고객지원 이메일(blueslap@naver.com)로 요청하실 수 있으며, 회사는 지체 없이 조치합니다.</p>
      </Section>

      <Section num="7" title="개인정보보호 책임자">
        <div className="rounded-lg border border-popup-border bg-popup-white p-4 text-sm">
          <p><span className="font-medium text-popup-text">성명:</span> <span className="text-popup-muted">김민용</span></p>
          <p><span className="font-medium text-popup-text">소속:</span> <span className="text-popup-muted">연주미디어 대표</span></p>
          <p>
            <span className="font-medium text-popup-text">이메일:</span>{' '}
            <a href="mailto:blueslap@naver.com" className="text-popup-accent hover:underline">
              blueslap@naver.com
            </a>
          </p>
          <p><span className="font-medium text-popup-text">전화:</span> <span className="text-popup-muted">010-4298-0701</span></p>
        </div>
        <p className="mt-3 text-sm text-popup-faint">
          개인정보 침해 신고는 개인정보보호위원회(privacy.go.kr, 국번없이 182) 또는
          한국인터넷진흥원 개인정보침해신고센터(privacy.kisa.or.kr, 국번없이 118)에 문의하실 수 있습니다.
        </p>
      </Section>
    </article>
  )
}
