use std::collections::HashMap;
use std::io::{Read, Write};

use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize, Child};

use crate::error::AppError;

pub struct PtySession {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn Child + Send + Sync>,
}

pub struct PtyManager {
    sessions: HashMap<String, PtySession>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }

    /// Create ~/.mentat/nvim-init.lua if it doesn't already exist.
    pub fn ensure_nvim_init_public(path: &str) {
        Self::ensure_nvim_init(path);
    }

    fn ensure_nvim_init(path: &str) {
        if std::path::Path::new(path).exists() {
            return;
        }
        let init = r##"-- Mentat neovim configuration
-- Customize this file to change how neovim looks inside Mentat.
-- This file is only used by the embedded editor — your main neovim config is unaffected.

-- Prevent neovim's built-in default colorscheme from loading
vim.g.colors_name = "mentat"
vim.g.mapleader = " "

-- Signal Mentat to persist the prompt body from the temp file
local function mentat_save()
  vim.cmd("silent! write")
  io.stdout:write("\x1b]9999;save-prompt\x07")
  io.stdout:flush()
end

-- <leader>e — save and focus the prompt list (neovim stays open)
vim.keymap.set("n", "<leader>e", function()
  mentat_save()
  io.stdout:write("\x1b]9999;focus-prompt-list\x07")
  io.stdout:flush()
end, { noremap = true, silent = true, desc = "Save and focus prompt list" })

-- <leader>s — write to temp file and send to the selected terminal session
-- No need to persist to the real prompt — just send what's in the editor right now
vim.keymap.set("n", "<leader>s", function()
  vim.cmd("silent! write")
  io.stdout:write("\x1b]9999;send-to-terminal\x07")
  io.stdout:flush()
end, { noremap = true, silent = true, desc = "Send to terminal" })

-- Hook into BufWritePost so :w also persists to the real prompt file
vim.api.nvim_create_autocmd("BufWritePost", {
  callback = function()
    io.stdout:write("\x1b]9999;save-prompt\x07")
    io.stdout:flush()
  end,
})

vim.opt.swapfile = false
vim.opt.backup = false
vim.opt.writebackup = false

vim.opt.number = true
vim.opt.relativenumber = false
vim.opt.signcolumn = "yes"
vim.opt.cursorline = true
vim.opt.scrolloff = 8
vim.opt.tabstop = 2
vim.opt.shiftwidth = 2
vim.opt.expandtab = true
vim.opt.wrap = false
vim.opt.linebreak = true
vim.opt.termguicolors = true
vim.opt.showmode = false
vim.opt.laststatus = 0
vim.opt.cmdheight = 1
vim.opt.background = "dark"

vim.cmd("syntax on")
vim.cmd("filetype plugin indent on")

local function apply_theme()
  local bg = "#09131B"
  local fg = "#9FC75B"
  local comment = "#4A6A3B"
  local keyword = "#7DAEA3"
  local string_color = "#D3C6AA"
  local type_color = "#E69875"
  local func_color = "#A7C080"
  local number = "#D699B6"
  local visual = "#1E3A2B"
  local cursor_line = "#0D1B24"
  local line_nr = "#3B4F56"
  local status_bg = "#0B1820"
  local border = "#1A3040"

  local hl = vim.api.nvim_set_hl

  -- Base
  hl(0, "Normal", { fg = fg, bg = bg })
  hl(0, "NormalNC", { fg = fg, bg = bg })
  hl(0, "NormalFloat", { fg = fg, bg = bg })
  hl(0, "NonText", { fg = line_nr, bg = bg })
  hl(0, "EndOfBuffer", { fg = bg, bg = bg })
  hl(0, "SignColumn", { bg = bg })
  hl(0, "FoldColumn", { bg = bg })
  hl(0, "LineNr", { fg = line_nr, bg = bg })
  hl(0, "CursorLineNr", { fg = fg, bg = cursor_line, bold = true })
  hl(0, "CursorLine", { bg = cursor_line })
  hl(0, "Visual", { bg = visual })
  hl(0, "StatusLine", { fg = fg, bg = status_bg })
  hl(0, "StatusLineNC", { fg = line_nr, bg = status_bg })
  hl(0, "VertSplit", { fg = border, bg = bg })
  hl(0, "WinSeparator", { fg = border, bg = bg })
  hl(0, "Pmenu", { fg = fg, bg = cursor_line })
  hl(0, "PmenuSel", { fg = bg, bg = fg })
  hl(0, "MsgArea", { fg = fg, bg = bg })
  hl(0, "FloatBorder", { fg = border, bg = bg })
  hl(0, "WinBar", { fg = fg, bg = bg })
  hl(0, "WinBarNC", { fg = line_nr, bg = bg })
  hl(0, "TabLine", { fg = line_nr, bg = status_bg })
  hl(0, "TabLineFill", { bg = bg })
  hl(0, "TabLineSel", { fg = fg, bg = bg })
  hl(0, "Cursor", { fg = bg, bg = fg })

  -- Syntax
  hl(0, "Comment", { fg = comment, italic = true })
  hl(0, "Keyword", { fg = keyword, bold = true })
  hl(0, "Conditional", { fg = keyword })
  hl(0, "Repeat", { fg = keyword })
  hl(0, "String", { fg = string_color })
  hl(0, "Character", { fg = string_color })
  hl(0, "Number", { fg = number })
  hl(0, "Float", { fg = number })
  hl(0, "Boolean", { fg = number })
  hl(0, "Type", { fg = type_color })
  hl(0, "Function", { fg = func_color })
  hl(0, "Identifier", { fg = fg })
  hl(0, "Statement", { fg = keyword })
  hl(0, "Operator", { fg = fg })
  hl(0, "PreProc", { fg = keyword })
  hl(0, "Include", { fg = keyword })
  hl(0, "Define", { fg = keyword })
  hl(0, "Special", { fg = type_color })
  hl(0, "Delimiter", { fg = fg })
  hl(0, "Title", { fg = func_color, bold = true })
  hl(0, "Constant", { fg = number })
  hl(0, "Error", { fg = "#E67E80", bg = bg })
  hl(0, "Todo", { fg = bg, bg = keyword, bold = true })
  hl(0, "MatchParen", { fg = fg, bg = visual, bold = true })
  hl(0, "Search", { fg = bg, bg = keyword })
  hl(0, "IncSearch", { fg = bg, bg = func_color })

  -- Treesitter
  hl(0, "@comment", { link = "Comment" })
  hl(0, "@keyword", { link = "Keyword" })
  hl(0, "@string", { link = "String" })
  hl(0, "@number", { link = "Number" })
  hl(0, "@type", { link = "Type" })
  hl(0, "@function", { link = "Function" })
  hl(0, "@variable", { fg = fg })
  hl(0, "@property", { fg = fg })
  hl(0, "@punctuation", { fg = fg })
  hl(0, "@constant", { link = "Constant" })
  hl(0, "@boolean", { link = "Boolean" })

  -- Markdown
  hl(0, "@markup.heading", { fg = func_color, bold = true })
  hl(0, "@markup.raw", { fg = string_color })
  hl(0, "@markup.link", { fg = keyword, underline = true })
  hl(0, "@markup.strong", { fg = fg, bold = true })
  hl(0, "@markup.italic", { fg = fg, italic = true })
end

-- Apply immediately
apply_theme()

-- Re-apply after any colorscheme change (safety net)
vim.api.nvim_create_autocmd("ColorScheme", { callback = apply_theme })

-- Re-apply after VimEnter in case anything overrides during startup
vim.api.nvim_create_autocmd("VimEnter", {
  callback = function()
    apply_theme()
    -- And once more after a short delay for good measure
    vim.defer_fn(apply_theme, 50)
  end,
})
"##;
        let _ = std::fs::write(path, init);
    }

    /// Find the full path to nvim by checking common locations and the user's PATH.
    fn resolve_nvim_path() -> Result<String, AppError> {
        // Try `which nvim` first — this respects the user's PATH
        if let Ok(output) = std::process::Command::new("which").arg("nvim").output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    return Ok(path);
                }
            }
        }

        // Fall back to common locations
        let candidates = [
            "/opt/homebrew/bin/nvim",
            "/usr/local/bin/nvim",
            "/usr/bin/nvim",
        ];
        for path in candidates {
            if std::path::Path::new(path).exists() {
                return Ok(path.to_string());
            }
        }

        Err(AppError::PtyError(
            "nvim not found. Install Neovim or ensure it is in your PATH.".to_string(),
        ))
    }

    /// Spawn `nvim <file>` in a new PTY.
    /// Returns a reader for the PTY output (to be consumed by a background thread).
    pub fn spawn_editor(
        &mut self,
        id: &str,
        file_path: &str,
        rows: u16,
        cols: u16,
    ) -> Result<Box<dyn Read + Send>, AppError> {
        let pty_system = native_pty_system();

        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| AppError::PtyError(format!("Failed to open PTY: {}", e)))?;

        let nvim_path = Self::resolve_nvim_path()?;
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());

        // Create a Mentat-specific nvim config if it doesn't exist.
        // Users can customize ~/.mentat/nvim-init.lua to their liking.
        let nvim_init = format!("{}/.mentat/nvim-init.lua", home);
        Self::ensure_nvim_init(&nvim_init);

        let mut cmd = CommandBuilder::new(nvim_path);
        // -u: use our config only. --noplugin: don't load plugins from packpath
        // (without --noplugin, plugins from ~/.local/share/nvim/ still load
        //  and override our colors — e.g. NvChad's base46 theme cache)
        cmd.args(["-u", &nvim_init, "--noplugin"]);
        cmd.arg(file_path);

        // portable-pty inherits parent env by default — just override what we need
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");
        cmd.env("MENTAT", "1");

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| AppError::PtyError(format!("Failed to spawn nvim: {}", e)))?;

        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| AppError::PtyError(format!("Failed to clone PTY reader: {}", e)))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| AppError::PtyError(format!("Failed to get PTY writer: {}", e)))?;

        let session = PtySession {
            master: pair.master,
            writer,
            child,
        };
        self.sessions.insert(id.to_string(), session);

        Ok(reader)
    }

    /// Write user input to the PTY stdin.
    pub fn write_to_pty(&mut self, id: &str, data: &[u8]) -> Result<(), AppError> {
        let session = self
            .sessions
            .get_mut(id)
            .ok_or_else(|| AppError::NotFound(format!("PTY session not found: {}", id)))?;

        session.writer.write_all(data).map_err(AppError::Io)?;
        session.writer.flush().map_err(AppError::Io)?;

        Ok(())
    }

    /// Resize the PTY.
    pub fn resize_pty(&mut self, id: &str, rows: u16, cols: u16) -> Result<(), AppError> {
        let session = self
            .sessions
            .get(id)
            .ok_or_else(|| AppError::NotFound(format!("PTY session not found: {}", id)))?;

        session
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| AppError::PtyError(format!("Failed to resize PTY: {}", e)))?;

        Ok(())
    }

    /// Close a PTY session: kill child, remove from map.
    pub fn close_session(&mut self, id: &str) -> Result<(), AppError> {
        if let Some(mut session) = self.sessions.remove(id) {
            // Try to kill the child process; ignore errors if it already exited
            let _ = session.child.kill();
            let _ = session.child.wait();
        }
        Ok(())
    }

    /// Check if a session exists.
    #[allow(dead_code)]
    pub fn has_session(&self, id: &str) -> bool {
        self.sessions.contains_key(id)
    }

    /// Close all sessions (for app cleanup).
    #[allow(dead_code)]
    pub fn close_all(&mut self) {
        let ids: Vec<String> = self.sessions.keys().cloned().collect();
        for id in ids {
            let _ = self.close_session(&id);
        }
    }
}
