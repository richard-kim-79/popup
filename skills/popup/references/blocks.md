# Popup block schema (for `create_page` / `update_page`)

A block page is an **ordered array of blocks**. Each block is `{ "type": ..., ...fields }`.
The first `h1` becomes the page title and link-preview title, so always lead with one.

## Block types & fields

| type | fields | notes |
|------|--------|-------|
| `h1` | `content` | big title — put one first |
| `h2` | `content` | section subtitle |
| `text` | `content` | body paragraph; use multiple for spacing |
| `image` | `url`, `width?` | absolute https URL; `width`: `small` \| `medium` \| `full` |
| `button` | `label`, `href`, `color?` | CTA; `color` = hex like `#2A6049` |
| `link` | `url`, `title?`, `description?`, `width?` | link preview card |
| `youtube` | `videoId`, `width?` | the YouTube video ID only (not full URL) |
| `divider` | — | horizontal rule |

`width` (where supported): `small`, `medium`, `full` (default `full`).

## Guidelines

- **Lead with `h1`.** It's the title + share-preview headline.
- Keep it scannable: `h1` → `text` → `image`/`button`/`link` as needed.
- Images and link/button targets must be absolute `https://` URLs.
- For a "link in bio", stack several `link` blocks (each a card) under an `h1`.
- For an invite/landing, `h1` + `text`(intro) + `button`(RSVP/apply) is usually enough.

## Example: event invite

```json
[
  { "type": "h1", "content": "북클럽 6월 모임" },
  { "type": "text", "content": "이번 달 책은 《엔트로피》. 같이 읽고 이야기해요." },
  { "type": "text", "content": "6월 28일 토 오후 3시 · 합정 모처" },
  { "type": "button", "label": "참석 신청", "href": "https://forms.gle/xxxx", "color": "#2A6049" }
]
```

## Example: link in bio

```json
[
  { "type": "h1", "content": "@studio_minyong" },
  { "type": "link", "url": "https://instagram.com/...", "title": "Instagram" },
  { "type": "link", "url": "https://youtube.com/...", "title": "YouTube" },
  { "type": "link", "url": "https://shop.example.com", "title": "스토어" }
]
```

## Editing an existing block page

1. `get_page` with the slug to read current blocks.
2. Build the new full blocks array (it's a full replace, not a patch).
3. `update_page` with the slug + new blocks.

HTML pages (`create_html_page`) are **not** block-editable — to change one, publish a new
HTML page.
