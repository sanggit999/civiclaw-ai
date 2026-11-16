#!/usr/bin/env python3
"""
scripts/sync-ai-config.py
================================================================================
NGUYÊN TẮC: 1 BẢN GỐC (.claude/) - 2 BẢN SINH (.agents/ & .codex/)

4 NHIỆM VỤ TỰ ĐỘNG HÓA:
1. .claude/skills/<x>/        -> copy nguyên qua .agents/skills/<x>/
2. .claude/commands/a/b.md   -> .agents/skills/a-b/SKILL.md (lệnh thành skill, thêm name + description)
3. .claude/rules/a/b.md      -> .agents/rules/a-b.md (thêm trigger: always_on nếu thiếu)
4. .claude/agents/x.md       -> .codex/agents/x.toml (chuyển đổi sang TOML cho Codex)
================================================================================
"""

import os
import re
import shutil
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

CLAUDE_DIR = ROOT_DIR / ".claude"
AGENTS_DIR = ROOT_DIR / ".agents"
CODEX_DIR = ROOT_DIR / ".codex"

BANNER_MD = """<!--
================================================================================
⚠️ CẢNH BÁO: FILE NÀY ĐƯỢC TỰ ĐỘNG SINH (AUTO-GENERATED) TỪ .claude/
TUYỆT ĐỐI KHÔNG SỬA TAY FILE NÀY!
Chỉnh sửa bản gốc tại: {source_rel}
Sau đó chạy: python3 -I scripts/sync-ai-config.py (hoặc npm run sync)
================================================================================
-->

"""

def extract_meta_from_markdown(content: str, default_name: str):
    """Trích xuất name và description từ nội dung markdown."""
    name = default_name
    description = default_name
    
    # Kiểm tra xem có YAML frontmatter không
    fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", content, re.DOTALL)
    body = content
    if fm_match:
        fm_text = fm_match.group(1)
        body = fm_match.group(2)
        name_match = re.search(r"^name:\s*(.+)$", fm_text, re.MULTILINE)
        if name_match:
            name = name_match.group(1).strip()
        desc_match = re.search(r"^description:\s*(.+)$", fm_text, re.MULTILINE)
        if desc_match:
            description = desc_match.group(1).strip()
    
    # Nếu chưa có description từ frontmatter, lấy từ tiêu đề # hoặc dòng đầu
    if description == default_name:
        for line in body.splitlines():
            line = line.strip()
            if line.startswith("#"):
                description = line.lstrip("#").strip()
                break
            elif line and not line.startswith("<!--"):
                description = line
                break

    return name, description, body

def sync_skills():
    """1. Copy nguyên vẹn skills từ .claude/skills/ sang .agents/skills/"""
    src_skills = CLAUDE_DIR / "skills"
    dst_skills = AGENTS_DIR / "skills"

    if not src_skills.exists():
        return

    dst_skills.mkdir(parents=True, exist_ok=True)
    for skill_folder in src_skills.iterdir():
        if skill_folder.is_dir():
            target_folder = dst_skills / skill_folder.name
            if target_folder.exists():
                shutil.rmtree(target_folder)
            shutil.copytree(skill_folder, target_folder)
            print(f"  [+] [Skill] .agents/skills/{skill_folder.name}/")

def sync_commands_to_skills():
    """2. Chuyển đổi .claude/commands/a/b.md thành .agents/skills/a-b/SKILL.md"""
    src_commands = CLAUDE_DIR / "commands"
    dst_skills = AGENTS_DIR / "skills"

    if not src_commands.exists():
        return

    dst_skills.mkdir(parents=True, exist_ok=True)
    for cmd_file in src_commands.rglob("*.md"):
        rel_parts = cmd_file.relative_to(src_commands).with_suffix("").parts
        slug = "-".join(rel_parts).lower().replace(" ", "-")
        
        target_skill_dir = dst_skills / slug
        target_skill_dir.mkdir(parents=True, exist_ok=True)
        target_skill_file = target_skill_dir / "SKILL.md"

        content = cmd_file.read_text(encoding="utf-8")
        name, description, body = extract_meta_from_markdown(content, slug)

        source_rel = f".claude/commands/{cmd_file.relative_to(src_commands).as_posix()}"
        banner = BANNER_MD.format(source_rel=source_rel)

        skill_content = f"""---
name: {slug}
description: {description}
---
{banner}{body.strip()}
"""
        target_skill_file.write_text(skill_content, encoding="utf-8")
        print(f"  [+] [Command->Skill] .agents/skills/{slug}/SKILL.md")

def sync_rules():
    """3. Chuyển đổi .claude/rules/a/b.md thành .agents/rules/a-b.md (thêm trigger)"""
    src_rules = CLAUDE_DIR / "rules"
    dst_rules = AGENTS_DIR / "rules"

    if not src_rules.exists():
        return

    if dst_rules.exists():
        shutil.rmtree(dst_rules)
    dst_rules.mkdir(parents=True, exist_ok=True)

    for rule_file in src_rules.rglob("*.md"):
        rel_parts = rule_file.relative_to(src_rules).with_suffix("").parts
        flat_name = "-".join(rel_parts) + ".md"
        target_file = dst_rules / flat_name

        content = rule_file.read_text(encoding="utf-8")
        source_rel = f".claude/rules/{rule_file.relative_to(src_rules).as_posix()}"
        banner = BANNER_MD.format(source_rel=source_rel)

        # Kiểm tra và bổ sung trigger cho Antigravity nếu thiếu
        fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", content, re.DOTALL)
        if fm_match:
            fm_text = fm_match.group(1)
            body = fm_match.group(2)
            if "trigger:" not in fm_text:
                fm_text = f"trigger: always_on\n{fm_text}".strip()
            final_content = f"---\n{fm_text}\n---\n{banner}{body.strip()}\n"
        else:
            final_content = f"---\ntrigger: always_on\n---\n{banner}{content.strip()}\n"

        target_file.write_text(final_content, encoding="utf-8")
        print(f"  [+] [Rule (trigger: always_on)] .agents/rules/{flat_name}")

def sync_agents_to_codex():
    """4. Chuyển đổi .claude/agents/x.md thành .codex/agents/x.toml cho Codex"""
    src_agents = CLAUDE_DIR / "agents"
    dst_agents = CODEX_DIR / "agents"

    if not src_agents.exists():
        return

    if dst_agents.exists():
        shutil.rmtree(dst_agents)
    dst_agents.mkdir(parents=True, exist_ok=True)

    for agent_file in src_agents.rglob("*.md"):
        stem = agent_file.stem
        target_toml = dst_agents / f"{stem}.toml"

        content = agent_file.read_text(encoding="utf-8")
        name, description, body = extract_meta_from_markdown(content, stem)

        # Escape triple quotes cho TOML multiline string
        escaped_prompt = body.strip().replace('"""', r'\"\"\"')

        source_rel = f".claude/agents/{agent_file.relative_to(src_agents).as_posix()}"
        toml_content = f"""# ==============================================================================
# ⚠️ CẢNH BÁO: FILE NÀY TỰ ĐỘNG SINH TỪ {source_rel}
# TUYỆT ĐỐI KHÔNG SỬA TAY! Sửa tại {source_rel} rồi chạy sync
# ==============================================================================

name = "{name}"
description = "{description}"

developer_prompt = \"\"\"
{escaped_prompt}
\"\"\"
"""
        target_toml.write_text(toml_content, encoding="utf-8")
        print(f"  [+] [Agent->Codex TOML] .codex/agents/{stem}.toml")

def ensure_codex_config():
    """Bảo toàn cấu hình viết tay .codex/config.toml"""
    config_file = CODEX_DIR / "config.toml"
    if not config_file.exists():
        CODEX_DIR.mkdir(parents=True, exist_ok=True)
        default_config = """# Cấu hình Codex (File viết tay - Không bị ghi đè bởi script sync)
model = "gpt-4o"
temperature = 0.2
"""
        config_file.write_text(default_config, encoding="utf-8")
        print(f"  [*] Khởi tạo cấu hình mặc định: .codex/config.toml")
    else:
        print(f"  [v] Giữ nguyên cấu hình viết tay: .codex/config.toml")

def main():
    print("=" * 65)
    print("🔄 BẮT ĐẦU ĐỒNG BỘ 1 BẢN GỐC (.claude/) -> 2 BẢN SINH (.agents/ & .codex/)")
    print("=" * 65)

    if not CLAUDE_DIR.exists():
        print(f"[X] Lỗi: Không tìm thấy thư mục gốc {CLAUDE_DIR}!")
        sys.exit(1)

    print("\n1️⃣  Đồng bộ Skills (.claude/skills/ -> .agents/skills/)...")
    sync_skills()

    print("\n2️⃣  Chuyển đổi Commands thành Skills (.claude/commands/ -> .agents/skills/)...")
    sync_commands_to_skills()

    print("\n3️⃣  Đồng bộ Rules với trigger (.claude/rules/ -> .agents/rules/)...")
    sync_rules()

    print("\n4️⃣  Chuyển đổi Agents sang TOML (.claude/agents/ -> .codex/agents/*.toml)...")
    sync_agents_to_codex()

    print("\n⚙️  Bảo toàn cấu hình Codex (.codex/config.toml)...")
    ensure_codex_config()

    print("\n" + "=" * 65)
    print("✅ ĐỒNG BỘ HOÀN TẤT! Cả 3 AI (Claude, Codex, Antigravity) đã thống nhất.")
    print("=" * 65)

if __name__ == "__main__":
    main()
