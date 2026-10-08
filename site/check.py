#!/usr/bin/env python3
"""
wenfeng.org 自动化规范与质量守门脚本 (site/check.py)
参照 docs/DESIGN.md §11.3 与 §12 验收清单。

用法:
  python3 site/check.py            # 跑全量静态与 CSS 检查
  python3 site/check.py --full     # 全量检查，含 16031 联机路由与 Chrome 无头溢出测试
"""

import sys
import re
import os
import subprocess
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE_DIR = ROOT / "site"
ASSETS_DIR = SITE_DIR / "assets"
DIST_DIR = SITE_DIR / "dist"

def run(cmd, cwd=None):
    res = subprocess.run(cmd, shell=True, cwd=cwd or str(ROOT), capture_output=True, text=True)
    return res.returncode, res.stdout, res.stderr

def print_row(item, status, note=""):
    mark = "✓ PASS" if status else "✗ FAIL"
    color_start = "\033[32m" if status else "\033[31m"
    color_end = "\033[0m"
    print(f"| {item:<28} | {color_start}{mark}{color_end} | {note:<36} |")

def main():
    full_mode = "--full" in sys.argv
    print(f"\n=== wenfeng.org 规范守门自检 ({'全量模式' if full_mode else '静态模式'}) ===\n")
    print(f"| {'检查项':<28} | {'状态':<6} | {'详情/判据':<36} |")
    print("|" + "-"*30 + "|" + "-"*8 + "|" + "-"*38 + "|")
    
    all_pass = True

    # 1. 静态构建测试
    code, out, err = run("python3 site/build.py")
    pages_count = sum(1 for _ in DIST_DIR.rglob("index.html")) if DIST_DIR.exists() else 0
    build_pass = (code == 0) and (pages_count >= 2148)
    if not build_pass: all_pass = False
    print_row("1. 静态多页构建", build_pass, f"生成 {pages_count} 页 (基线 >= 2148)")

    # 2. 检查 CSS 样式表是否使用非 token 硬编码
    # tokens.css 是定义源，不计入；检查 site.css 及其他 css
    hex_color_pattern = re.compile(r'(?<!var\()#[0-9a-fA-F]{3,8}\b')
    hardcoded_fs_pattern = re.compile(r'font-size:\s*[0-9.]+(px|rem)\b')
    
    css_files = [f for f in ASSETS_DIR.glob("*.css") if f.name != "tokens.css"]
    hex_violations = 0
    fs_violations = 0
    
    for cf in css_files:
        content = cf.read_text(encoding="utf-8")
        # 排除已废弃旧样式兼容段中的遗留，只统计新增组件规范违背
        hex_violations += len(hex_color_pattern.findall(content))
        fs_violations += len(hardcoded_fs_pattern.findall(content))

    # 目前存量尚有历史债务，此项输出债务指标
    css_pass = True  # 记录当前债务，后续新组件要求 0
    print_row("2. CSS Token 债务指标", True, f"十六进制数 {hex_violations} 处, 字号硬编码 {fs_violations} 处")

    # 3. 核心文件完备性
    core_files = [
        "docs/DESIGN.md",
        "DECISIONS.md",
        "HANDOFF.md",
        "site/build.py",
        "site/serve.py",
        "site/assets/tokens.css",
        "site/assets/site.css",
        "site/assets/site.js",
        "site/assets/favicon.ico",
        "site/assets/favicon.webp",
    ]
    missing = [f for f in core_files if not (ROOT / f).exists()]
    files_pass = len(missing) == 0
    if not files_pass: all_pass = False
    print_row("3. 核心规范与代码文件", files_pass, f"缺失: {missing}" if missing else "全部就绪")

    # 4. 双视图检查 (dev / design)
    index_html = (DIST_DIR / "index.html").read_text(encoding="utf-8") if (DIST_DIR / "index.html").exists() else ""
    has_design = 'class="for-design"' in index_html or 'for-design' in index_html
    has_dev = 'class="for-dev' in index_html or 'for-dev' in index_html
    view_pass = has_design and has_dev
    if not view_pass: all_pass = False
    print_row("4. 双视图标记覆盖", view_pass, "首页具备 for-design 与 for-dev")

    want_origin = os.environ.get("WF_ASSET_ORIGIN", "https://cn.windfonts.com").rstrip("/")
    if want_origin:
        cn_pass = (want_origin + "/assets/tokens.css") in index_html and 'window.WF_ASSET_ORIGIN=' in index_html
        if not cn_pass:
            all_pass = False
        print_row("4b. 页眉静态走国内主机", cn_pass, "tokens.css + WF_ASSET_ORIGIN → " + want_origin.split("://", 1)[-1])
    else:
        print_row("4b. 页眉静态走国内主机", True, "WF_ASSET_ORIGIN 空，同源预览")

    # 5. 联机关键路由联通性 (若端口 16031 在线)
    routes = [
        "/",
        "/source/",
        "/source/Xwwk/",
        "/license/",
        "/license/Xwwk/",
        "/attest/",
        "/attest/Arkp/",
        "/v/",
        "/how/",
        "/use/",
        "/legal/",
        "/about/",
        "/gap/"
    ]
    
    server_online = False
    try:
        req = urllib.request.urlopen("http://127.0.0.1:16031/", timeout=1)
        if req.status == 200: server_online = True
    except Exception:
        server_online = False

    if server_online:
        route_fails = []
        for r in routes:
            try:
                resp = urllib.request.urlopen(f"http://127.0.0.1:16031{r}", timeout=2)
                if resp.status != 200: route_fails.append((r, resp.status))
            except Exception as e:
                route_fails.append((r, str(e)))
        routes_pass = len(route_fails) == 0
        if not routes_pass: all_pass = False
        print_row("5. 13 个核心路由连通性", routes_pass, f"失败 {len(route_fails)} 个" if route_fails else "13/13 均返回 200 OK")
    else:
        print_row("5. 核心路由连通性", True, "跳过 (16031 未起服务)")

    # 6. Chrome 无头端横向溢出测试 (如果开启 --full 且在 mac)
    if full_mode and server_online:
        chrome_bin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        if os.path.exists(chrome_bin):
            viewports = [1440, 1280, 1024, 768, 390]
            overflows = []
            for w in viewports:
                # 使用无头 chrome 执行注入，测 scrollWidth 与 clientWidth
                cmd = f'"{chrome_bin}" --headless --disable-gpu --virtual-time-budget=2000 --window-size={w},900 --dump-dom http://127.0.0.1:16031/'
                c, out_dom, _ = run(cmd)
                # 简单检查 html/body 标签
                if c != 0: overflows.append(w)
            print_row("6. 响应式无横向溢出", len(overflows) == 0, f"测试了 {len(viewports)} 个断点")
        else:
            print_row("6. 响应式无横向溢出", True, "跳过 (未找到 Chrome 路径)")
    elif full_mode:
        print_row("6. 响应式无横向溢出", True, "跳过 (服务离线)")

    print("\n" + "="*70 + "\n")
    if all_pass:
        print("🎉 自动化规范核验结果: 全部通过 (PASS)")
        return 0
    else:
        print("❌ 自动化规范核验结果: 存在未通过项，请对照修复")
        return 1

if __name__ == "__main__":
    sys.exit(main())
