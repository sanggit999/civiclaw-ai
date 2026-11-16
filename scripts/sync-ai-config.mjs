#!/usr/bin/env node
/**
 * scripts/sync-ai-config.mjs
 * Phiên bản Node.js của scripts/sync-ai-config.py
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const CLAUDE_DIR = path.join(ROOT_DIR, '.claude');
const AGENTS_DIR = path.join(ROOT_DIR, '.agents');
const CODEX_DIR = path.join(ROOT_DIR, '.codex');

const BANNER_MD = (sourceRel) => `<!--
================================================================================
⚠️ CẢNH BÁO: FILE NÀY ĐƯỢC TỰ ĐỘNG SINH (AUTO-GENERATED) TỪ .claude/
TUYỆT ĐỐI KHÔNG SỬA TAY FILE NÀY!
Chỉnh sửa bản gốc tại: ${sourceRel}
Sau đó chạy: npm run sync (hoặc python3 -I scripts/sync-ai-config.py)
================================================================================
-->\n\n`;

function extractMeta(content, defaultName) {
  let name = defaultName;
  let description = defaultName;
  let body = content;

  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (fmMatch) {
    const fmText = fmMatch[1];
    body = fmMatch[2];
    const nMatch = fmText.match(/^name:\s*(.+)$/m);
    if (nMatch) name = nMatch[1].trim();
    const dMatch = fmText.match(/^description:\s*(.+)$/m);
    if (dMatch) description = dMatch[1].trim();
  }

  if (description === defaultName) {
    const lines = body.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('#')) {
        description = line.replace(/^#+\s*/, '');
        break;
      } else if (line && !line.startsWith('<!--')) {
        description = line;
        break;
      }
    }
  }

  return { name, description, body };
}

function syncSkills() {
  const src = path.join(CLAUDE_DIR, 'skills');
  const dst = path.join(AGENTS_DIR, 'skills');
  if (!fs.existsSync(src)) return;

  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const srcFolder = path.join(src, entry.name);
      const dstFolder = path.join(dst, entry.name);
      fs.cpSync(srcFolder, dstFolder, { recursive: true, force: true });
      console.log(`  [+] [Skill] .agents/skills/${entry.name}/`);
    }
  }
}

function syncCommandsToSkills() {
  const src = path.join(CLAUDE_DIR, 'commands');
  const dst = path.join(AGENTS_DIR, 'skills');
  if (!fs.existsSync(src)) return;

  fs.mkdirSync(dst, { recursive: true });

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const rel = path.relative(src, fullPath);
        const parts = rel.replace(/\.md$/, '').split(path.sep);
        const slug = parts.join('-').toLowerCase().replace(/\s+/g, '-');

        const skillFolder = path.join(dst, slug);
        fs.mkdirSync(skillFolder, { recursive: true });
        const skillFile = path.join(skillFolder, 'SKILL.md');

        const content = fs.readFileSync(fullPath, 'utf-8');
        const { description, body } = extractMeta(content, slug);
        const sourceRel = `.claude/commands/${rel.replace(/\\/g, '/')}`;

        const skillContent = `---
name: ${slug}
description: ${description}
---
${BANNER_MD(sourceRel)}${body.trim()}
`;
        fs.writeFileSync(skillFile, skillContent, 'utf-8');
        console.log(`  [+] [Command->Skill] .agents/skills/${slug}/SKILL.md`);
      }
    }
  }

  walk(src);
}

function syncRules() {
  const src = path.join(CLAUDE_DIR, 'rules');
  const dst = path.join(AGENTS_DIR, 'rules');
  if (!fs.existsSync(src)) return;

  fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(dst, { recursive: true });

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const rel = path.relative(src, fullPath);
        const flatName = rel.replace(/\.md$/, '').split(path.sep).join('-') + '.md';
        const targetFile = path.join(dst, flatName);

        const content = fs.readFileSync(fullPath, 'utf-8');
        const sourceRel = `.claude/rules/${rel.replace(/\\/g, '/')}`;
        const banner = BANNER_MD(sourceRel);

        let finalContent;
        const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
        if (fmMatch) {
          let fmText = fmMatch[1];
          const body = fmMatch[2];
          if (!fmText.includes('trigger:')) {
            fmText = `trigger: always_on\n${fmText}`.trim();
          }
          finalContent = `---\n${fmText}\n---\n${banner}${body.trim()}\n`;
        } else {
          finalContent = `---\ntrigger: always_on\n---\n${banner}${content.trim()}\n`;
        }

        fs.writeFileSync(targetFile, finalContent, 'utf-8');
        console.log(`  [+] [Rule (trigger: always_on)] .agents/rules/${flatName}`);
      }
    }
  }

  walk(src);
}

function syncAgentsToCodex() {
  const src = path.join(CLAUDE_DIR, 'agents');
  const dst = path.join(CODEX_DIR, 'agents');
  if (!fs.existsSync(src)) return;

  fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(dst, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      const fullPath = path.join(src, entry.name);
      const stem = entry.name.replace(/\.md$/, '');
      const targetToml = path.join(dst, `${stem}.toml`);

      const content = fs.readFileSync(fullPath, 'utf-8');
      const { name, description, body } = extractMeta(content, stem);
      const sourceRel = `.claude/agents/${entry.name}`;

      const escapedPrompt = body.trim().replace(/"""/g, '\\"\\"\\"');
      const tomlContent = `# ==============================================================================
# ⚠️ CẢNH BÁO: FILE NÀY TỰ ĐỘNG SINH TỪ ${sourceRel}
# TUYỆT ĐỐI KHÔNG SỬA TAY! Sửa tại ${sourceRel} rồi chạy sync
# ==============================================================================

name = "${name}"
description = "${description}"

developer_prompt = """
${escapedPrompt}
"""
`;
      fs.writeFileSync(targetToml, tomlContent, 'utf-8');
      console.log(`  [+] [Agent->Codex TOML] .codex/agents/${stem}.toml`);
    }
  }
}

function ensureCodexConfig() {
  const configFile = path.join(CODEX_DIR, 'config.toml');
  if (!fs.existsSync(configFile)) {
    fs.mkdirSync(CODEX_DIR, { recursive: true });
    const defaultConfig = `# Cấu hình Codex CLI / IDE (File viết tay - Không bị ghi đè bởi sync script)
model = "gpt-4o"
temperature = 0.2
`;
    fs.writeFileSync(configFile, defaultConfig, 'utf-8');
    console.log(`  [*] Khởi tạo cấu hình mặc định: .codex/config.toml`);
  } else {
    console.log(`  [v] Giữ nguyên cấu hình viết tay: .codex/config.toml`);
  }
}

console.log('='.repeat(65));
console.log('🔄 BẮT ĐẦU ĐỒNG BỘ 1 BẢN GỐC (.claude/) -> 2 BẢN SINH (.agents/ & .codex/)');
console.log('='.repeat(65));

console.log('\n1️⃣  Đồng bộ Skills (.claude/skills/ -> .agents/skills/)...');
syncSkills();

console.log('\n2️⃣  Chuyển đổi Commands thành Skills (.claude/commands/ -> .agents/skills/)...');
syncCommandsToSkills();

console.log('\n3️⃣  Đồng bộ Rules với trigger (.claude/rules/ -> .agents/rules/)...');
syncRules();

console.log('\n4️⃣  Chuyển đổi Agents sang TOML (.claude/agents/ -> .codex/agents/*.toml)...');
syncAgentsToCodex();

console.log('\n⚙️  Bảo toàn cấu hình Codex (.codex/config.toml)...');
ensureCodexConfig();

console.log('\n' + '='.repeat(65));
console.log('✅ ĐỒNG BỘ HOÀN TẤT! Cả 3 AI (Claude, Codex, Antigravity) đã thống nhất.');
console.log('='.repeat(65));
