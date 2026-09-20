"""项目自检：在提交或发布前跑一遍。

检查四件事：
  1. src/ 每个模块都能解析（语法错误会在这里被发现，而不是打开页面才白屏）
  2. 模块之间没有重名的顶层函数 / 常量（重名会互相覆盖，页面上表现为「某块功能突然变成另一块的样子」）
  3. index.html 与 src/ 一致（构建产物没有忘记重新生成）
  4. 仓库里没有个人信息（姓名、手机号、邮箱、本机路径）

用法：python3 tools/check.py
需要 esprima 才能做语法解析：pip install esprima（没装则跳过第 1、2 项并提示）
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
INDEX = ROOT / "index.html"
# 隐私检查用「格式」而不是写死的词，避免检查脚本自己泄漏作者信息。
# 需要额外屏蔽的词（本人姓名、学校等）写在 tools/privacy-words.txt，一行一个，该文件不入库。
WORDS_FILE = Path(__file__).with_name("privacy-words.txt")
PATTERNS = [
    (re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)"), "手机号"),
    (re.compile(r"[\w.+-]+@(?!example\.com|users\.noreply\.github\.com)[\w-]+\.[\w.]+"), "邮箱"),
    (re.compile(r"/(?:Users|home)/(?!harry-example)[A-Za-z][\w.-]*/"), "本机绝对路径"),
]


def modules() -> list[Path]:
    return sorted(p for p in SRC.rglob("*") if p.suffix in (".js", ".css"))


def check_syntax_and_names() -> list[str]:
    try:
        import esprima
    except ImportError:
        print("· 跳过语法与重名检查（未安装 esprima：pip install esprima）")
        return []
    errs: list[str] = []
    owner: dict[str, str] = {}
    for p in modules():
        if p.suffix != ".js":
            continue
        code = p.read_text(encoding="utf-8")
        try:
            tree = esprima.parseScript(code, {"tolerant": False})
        except Exception as e:  # noqa: BLE001 - esprima 的异常类型不稳定
            errs.append(f"{p.relative_to(ROOT)}: 语法错误 {e}")
            continue
        for node in tree.body:
            names: list[str] = []
            if node.type == "FunctionDeclaration" and node.id:
                names.append(node.id.name)
            elif node.type == "VariableDeclaration":
                names += [d.id.name for d in node.declarations if getattr(d.id, "name", None)]
            for n in names:
                prev = owner.get(n)
                if prev and prev != str(p.relative_to(ROOT)):
                    errs.append(f"顶层名字重复：{n}（{prev} 与 {p.relative_to(ROOT)}）——后加载的会覆盖前面的")
                owner[n] = str(p.relative_to(ROOT))
    return errs


def check_build_is_current() -> list[str]:
    """用 src/ 重新构建一次并比对；检查本身不留下改动（不一致时把文件还原）。"""
    before = INDEX.read_bytes()
    subprocess.run([sys.executable, str(ROOT / "tools" / "build.py")], check=True, capture_output=True)
    after = INDEX.read_bytes()
    if before == after:
        return []
    INDEX.write_bytes(before)
    return ["index.html 与 src/ 不一致：改完 src/ 后请运行 python3 tools/build.py 并一起提交"]


def check_no_personal_data() -> list[str]:
    """仓库里不应出现手机号、真实邮箱、本机路径，以及 privacy-words.txt 里列出的词。"""
    words = [w.strip() for w in WORDS_FILE.read_text(encoding="utf-8").splitlines() if w.strip()] if WORDS_FILE.exists() else []
    tracked = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split()
    errs = []
    for rel in tracked:
        p = ROOT / rel
        if not p.is_file() or p.suffix in (".png", ".jpg", ".jpeg", ".ico", ".webp") or rel == "tools/check.py":
            continue
        try:
            text = p.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for pat, what in PATTERNS:
            m = pat.search(text)
            if m:
                errs.append(f"{rel}: 疑似{what}「{m.group()[:6]}…」")
        for word in words:
            if word in text:
                errs.append(f"{rel}: 出现 privacy-words.txt 里的词")
    return errs


def check_markers() -> list[str]:
    html = INDEX.read_text(encoding="utf-8")
    missing = [str(p.relative_to(SRC)) for p in modules() if f"/*@QZ:{p.relative_to(SRC).as_posix()}*/" not in html]
    return [f"index.html 里缺少模块标记：{', '.join(missing)}"] if missing else []


def main() -> int:
    checks = [("语法与重名", check_syntax_and_names), ("模块标记", check_markers),
              ("构建产物是最新的", check_build_is_current), ("没有个人信息", check_no_personal_data)]
    failed: list[str] = []
    for name, fn in checks:
        errs = fn()
        print(("✗ " if errs else "✓ ") + name)
        failed += errs
    for e in failed:
        print("  -", e)
    print(f"\n{len(modules())} 个前端模块" + ("，检查未通过" if failed else "，全部通过"))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
