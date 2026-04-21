import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '이용약관',
  description: 'Popup 서비스 이용약관입니다.',
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

export default function TermsPage() {
  return (
    <article>
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-popup-text">이용약관</h1>
      <p className="mb-10 text-sm text-popup-faint">시행일: 2025년 1월 1일 &nbsp;·&nbsp; 최종 수정: 2025년 4월 1일</p>

      <Section num="1" title="목적">
        <p>
          이 약관은 연주미디어(이하 "회사")가 운영하는 Popup 서비스(이하 "서비스")의 이용 조건 및 절차,
          회사와 이용자의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
        </p>
      </Section>

      <Section num="2" title="용어의 정의">
        <ul className="ml-4 list-disc space-y-1">
          <li><strong className="font-medium text-popup-text">서비스</strong>: 회사가 제공하는 웹페이지 생성·공유 플랫폼 "Popup" 및 관련 제반 서비스</li>
          <li><strong className="font-medium text-popup-text">이용자</strong>: 이 약관에 동의하고 서비스를 이용하는 자</li>
          <li><strong className="font-medium text-popup-text">페이지</strong>: 이용자가 서비스를 통해 생성한 웹페이지 콘텐츠</li>
          <li><strong className="font-medium text-popup-text">PIN</strong>: 이용자가 페이지 편집 권한을 보호하기 위해 설정하는 비밀번호</li>
          <li><strong className="font-medium text-popup-text">유료 플랜</strong>: 페이지 유효기간 연장을 위해 결제가 필요한 서비스</li>
        </ul>
      </Section>

      <Section num="3" title="서비스의 제공">
        <p>회사는 다음과 같은 서비스를 제공합니다.</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>로그인 없이 즉시 웹페이지를 생성하고 고유 링크로 공유하는 기능</li>
          <li>텍스트, 이미지, 동영상, 버튼 등 다양한 블록 기반 콘텐츠 편집 기능</li>
          <li>PIN을 통한 페이지 편집 권한 보호</li>
          <li>페이지 유효기간 연장을 위한 유료 플랜</li>
        </ul>
        <p>무료로 생성된 페이지는 생성일로부터 30일 후 잠금 처리되며, 유료 플랜을 통해 연장할 수 있습니다.</p>
      </Section>

      <Section num="4" title="서비스 이용 제한 (금지행위)">
        <p>이용자는 다음 행위를 해서는 안 됩니다.</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>타인의 개인정보·저작물을 무단으로 수집하거나 게시하는 행위</li>
          <li>불법 정보, 음란물, 폭력적 콘텐츠, 혐오 표현 등을 게시하는 행위</li>
          <li>피싱·사기 목적의 페이지를 생성하는 행위</li>
          <li>서비스의 정상적인 운영을 방해하는 행위 (DDoS, 자동화 스크래핑 등)</li>
          <li>회사의 사전 동의 없이 서비스를 상업적으로 재판매하는 행위</li>
          <li>관련 법령 또는 이 약관을 위반하는 행위</li>
        </ul>
        <p>위반 시 회사는 사전 통보 없이 해당 페이지를 삭제하거나 서비스 이용을 제한할 수 있습니다.</p>
      </Section>

      <Section num="5" title="유료 서비스 및 결제">
        <ul className="ml-4 list-disc space-y-1">
          <li>유료 플랜: 1개월 1,000원 / 1년 10,000원 (부가세 포함)</li>
          <li>결제 수단: 신용카드, 체크카드 (토스페이먼츠를 통해 처리)</li>
          <li>결제 완료 시 페이지 유효기간이 즉시 연장됩니다.</li>
          <li>자동 갱신 없이 1회성 결제로 운영됩니다.</li>
        </ul>
      </Section>

      <Section num="6" title="환불 정책">
        <ul className="ml-4 list-disc space-y-1">
          <li>결제일로부터 7일 이내, 연장된 기간을 사용하지 않은 경우 전액 환불됩니다.</li>
          <li>7일 경과 후 또는 서비스를 이용한 경우에는 환불이 제한될 수 있습니다.</li>
          <li>환불 요청은 고객지원 이메일(blueslap@naver.com)로 접수해 주세요.</li>
          <li>환불 처리는 요청일로부터 영업일 기준 3~5일 소요됩니다.</li>
        </ul>
        <div className="mt-3 rounded-lg border border-popup-warn-border bg-popup-warn-bg px-4 py-3 text-sm text-popup-warn">
          전자상거래 등에서의 소비자보호에 관한 법률 제17조에 따라, 디지털 콘텐츠의 특성상 즉시 사용 가능한
          서비스는 청약철회가 제한될 수 있습니다.
        </div>
      </Section>

      <Section num="7" title="콘텐츠 소유권 및 책임">
        <ul className="ml-4 list-disc space-y-1">
          <li>이용자가 생성한 페이지의 콘텐츠에 대한 저작권은 이용자에게 있습니다.</li>
          <li>이용자는 게시한 콘텐츠가 제3자의 권리를 침해하지 않음을 보증합니다.</li>
          <li>회사는 서비스 운영·홍보를 위해 이용자 콘텐츠를 최소한으로 활용할 수 있으며, 이용자는 이에 동의합니다.</li>
          <li>콘텐츠로 인한 법적 분쟁의 책임은 해당 이용자에게 있습니다.</li>
        </ul>
      </Section>

      <Section num="8" title="서비스 중단 및 변경">
        <ul className="ml-4 list-disc space-y-1">
          <li>회사는 시스템 점검, 장비 교체, 천재지변 등의 사유로 서비스를 일시 중단할 수 있습니다.</li>
          <li>서비스 중단 시 사전 공지를 원칙으로 하나, 긴급한 경우 사후 공지할 수 있습니다.</li>
          <li>회사는 서비스 내용 및 요금을 변경할 수 있으며, 변경 30일 전 공지합니다.</li>
        </ul>
      </Section>

      <Section num="9" title="면책조항">
        <ul className="ml-4 list-disc space-y-1">
          <li>회사는 이용자가 서비스를 이용하여 기대하는 이익을 얻지 못하거나 손실이 발생한 경우 책임을 지지 않습니다.</li>
          <li>회사는 이용자가 서비스에 게시한 정보, 자료, 사실의 신뢰도 및 정확성에 대한 책임을 지지 않습니다.</li>
          <li>회사의 귀책 사유 없는 네트워크 장애, 천재지변 등으로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
        </ul>
      </Section>

      <Section num="10" title="분쟁해결 및 관할법원">
        <ul className="ml-4 list-disc space-y-1">
          <li>이 약관에 관한 분쟁은 대한민국 법률에 따라 해석됩니다.</li>
          <li>서비스 이용과 관련하여 분쟁이 발생한 경우, 양 당사자는 협의를 통해 우선 해결하도록 합니다.</li>
          <li>협의가 이루어지지 않을 경우, 「민사소송법」상의 관할 법원에 소를 제기할 수 있습니다.</li>
          <li>회사의 본사 소재지 관할 법원: 제주지방법원</li>
        </ul>
      </Section>

      <div className="mt-4 rounded-lg border border-popup-border bg-popup-white p-5 text-sm text-popup-muted">
        <p className="font-medium text-popup-text">부칙</p>
        <p className="mt-1">이 약관은 2025년 1월 1일부터 시행됩니다.</p>
        <p>문의: <a href="mailto:blueslap@naver.com" className="text-popup-accent hover:underline">blueslap@naver.com</a></p>
      </div>
    </article>
  )
}
