#!/usr/bin/env python3
"""v2 预览：静态 dist + 复用 preview.py 的原型 API（/api/v1/*）。

  python3 site/build.py && python3 site/serve.py --port 16031
"""
import argparse
import os
import sys
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import preview  # noqa: E402

DIST = str(HERE / "dist")


class Handler(preview.Handler):
    def __init__(self, *a, **kw):
        super(preview.Handler, self).__init__(*a, directory=DIST, **kw)

    def _maybe_special(self):
        path = unquote(urlparse(self.path).path)
        # 旧大写 URL 一律 301 到小写
        low = path.lower()
        if low != path and not path.startswith("/api/"):
            self.send_response(301)
            self.send_header("Location", low)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return True
        if path.startswith("/api/"):
            return super()._maybe_special()
        if path.startswith("/font/"):
            self._redirect("/source/" + path.split("/")[2] + "/")
            return True
        full = os.path.join(DIST, path.lstrip("/"))
        if not path.endswith("/") and os.path.isdir(full):
            self._redirect(path + "/" + (("?" + urlparse(self.path).query) if urlparse(self.path).query else ""))
            return True
        if not os.path.exists(full) and "." not in path.rsplit("/", 1)[-1]:
            self.send_response(404)
            body = open(os.path.join(DIST, "404.html"), "rb").read()
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return True
        return False

    def translate_path(self, path):
        return super(preview.Handler, self).translate_path(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=16031)
    ap.add_argument("--bind", default="127.0.0.1")
    a = ap.parse_args()
    print("v2 preview http://%s:%d/" % (a.bind, a.port), flush=True)
    ThreadingHTTPServer((a.bind, a.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
