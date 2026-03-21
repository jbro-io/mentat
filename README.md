# Mentat

> "The prompt must flow."

A desktop app for managing developer prompts, Claude Code projects, MCP servers, and scratch files. Built with Tauri 2, React, and an embedded Neovim editor.

## Features

**Prompt Management**
- CRUD for markdown prompts with YAML frontmatter
- Fuzzy search across titles, tags, and content (Cmd+K)
- Tag filtering, folder navigation, type/target filters
- Staging area for variable interpolation and one-off edits
- Compose mode — assemble multiple prompts by insert point order
- Send staged prompts directly to Claude/Codex sessions in iTerm

**Embedded Neovim**
- Full neovim editor via PTY + xterm.js (optional, toggle CM/NV)
- Custom Mentat colorscheme with true-color support
- `<leader>e` to save and navigate back to prompt list
- `<leader>s` to send current content to a terminal session
- Vim-style j/k/l/g/G navigation throughout the app

**Scratchpad**
- Quick scratch files in multiple languages (Markdown, TypeScript, Rust, Python, SQL)
- Neovim auto-detects filetype for syntax highlighting
- Stored in `~/.mentat/scratches/`

**Claude Code Config Viewer**
- Discovers all Claude Code projects across your dev directories
- Shows MCP servers, hooks, permissions, plugins, CLAUDE.md preview
- Install MCP servers to other projects or make them global
- Reads from `~/.claude.json` (the real source of truth)

**Git Sync**
- Auto-pull on launch, manual sync button in sidebar
- Remote repository setup from within the app
- Status indicator (clean/dirty/ahead/behind)

## Tech Stack

- **Tauri 2** — desktop framework (Rust backend, web frontend)
- **React 19 + TypeScript** — frontend
- **Rust** — backend (file I/O, Git, search, PTY management)
- **Tailwind CSS v4** — styling
- **Radix UI** — accessible primitives (Dialog, Select, Tabs, etc.)
- **CodeMirror 6** — default text editor
- **xterm.js + tauri-plugin-pty** — embedded neovim terminal
- **zustand** — state management
- **cmdk** — command palette

## Prerequisites

- [Rust](https://rustup.rs/) (1.88+)
- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (v10+)
- [Neovim](https://neovim.io/) (optional, for embedded editor)

## Installation

```bash
# Clone the repo
git clone https://github.com/jbro-io/mentat.git
cd mentat

# Install frontend dependencies
pnpm install

# Install Tauri CLI
cargo install tauri-cli --version "^2" --locked

# Run in development
cargo tauri dev
```

First launch creates `~/.mentat/` with the directory structure:

```
~/.mentat/
├── prompts/
│   ├── system-prompts/
│   ├── skills/claude/
│   ├── skills/openai/
│   ├── snippets/
│   └── templates/
├── scratches/
├── settings.json
└── nvim-init.lua
```

## Build

```bash
# Build the production app
cargo tauri build

# The .app bundle will be in:
# src-tauri/target/release/bundle/macos/Mentat.app
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+1/2/3/4` | Switch tabs (Prompts/Scratches/Projects/MCPs) |
| `Cmd+K` | Command palette |
| `Cmd+N` | New prompt |
| `Cmd+B` | Toggle sidebar |
| `Cmd+E` | Toggle edit/preview |
| `Cmd+S` | Save (in CodeMirror) |
| `Cmd+D` | Stage prompt / dispatch |
| `j/k` | Navigate lists |
| `l/Enter` | Open selected item |
| `g/G` | Jump to top/bottom |
| `/` | Focus search |
| `<leader>e` | (Neovim) Save and focus prompt list |
| `<leader>s` | (Neovim) Send to terminal session |

## Prompt File Format

```yaml
---
id: "uuid"
title: "Code Review Assistant"
type: system-prompt
target: [claude, openai]
tags: [code-review, python]
version: 1
created: 2026-01-15
modified: 2026-03-18
variables:
  language:
    default: "python"
    description: "Target programming language"
composable: true
insert_point: "task"
---

Your prompt body here with {{language}} variables.
```

## Configuration

Settings persist in `~/.mentat/settings.json`:

```json
{
  "editorPreference": "neovim",
  "sidebarCollapsed": false
}
```

Neovim theme is customizable at `~/.mentat/nvim-init.lua`.

## License

MIT
