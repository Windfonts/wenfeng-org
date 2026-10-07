#!/usr/bin/env python3
"""Rewrite wenfeng-org catalog shorts to match fonts-front shop.

Join by exact Chinese name. 379 path moves + family-only rows.
Do not insert shop-only faces. Do not delete old overlay files.
27 org-only rows stay on old CamelCase.
"""
from __future__ import annotations

import json
import shutil
from datetime import date
from pathlib import Path

ORG = Path(__file__).resolve().parent.parent
SHOP_PATH = Path.home() / "Projects" / "fonts-front" / "data" / "fonts.json"
SHOP_HREF = "https://app.windfonts.com/fonts/"
TODAY = date.today().isoformat()
SLIM_KEYS = (
    "norm",
    "name",
    "en",
    "licenseName",
    "foundry",
    "foundrySlug",
    "offer",
    "slice",
    "distribution",
    "shop",
    "weights",
    "family",
    "license",
)


def load(path: Path):
    return json.loads(path.read_text("utf-8"))


def dump(path: Path, obj, indent=None, compact=False):
    if compact:
        text = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    else:
        text = json.dumps(obj, ensure_ascii=False, indent=indent)
    if not text.endswith("\n"):
        text += "\n"
    path.write_text(text, "utf-8")


def slim_license(lic):
    lic = lic or {}
    out = {"textState": lic.get("textState")}
    if lic.get("spdx"):
        out["spdx"] = lic["spdx"]
    return out


def slim_of(full):
    row = {k: full.get(k) for k in SLIM_KEYS}
    row["license"] = slim_license(full.get("license"))
    return row


def add_alias(aliases, value):
    if not value:
        return
    s = str(value).strip()
    if not s:
        return
    have = {str(x).lower() for x in aliases}
    if s.lower() in have:
        return
    aliases.append(s)


def license_lookup(licenses, old_norm):
    if old_norm in licenses:
        return licenses[old_norm]
    low = old_norm.lower()
    for k, v in licenses.items():
        if str(k).lower() == low:
            return v
    return None


def main():
    shop = {s["name"]: s for s in load(SHOP_PATH)}
    full_doc = load(ORG / "data" / "samples-full.json")
    fonts = full_doc["fonts"]
    licenses = load(ORG / "data" / "licenses.json")
    webfonts = load(ORG / "data" / "webfonts.json")
    oss_packs = load(ORG / "data" / "oss-packs.json")

    overlay_dir = ORG / "data" / "font"
    text_dir = ORG / "data" / "license-text"
    overlays = {p.name: json.loads(p.read_text("utf-8")) for p in overlay_dir.glob("*.json")}
    texts = {p.stem.lower(): p for p in text_dir.glob("*.json")} if text_dir.is_dir() else {}

    report = {
        "generated": TODAY,
        "org": len(fonts),
        "shop": len(shop),
        "same": 0,
        "move": 0,
        "family_only": 0,
        "nomatch": 0,
        "dest_skip": [],
        "maps": [],
        "nomatch_names": [],
        "batch14": {},
    }
    desired = []
    taken_new = {}
    for i, f in enumerate(fonts):
        old = f.get("norm") or ""
        name = f.get("name")
        s = shop.get(name)
        if not s:
            report["nomatch"] += 1
            report["nomatch_names"].append({"norm": old, "name": name})
            desired.append((i, old, old, f.get("family") or "", None, "nomatch"))
            continue
        new = (s.get("normalized") or "").strip()
        fam = s.get("family") or ""
        if old.lower() == new.lower():
            kind = "family_only" if (f.get("family") or "") != fam else "same"
            desired.append((i, old, old, fam, s, kind))
        else:
            desired.append((i, old, new, fam, s, "move"))

    # dest occupied by a font that is staying (not moving off that slug)
    staying = {}
    for i, old, new, fam, s, kind in desired:
        if kind in ("same", "family_only", "nomatch"):
            staying[old.lower()] = fonts[i].get("name")
    for i, old, new, fam, s, kind in desired:
        if kind != "move":
            continue
        occ = staying.get(new.lower())
        if occ and occ != fonts[i].get("name"):
            report["dest_skip"].append(
                {"name": fonts[i].get("name"), "old": old, "new": new, "occupant": occ}
            )
            desired[i] = (i, old, old, fam, s, "dest_skip")

    wanted = {}
    for i, old, new, fam, s, kind in desired:
        if kind == "move":
            k = new.lower()
            if k in wanted and wanted[k] != fonts[i].get("name"):
                report["dest_skip"].append(
                    {
                        "name": fonts[i].get("name"),
                        "old": old,
                        "new": new,
                        "occupant": wanted[k],
                        "reason": "dup_new",
                    }
                )
                desired[i] = (i, old, old, fam, s, "dest_skip")
            else:
                wanted[k] = fonts[i].get("name")

    wf_fonts = webfonts.get("fonts") or {}
    wf_canon = webfonts.get("canon") or {}
    op_fonts = oss_packs.get("fonts") or {}
    overlay_writes = []
    text_copies = []
    history_maps = []
    lic_primary = []  # (key, old_norm)
    lic_alias = []

    for i, old, new, fam, s, kind in desired:
        f = fonts[i]
        old_fam = f.get("family") or ""
        if kind in ("nomatch", "dest_skip"):
            if kind == "nomatch":
                report["maps"].append(
                    {"name": f.get("name"), "old": old, "new": old, "kind": kind}
                )
            else:
                report["maps"].append(
                    {
                        "name": f.get("name"),
                        "old": old,
                        "new": old,
                        "kind": kind,
                        "wanted": new,
                    }
                )
            lic_primary.append((old, old))
            continue

        shop_norm = (s.get("normalized") or new).strip()
        shop_url = SHOP_HREF + shop_norm
        if kind == "move":
            canon = new.lower()
            aliases = list(f.get("aliases") or [])
            add_alias(aliases, old)
            if old.lower() != old:
                add_alias(aliases, old.lower())
            f["aliases"] = aliases
            f["norm"] = canon
            f["family"] = fam
            f["shop"] = shop_url
            report["move"] += 1
            overlay_writes.append((old, canon, f))
            history_maps.append(
                {
                    "name": f.get("name"),
                    "old": old,
                    "new": canon,
                    "family_old": old_fam,
                    "family_new": fam,
                }
            )
            old_l = old.lower()
            if old_l in wf_fonts and canon not in wf_fonts:
                wf_fonts[canon] = wf_fonts[old_l]
            if canon not in wf_canon:
                wf_canon[canon] = canon
            if old_l in op_fonts and canon not in op_fonts:
                op_fonts[canon] = op_fonts[old_l]
            lic_primary.append((canon, old))
            lic_alias.append((old, old))
            src_text = texts.get(old_l)
            dest_text = text_dir / (canon + ".json")
            if src_text and src_text.is_file() and dest_text.resolve() != src_text.resolve():
                text_copies.append((src_text, dest_text))
        else:
            changed = False
            if fam and f.get("family") != fam:
                f["family"] = fam
                changed = True
                report["family_only"] += 1
            else:
                report["same"] += 1
            if f.get("shop") != shop_url:
                f["shop"] = shop_url
                changed = True
            if changed:
                overlay_writes.append((old, old, f))
            lic_primary.append((old, old))
        report["maps"].append(
            {
                "name": f.get("name"),
                "old": old,
                "new": f.get("norm"),
                "kind": kind,
                "family": f.get("family"),
            }
        )

    new_licenses = {}
    used_lic_lower = set()

    def put_lic(key, val):
        if not key or val is None:
            return
        lk = str(key).lower()
        if lk in used_lic_lower:
            return
        new_licenses[key] = val
        used_lic_lower.add(lk)

    for key, old_norm in lic_primary:
        put_lic(key, license_lookup(licenses, old_norm))
    for key, old_norm in lic_alias:
        put_lic(key, license_lookup(licenses, old_norm))
    for k, v in licenses.items():
        put_lic(k, v)

    full_doc["generated"] = TODAY
    full_doc["comment"] = (
        "2026-10-07 按店面中文名对上的条目，norm/family/shop 换成店面短码；"
        "旧 CamelCase 留在 aliases。27 条只在本站的未改。未插入店面独有款。"
    )
    slim_doc = {
        "generated": TODAY,
        "purpose": full_doc.get("purpose"),
        "comment": "瘦目录（首页/列表/卡片）；详情页按需取 data/font/<norm>.json",
        "coverage": full_doc.get("coverage"),
        "fonts": [slim_of(f) for f in fonts],
    }

    dump(ORG / "data" / "samples-full.json", full_doc, indent=1)
    dump(ORG / "samples.json", slim_doc, compact=True)
    dump(ORG / "data" / "licenses.json", new_licenses, indent=2)
    webfonts["fonts"] = wf_fonts
    webfonts["canon"] = wf_canon
    dump(ORG / "data" / "webfonts.json", webfonts, indent=1)
    oss_packs["fonts"] = op_fonts
    dump(ORG / "data" / "oss-packs.json", oss_packs, indent=1)

    overlay_n = 0
    for old, canon, f in overlay_writes:
        dest = overlay_dir / (canon + ".json")
        dump(dest, f, indent=1)
        overlay_n += 1
        src = overlay_dir / (old + ".json")
        if old != canon and src.exists() and src.resolve() != dest.resolve():
            # keep old overlay bytes as-is (rollback). dest already new content.
            pass

    text_n = 0
    for src, dest in text_copies:
        if dest.exists() and dest.resolve() == src.resolve():
            continue
        shutil.copy2(src, dest)
        text_n += 1

    hist = {"generated": TODAY, "maps": history_maps, "nomatch": report["nomatch_names"]}
    dump(ORG / "data" / "norm-history.json", hist, indent=1)

    batch_names = [
        "みかちゃん",
        "カイソウ",
        "キンカク",
        "サマサン",
        "字咍粉圓",
        "字咍粉圆",
        "寒蝉高黑",
        "梦源黑体（Pal3love）",
        "梦源宋体·Pal3love",
        "BestTen",
        "LanaPixel",
        "台北字体",
        "坊宋",
        "柳宋",
        "粗宋",
    ]
    by_name = {f.get("name"): f for f in fonts}
    for n in batch_names:
        f = by_name.get(n)
        report["batch14"][n] = None if not f else {
            "norm": f.get("norm"),
            "family": f.get("family"),
            "shop": f.get("shop"),
        }

    report["overlay_writes"] = overlay_n
    report["license_text_copies"] = text_n
    report["history_maps"] = len(history_maps)
    report["licenses"] = len(new_licenses)
    dump(ORG / "data" / "_org-shorts-apply-20261007.json", report, indent=2)

    print(
        "org shorts: move=%d same=%d family_only=%d nomatch=%d dest_skip=%d overlays=%d texts=%d fonts=%d"
        % (
            report["move"],
            report["same"],
            report["family_only"],
            report["nomatch"],
            len(report["dest_skip"]),
            overlay_n,
            text_n,
            len(fonts),
        )
    )
    print("寒蝉高黑", report["batch14"].get("寒蝉高黑"))
    print("みかちゃん in org", report["batch14"].get("みかちゃん"))
    if report["dest_skip"]:
        print("dest_skip", report["dest_skip"])


if __name__ == "__main__":
    main()
