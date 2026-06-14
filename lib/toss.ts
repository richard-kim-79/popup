// ============================================================
// 토스페이먼츠 자동결제 (BillingKey 정기결제) — 서버 SDK 래퍼
// ============================================================

const TOSS_BASE = 'https://api.tosspayments.com/v1'

// 자동결제(빌링)는 별도 MID — TOSS_BILLING_SECRET_KEY 사용
// 일반 결제(/extend, UpgradeModal)는 기존 TOSS_SECRET_KEY 유지
function authHeader(): string {
  const key = (process.env.TOSS_BILLING_SECRET_KEY ?? process.env.TOSS_SECRET_KEY ?? '').trim()
  return 'Basic ' + Buffer.from(`${key}:`).toString('base64')
}

export interface TossError {
  code: string
  message: string
}

export interface IssuedBillingKey {
  billingKey: string
  customerKey: string
  cardCompany?: string | null
  cardNumber?: string | null
}

/**
 * authKey + customerKey → billingKey 발급
 * 토스 docs: POST /v1/billing/authorizations/issue
 */
export async function issueBillingKey(authKey: string, customerKey: string): Promise<
  | { ok: true; data: IssuedBillingKey }
  | { ok: false; error: TossError }
> {
  const res = await fetch(`${TOSS_BASE}/billing/authorizations/issue`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ authKey, customerKey }),
  })
  const json = await res.json().catch(() => ({})) as Record<string, unknown>
  if (!res.ok) {
    return {
      ok: false,
      error: {
        code: (json.code as string) ?? 'unknown',
        message: (json.message as string) ?? '빌링키 발급 실패',
      },
    }
  }
  const card = (json.card as { company?: string; number?: string } | undefined) ?? {}
  return {
    ok: true,
    data: {
      billingKey: json.billingKey as string,
      customerKey: json.customerKey as string,
      cardCompany: card.company ?? null,
      cardNumber: card.number ?? null,
    },
  }
}

export interface ChargeResult {
  paymentKey: string
  orderId: string
  status: string
  approvedAt?: string
}

/**
 * billingKey로 자동 청구
 * 토스 docs: POST /v1/billing/{billingKey}
 */
export async function chargeBilling(args: {
  billingKey: string
  customerKey: string
  orderId: string
  orderName: string
  amount: number
  customerEmail?: string
}): Promise<
  | { ok: true; data: ChargeResult }
  | { ok: false; error: TossError }
> {
  const res = await fetch(`${TOSS_BASE}/billing/${args.billingKey}`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerKey: args.customerKey,
      amount: args.amount,
      orderId: args.orderId,
      orderName: args.orderName,
      ...(args.customerEmail ? { customerEmail: args.customerEmail } : {}),
    }),
  })
  const json = await res.json().catch(() => ({})) as Record<string, unknown>
  if (!res.ok) {
    return {
      ok: false,
      error: {
        code: (json.code as string) ?? 'unknown',
        message: (json.message as string) ?? '청구 실패',
      },
    }
  }
  return {
    ok: true,
    data: {
      paymentKey: json.paymentKey as string,
      orderId: json.orderId as string,
      status: json.status as string,
      approvedAt: json.approvedAt as string | undefined,
    },
  }
}

/**
 * billingKey 삭제 (구독 해지 시 카드 정보 정리용 — 선택)
 * 토스 docs: DELETE /v1/billing/{billingKey}
 */
export async function deleteBillingKey(billingKey: string): Promise<boolean> {
  const res = await fetch(`${TOSS_BASE}/billing/${billingKey}`, {
    method: 'DELETE',
    headers: { Authorization: authHeader() },
  })
  return res.ok
}
