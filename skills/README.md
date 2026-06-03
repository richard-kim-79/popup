# Skills — Moved

The Popup Agent Skill has moved to its own repository:

👉 **https://github.com/richard-kim-79/popup-skills**

That repo follows the [agentskills.io](https://agentskills.io) / [huggingface/skills](https://github.com/huggingface/skills) convention and can be installed into Claude Code, Codex CLI, Gemini CLI, or Cursor as a drop-in package.

Why a separate repo?
- Lets external users `git clone` without pulling the whole Popup app source
- Independent versioning and release notes for the skill
- Easier to surface in agent skill marketplaces (e.g., agentskills.io)

For service code and API, this `popup` repository remains the source of truth.
