---
name: popup
description: Create instant shareable web pages on popup2026.com — no login, 30-second setup. Use when the user wants to make a "팝업 페이지", "공유 링크", "랜딩 페이지", "이벤트 안내", "링크 모음", or upload a raw HTML file to host. Tools are reached via the Remote MCP server at https://popup2026.com/api/mcp.
---

# Popup

Popup is a Korean-first service for spinning up shareable single-page sites in seconds — no signup, no design files, no hosting setup. Pages get a short URL on `popup2026.com/<slug>`, live for 30 days by default, and can be extended (free during the current promotion through 2026-08-23).

This skill teaches an agent how to build, edit, and share Popup pages on a user's behalf without surprising them.

## When to activate

Activate when the user says any of:

- "팝업 페이지 만들어줘" · "공유 링크 만들어줘" · "랜딩 페이지" · "이벤트 페이지"
- "친구한테 보낼 페이지" · "초대장 페이지" · "링크 모음"
- "이 HTML 파일 공유 링크로 만들어줘" · "이 보고서/프레젠테이션 호스팅"
- A request that ends in "링크로 받고 싶어" / "URL만 있으면 돼"

Do **not** activate for: building a full multi-page site, anything needing a database, anything needing per-user auth (Popup is link-share, not app hosting).

## ⚠️ MANDATORY rule — ALWAYS follow before creating a page

Before calling `create_page` or `create_html_page`, you **must** ask the user to choose their own edit PIN.

Say exactly: **"편집 비밀번호(PIN)를 4자리 이상으로 직접 정해주세요. 나중에 이 번호로 페이지를 수정할 수 있어요."**

Wait for the user's reply. Use only the PIN they provide. **Never invent, guess, or auto-generate a PIN.** Never skip this step. The PIN is the user's only way to edit the page later — if you make one up, the page becomes unrecoverable.

## Tools (via MCP)

The Popup Remote MCP server at `https://popup2026.com/api/mcp` exposes:

| Tool | Purpose |
|------|---------|
| `create_page` | Create a page from structured blocks (recommended for most cases) |
| `create_html_page` | Host a complete raw HTML file as-is, fullscreen iframe |
| `get_page` | Read an existing page's blocks by slug |
| `update_page` | Replace a page's blocks (needs the PIN) |
| `list_templates` | List available templates |

All write tools require the user-chosen PIN. `update_page` re-verifies the PIN server-side.

## Block-based pages (`create_page`)

Combine these block types in order. Each block gets an auto-generated `id` server-side.

| Block | Required fields | Optional |
|-------|----------------|----------|
| `h1` | `content` | — |
| `h2` | `content` | — |
| `text` | `content` | — |
| `image` | `url` | `width` (small/medium/full) |
| `button` | `label`, `href` | `color` (hex) |
| `youtube` | `videoId` | `width` |
| `link` | `url`, `title` | `description` |
| `divider` | — | — |

**Composition heuristics:**

- Lead with a single `h1` — it becomes the OG title and SEO title.
- Follow with a `text` block — it becomes the OG description.
- Visuals (image / youtube) come early to anchor the eye.
- Put CTAs (`button`) near the bottom, one or two max.
- A `divider` between sections is cleaner than three blank `text` blocks.

## Raw HTML pages (`create_html_page`)

Use when the user provides complete HTML — presentations, reports, custom visualizations, single-file demos. Max **500 KB**. Rendered fullscreen in a sandboxed iframe (no `allow-same-origin`, so the HTML cannot escape into the parent page).

Include a real `<title>` and `<meta name="description">` in the HTML — they become the social preview title/description automatically. If you skip them, the OG card will fall back to just "HTML 페이지" with no description.

Do **not** use `create_html_page` for content the user described in natural language — convert that into blocks via `create_page` instead. `create_html_page` is for when the user hands you actual HTML.

## Examples

### 1. 카페 소개 페이지

```
User: "동네 카페 새로 열었어. 페이지 만들어줘"
Agent: "어떤 카페예요? 가게 이름, 위치, 영업시간, 인스타 링크가 있으면 알려주세요.
        그리고 편집 비밀번호(PIN)를 4자리 이상으로 직접 정해주세요."

→ create_page with:
   - h1: "햇살커피"
   - text: "성수동 골목 끝, 매일 7-21시 영업"
   - image: 가게 사진
   - button: { label: "인스타그램", href: "https://instagram.com/..." }
```

### 2. 행사 초대장

```
User: "다음 주 토요일 집들이 초대장 만들어줘"

→ create_page with:
   - h1: "집들이에 초대합니다 🎉"
   - text: "11월 8일 토요일 저녁 7시, 강남구 …"
   - image: 약도 이미지
   - button: { label: "참석 응답하기", href: "https://forms.gle/..." }
```

### 3. HTML 페이지 호스팅

```
User: <한 파일짜리 HTML 첨부> "이거 공유 링크로 만들어줘"
Agent: "편집 비밀번호(PIN)를 4자리 이상으로 정해주세요. 나중에 수정/삭제할 때 필요해요."

→ create_html_page with the user's HTML + PIN
→ Return the URL and remind them of the PIN.
```

## Editing existing pages

To modify a page, the user must already have the PIN.

1. Use `get_page` to fetch current blocks (slug only).
2. Modify the blocks array minimally — preserve unrelated blocks.
3. Call `update_page` with the slug, PIN, and full new blocks array.

Never delete blocks the user didn't explicitly mention removing.

## Lifetime and extension

- Pages live for **30 days** by default.
- After expiry, the page shows a lock screen instead of content.
- During the current promo (through **2026-08-23**), extension is free — direct users to `popup2026.com/extend` or `popup2026.com/my-pages` if they ask about extending.

## After-action checklist

After successfully creating a page, always tell the user:

1. The **URL** (`popup2026.com/<slug>`)
2. The **PIN** they chose (so they remember)
3. The **expiration date** (30 days from now)
4. Optional: a one-line summary of what's on the page

Do not call additional tools unless the user asks for changes.

## What this skill does NOT do

- It does not create user accounts. Popup is intentionally login-free.
- It does not handle file uploads larger than 50 MB (images) or 500 KB (HTML).
- It does not modify pages without a valid PIN — no exceptions, no admin override available to agents.
- It does not delete pages — there is no `delete_page` tool; pages soft-expire after 30 days.

## Site URL

- App: https://popup2026.com
- MCP: https://popup2026.com/api/mcp
- My pages: https://popup2026.com/my-pages (Google login optional, used to group pages by account)
