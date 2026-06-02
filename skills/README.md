# Popup Skills

AI agent skills for working with [Popup](https://popup2026.com) — the 30-second shareable-page service.

Each skill is a self-contained folder with a `SKILL.md` that follows the [Agent Skills](https://agentskills.io) convention. Compatible with **Claude Code**, **Codex CLI**, **Gemini CLI**, **Cursor**, and any other agent that loads SKILL.md-style skills.

## Skills included

| Skill | What it does |
|-------|-------------|
| [`popup`](./popup) | Create, edit, and host pages on popup2026.com via the Remote MCP server |

## Quick install

### Claude Code

Copy or symlink the `skills/` directory into your `.claude/skills/`:

```bash
ln -s "$(pwd)/skills/popup" ~/.claude/skills/popup
```

Then add the MCP server (or copy `.mcp.json` into your project root):

```bash
claude mcp add popup https://popup2026.com/api/mcp
```

### Codex CLI

Place `popup/` under `.agents/skills/popup` in your project (Codex auto-discovers).

### Gemini CLI

Add the skill via:

```bash
gemini extension install ./skills/popup
```

### Cursor

Cursor reads SKILL.md from `~/.cursor/skills`. Symlink or copy.

## How it works

The agent loads `SKILL.md` on demand. Activation is keyword-based — when the user mentions "팝업 페이지", "공유 링크", "랜딩 페이지", "HTML 공유" etc., the agent reads the skill and uses the MCP tools (`create_page`, `create_html_page`, `get_page`, `update_page`, `list_templates`) it exposes.

The skill enforces one critical rule: **the agent must ask the user for a PIN before creating any page**. PINs are how page owners later edit or delete their pages; an auto-generated PIN would leave the page unrecoverable.

## Service URL

- App: https://popup2026.com
- Remote MCP: https://popup2026.com/api/mcp
- My pages: https://popup2026.com/my-pages

## License

MIT — see [LICENSE](../LICENSE) if present.
