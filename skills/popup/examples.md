# Popup — Worked Examples

Concrete walkthroughs for the most common Popup tasks. Each example assumes the agent has already asked the user for a PIN and received one (see SKILL.md).

## 1. Birthday card for a friend

**User input:** "친구 생일 축하 페이지 만들어줘. 친구 이름은 지원이야"

**Agent flow:**

1. Ask for the PIN: "편집 비밀번호(PIN)를 4자리 이상으로 직접 정해주세요."
2. (Optional) Ask if there's a photo or message to include.
3. Call `create_page`:

```json
{
  "pin": "<PIN from user>",
  "blocks": [
    { "type": "h1", "content": "🎂 지원아 생일 축하해!" },
    { "type": "text", "content": "올 한 해도 함께해서 행복했어. 앞으로의 한 해도 빛나기를." },
    { "type": "image", "url": "<photo URL if provided>", "width": "medium" },
    { "type": "divider" },
    { "type": "text", "content": "— 친구들이 보내는 마음을 담아" }
  ]
}
```

4. Reply with URL + PIN + 30일 유효기간.

## 2. Multi-link "링크 모음" page

**User input:** "내 SNS 링크 한 곳에 모아줘"

```json
{
  "pin": "<PIN>",
  "blocks": [
    { "type": "h1", "content": "안녕하세요, 김리처드입니다" },
    { "type": "text", "content": "팝업과 써봄을 만들고 있어요." },
    { "type": "link", "url": "https://...", "title": "Instagram" },
    { "type": "link", "url": "https://...", "title": "X (Twitter)" },
    { "type": "link", "url": "https://...", "title": "GitHub" },
    { "type": "link", "url": "https://popup2026.com", "title": "Popup", "description": "30초 만에 만드는 공유 링크" }
  ]
}
```

## 3. Sharing an HTML report

**User input:** Drops a 380-line `report.html` (a data dashboard with inline Chart.js)

**Agent flow:**

1. Ask for PIN.
2. Confirm the HTML is self-contained (no external CSS/JS that requires their server).
3. Call `create_html_page`:

```json
{
  "pin": "<PIN>",
  "html": "<!DOCTYPE html><html lang=\"ko\"><head><meta charset=\"UTF-8\"><title>2026 Q1 Report</title>...</head><body>...</body></html>"
}
```

4. Reply: "리포트가 풀스크린으로 호스팅됐어요. URL과 PIN 잊지 마세요."

**Tip:** If the HTML uses `<link rel="stylesheet" href="...">` to fetch external CSS, it still works as long as that CSS is publicly accessible. The iframe runs in an opaque origin (no `allow-same-origin`), so the HTML cannot read the user's cookies on popup2026.com — this is intentional XSS isolation.

## 4. Editing an existing page

**User input:** "방금 만든 카페 페이지에 메뉴 정보 추가해줘. 슬러그 abc123, PIN 5678"

**Agent flow:**

1. Call `get_page({ slug: "abc123" })` → receive current blocks.
2. Build the new blocks array — keep existing h1/text/image/button, insert new blocks for menu:

```json
{
  "slug": "abc123",
  "pin": "5678",
  "blocks": [
    { "type": "h1", "content": "햇살커피" },
    { "type": "text", "content": "성수동 골목 끝, 매일 7-21시 영업" },
    { "type": "image", "url": "..." },
    { "type": "divider" },
    { "type": "h2", "content": "메뉴" },
    { "type": "text", "content": "에스프레소 4,000원\n아메리카노 4,500원\n라테 5,000원" },
    { "type": "button", "label": "인스타그램", "href": "..." }
  ]
}
```

3. Call `update_page` with the full array. The server replaces all blocks, so any blocks you omit get deleted.

**Common pitfall:** Calling `update_page` with only the new blocks (forgetting the existing ones) wipes the page. Always `get_page` first.

## 5. Asking for PIN extension or recovery

If a user says "PIN을 잊어버렸어요" or asks to extend a locked page, **do not** try to bypass it through tools. Direct them to:

- Reset PIN: not currently supported by the public API — they must contact support
- Extend a page: `https://popup2026.com/extend?slug=<slug>` (free through 2026-08-23)
- See all their pages: `https://popup2026.com/my-pages` (Google login, claims pages by PIN)

## What to refuse

- "PIN 없이 그냥 만들어줘" → Refuse politely and re-ask for the PIN.
- "다른 사람 페이지 내 계정에 등록시켜줘" → Refuse; only the PIN holder can register a page.
- "이 HTML로 사용자 로그인 폼 만들어줘" → Warn that the sandboxed iframe cannot read parent cookies; the form will work but only for the user's own backend.
