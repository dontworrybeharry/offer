"""把 src/ 里的前端模块写回 index.html。

index.html 是完整可运行的单文件应用；各模块在文件里用标记包起来：
    /*@QZ:radar.js*/ …模块内容… /*@/QZ:radar.js*/
修改 src/ 下的文件后运行：python3 tools/build.py
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
INDEX = os.path.join(ROOT, "index.html")


def modules():
    for dirpath, _, files in os.walk(SRC):
        for f in sorted(files):
            if f.endswith((".js", ".css")):
                yield os.path.relpath(os.path.join(dirpath, f), SRC).replace(os.sep, "/")


def main():
    html = open(INDEX, encoding="utf-8").read()
    missing = []
    for name in modules():
        start, end = f"/*@QZ:{name}*/\n", f"\n/*@/QZ:{name}*/"
        if start not in html:
            missing.append(name)
            continue
        i = html.index(start) + len(start)
        j = html.index(end, i)
        html = html[:i] + open(os.path.join(SRC, name), encoding="utf-8").read() + html[j:]
    open(INDEX, "w", encoding="utf-8").write(html)
    print("已写回 index.html" + (f"；以下模块在 index.html 里没有标记，已跳过：{', '.join(missing)}" if missing else ""))
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
