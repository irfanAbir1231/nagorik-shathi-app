#!/usr/bin/env python3
"""Extract reusable slide assets from a PPTX with slide-aware manifests.

This is deliberately package-first: original bytes are copied from OPC parts,
while rendered occurrence crops are taken from full-slide previews.  It does not
attempt semantic segmentation of flattened artwork.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import io
import json
import math
import os
import posixpath
import shutil
import subprocess
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable

from lxml import etree
from PIL import Image, ImageDraw, ImageFont


NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pr": "http://schemas.openxmlformats.org/package/2006/relationships",
    "c": "http://schemas.openxmlformats.org/drawingml/2006/chart",
    "dgm": "http://schemas.openxmlformats.org/drawingml/2006/diagram",
}
R_NS = NS["r"]
EMU_PER_INCH = 914400

INTERESTING_REL_TAILS = {
    "image", "audio", "video", "media", "oleObject", "package", "chart",
    "diagramData", "diagramLayout", "diagramQuickStyle", "diagramColors",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def qlocal(el: etree._Element) -> str:
    return etree.QName(el).localname


def read_xml(zf: zipfile.ZipFile, name: str) -> etree._Element:
    return etree.fromstring(zf.read(name))


def rels_name(part: str) -> str:
    return posixpath.join(posixpath.dirname(part), "_rels", posixpath.basename(part) + ".rels")


def relationships(zf: zipfile.ZipFile, part: str) -> dict[str, dict[str, str]]:
    rn = rels_name(part)
    if rn not in zf.namelist():
        return {}
    root = read_xml(zf, rn)
    out: dict[str, dict[str, str]] = {}
    for rel in root:
        rid = rel.get("Id")
        target = rel.get("Target", "")
        mode = rel.get("TargetMode", "Internal")
        resolved = target if mode == "External" else posixpath.normpath(
            posixpath.join(posixpath.dirname(part), target)
        )
        out[rid] = {
            "id": rid,
            "type": rel.get("Type", ""),
            "target": target,
            "resolved_target": resolved,
            "target_mode": mode,
        }
    return out


def detect_extension(data: bytes, package_name: str) -> str:
    h = data[:64]
    stripped = data.lstrip()[:256].lower()
    if h.startswith(b"\x89PNG\r\n\x1a\n"): return "png"
    if h.startswith(b"\xff\xd8\xff"): return "jpg"
    if h.startswith((b"GIF87a", b"GIF89a")): return "gif"
    if h.startswith(b"RIFF") and h[8:12] == b"WEBP": return "webp"
    if h.startswith(b"RIFF") and h[8:12] == b"WAVE": return "wav"
    if h.startswith(b"ID3") or (len(h) > 2 and h[0] == 0xFF and h[1] & 0xE0 == 0xE0): return "mp3"
    if len(h) >= 12 and h[4:8] == b"ftyp": return "mp4"
    if h.startswith(b"%PDF-"): return "pdf"
    if h.startswith(b"PK\x03\x04"):
        ext = Path(package_name).suffix.lower().lstrip(".")
        return ext if ext in {"xlsx", "xlsm", "docx", "pptx", "zip"} else "zip"
    if h.startswith(b"\xd7\xcd\xc6\x9a"): return "wmf"
    if len(h) > 44 and h[40:44] == b" EMF": return "emf"
    if b"<svg" in stripped: return "svg"
    if stripped.startswith((b"<?xml", b"<")): return "xml"
    ext = Path(package_name).suffix.lower().lstrip(".")
    return ext or "bin"


def image_dimensions(data: bytes, ext: str) -> tuple[int | None, int | None]:
    try:
        with Image.open(io.BytesIO(data)) as im:
            return int(im.width), int(im.height)
    except Exception:
        pass
    if ext == "svg":
        try:
            root = etree.fromstring(data)
            def num(v: str | None) -> float | None:
                if not v: return None
                s = "".join(c for c in v if c.isdigit() or c in ".-")
                return float(s) if s else None
            w, h = num(root.get("width")), num(root.get("height"))
            if (w is None or h is None) and root.get("viewBox"):
                vb = [float(x) for x in root.get("viewBox").replace(",", " ").split()]
                if len(vb) == 4: w, h = vb[2], vb[3]
            return int(w) if w else None, int(h) if h else None
        except Exception:
            pass
    return None, None


def xfrm_for(el: etree._Element) -> dict[str, Any] | None:
    candidates = el.xpath("./p:spPr/a:xfrm | ./p:grpSpPr/a:xfrm | ./p:xfrm", namespaces=NS)
    if not candidates:
        return None
    x = candidates[0]
    off = x.find("a:off", NS)
    ext = x.find("a:ext", NS)
    if off is None or ext is None:
        return None
    xe, ye = int(off.get("x", 0)), int(off.get("y", 0))
    cxe, cye = int(ext.get("cx", 0)), int(ext.get("cy", 0))
    return {
        "x_emu": xe, "y_emu": ye, "width_emu": cxe, "height_emu": cye,
        "x_in": round(xe / EMU_PER_INCH, 5), "y_in": round(ye / EMU_PER_INCH, 5),
        "width_in": round(cxe / EMU_PER_INCH, 5), "height_in": round(cye / EMU_PER_INCH, 5),
        "rotation_degrees": round(int(x.get("rot", 0)) / 60000, 5),
        "flip_horizontal": x.get("flipH") in {"1", "true"},
        "flip_vertical": x.get("flipV") in {"1", "true"},
    }


def visual_bbox(meta: dict[str, Any], slide_w: int, slide_h: int, px_w: int, px_h: int) -> tuple[int, int, int, int]:
    x, y, w, h = meta["x_emu"], meta["y_emu"], meta["width_emu"], meta["height_emu"]
    angle = math.radians(meta.get("rotation_degrees", 0) % 360)
    rw = abs(w * math.cos(angle)) + abs(h * math.sin(angle))
    rh = abs(w * math.sin(angle)) + abs(h * math.cos(angle))
    cx, cy = x + w / 2, y + h / 2
    left, top, right, bottom = cx - rw / 2, cy - rh / 2, cx + rw / 2, cy + rh / 2
    pad_x, pad_y = slide_w * 0.003, slide_h * 0.003
    left, top, right, bottom = left-pad_x, top-pad_y, right+pad_x, bottom+pad_y
    return (
        max(0, int(left / slide_w * px_w)), max(0, int(top / slide_h * px_h)),
        min(px_w, int(math.ceil(right / slide_w * px_w))),
        min(px_h, int(math.ceil(bottom / slide_h * px_h))),
    )


def crop_values(el: etree._Element) -> dict[str, float] | None:
    src = el.find(".//a:srcRect", NS)
    if src is None:
        return None
    vals = {k: int(src.get(k, 0)) / 1000 for k in ("l", "t", "r", "b")}
    return vals if any(vals.values()) else None


def shape_identity(el: etree._Element) -> tuple[str | None, str | None]:
    nv = el.xpath("./p:nvPicPr/p:cNvPr | ./p:nvSpPr/p:cNvPr | ./p:nvGraphicFramePr/p:cNvPr | ./p:nvGrpSpPr/p:cNvPr", namespaces=NS)
    return (nv[0].get("id"), nv[0].get("name")) if nv else (None, None)


def has_visible_text(el: etree._Element) -> bool:
    return bool("".join(el.xpath(".//a:t/text()", namespaces=NS)).strip())


def classify(kind: str, ext: str, bbox: dict[str, Any] | None, sw: int, sh: int) -> str:
    if kind == "chart": return "chart"
    if kind in {"diagram", "native_group"}: return "diagram"
    if kind == "native_shape": return "decorative"
    if kind == "video": return "video"
    if kind == "audio": return "audio"
    if kind in {"ole_object", "embedded_package"}: return "other"
    if kind == "image" and bbox and bbox["width_emu"] >= sw * .94 and bbox["height_emu"] >= sh * .94:
        return "background"
    return "unknown"


def rel_tail(rel_type: str) -> str:
    return rel_type.rsplit("/", 1)[-1]


def iter_top_level_visuals(root: etree._Element) -> Iterable[etree._Element]:
    sp_tree = root.find(".//p:spTree", NS)
    if sp_tree is None:
        return []
    return [x for x in sp_tree if qlocal(x) in {"pic", "sp", "grpSp", "graphicFrame", "cxnSp"}]


def collect_part_assets(zf: zipfile.ZipFile, part: str, scope: str, sw: int, sh: int) -> list[dict[str, Any]]:
    root = read_xml(zf, part)
    rels = relationships(zf, part)
    found: list[dict[str, Any]] = []
    used_rids: set[str] = set()
    for z_index, el in enumerate(iter_top_level_visuals(root)):
        tag = qlocal(el)
        sid, sname = shape_identity(el)
        bbox = xfrm_for(el)
        base = {"source_part": part, "source_scope": scope, "z_order": z_index,
                "shape_id": sid, "shape_name": sname, "position": bbox}
        blips = el.xpath(".//a:blip", namespaces=NS)
        for blip_index, blip in enumerate(blips):
            rid = blip.get(f"{{{R_NS}}}embed") or blip.get(f"{{{R_NS}}}link")
            if not rid or rid not in rels: continue
            used_rids.add(rid)
            r = rels[rid]
            found.append({**base, "kind": "image", "relationship": r,
                          "blip_index": blip_index, "crop": crop_values(el),
                          "mask_shape": (el.find(".//a:prstGeom", NS).get("prst") if el.find(".//a:prstGeom", NS) is not None else None)})
        chart = el.find(".//c:chart", NS)
        if chart is not None:
            rid = chart.get(f"{{{R_NS}}}id")
            if rid in rels:
                used_rids.add(rid); found.append({**base, "kind": "chart", "relationship": rels[rid]})
        ole = el.find(".//p:oleObj", NS)
        if ole is not None:
            rid = ole.get(f"{{{R_NS}}}id")
            if rid in rels:
                used_rids.add(rid); found.append({**base, "kind": "ole_object", "relationship": rels[rid]})
        for media_tag in ("videoFile", "audioFile"):
            for med in el.xpath(f'.//*[local-name()="{media_tag}"]'):
                rid = med.get(f"{{{R_NS}}}link") or med.get(f"{{{R_NS}}}embed")
                if rid in rels:
                    used_rids.add(rid); found.append({**base, "kind": "video" if media_tag == "videoFile" else "audio", "relationship": rels[rid]})
        if tag == "grpSp":
            found.append({**base, "kind": "native_group", "xml_bytes": etree.tostring(el, xml_declaration=True, encoding="UTF-8")})
        elif tag in {"sp", "cxnSp"} and el.find(".//p:ph", NS) is None and not blips:
            kind = "native_text" if has_visible_text(el) else "native_shape"
            found.append({**base, "kind": kind,
                          "text_content": "".join(el.xpath(".//a:t/text()", namespaces=NS)).strip() or None,
                          "xml_bytes": etree.tostring(el, xml_declaration=True, encoding="UTF-8")})

    # Background image fills are outside spTree.
    for blip in root.xpath(".//p:bg//a:blip", namespaces=NS):
        rid = blip.get(f"{{{R_NS}}}embed") or blip.get(f"{{{R_NS}}}link")
        if rid in rels and rid not in used_rids:
            used_rids.add(rid)
            found.append({"source_part": part, "source_scope": scope, "z_order": -1,
                          "shape_id": None, "shape_name": "Background", "position": {
                              "x_emu": 0, "y_emu": 0, "width_emu": sw, "height_emu": sh,
                              "x_in": 0, "y_in": 0, "width_in": round(sw/EMU_PER_INCH,5),
                              "height_in": round(sh/EMU_PER_INCH,5), "rotation_degrees": 0,
                              "flip_horizontal": False, "flip_vertical": False},
                          "kind": "image", "relationship": rels[rid], "crop": None, "mask_shape": None})

    # Catch embedded/media relationships that are not represented by the common high-level nodes.
    for rid, r in rels.items():
        tail = rel_tail(r["type"])
        if rid in used_rids or tail not in INTERESTING_REL_TAILS:
            continue
        kind = {"image": "image", "audio": "audio", "video": "video", "media": "other",
                "oleObject": "ole_object", "package": "embedded_package", "chart": "chart"}.get(tail, "diagram")
        found.append({"source_part": part, "source_scope": scope, "z_order": None,
                      "shape_id": None, "shape_name": None, "position": None,
                      "kind": kind, "relationship": r, "relationship_only": True})
    return found


def dependent_parts(zf: zipfile.ZipFile, part: str) -> list[str]:
    out = []
    for r in relationships(zf, part).values():
        if r["target_mode"] == "Internal" and r["resolved_target"] in zf.namelist():
            tail = rel_tail(r["type"])
            if tail in {"package", "image", "chartUserShapes", "chartStyle", "chartColorStyle"}:
                out.append(r["resolved_target"])
    return out


def presentation_order(zf: zipfile.ZipFile) -> tuple[list[str], int, int]:
    pres = read_xml(zf, "ppt/presentation.xml")
    rels = relationships(zf, "ppt/presentation.xml")
    order = []
    for sid in pres.xpath("./p:sldIdLst/p:sldId", namespaces=NS):
        rid = sid.get(f"{{{R_NS}}}id")
        if rid in rels: order.append(rels[rid]["resolved_target"])
    size = pres.find("p:sldSz", NS)
    return order, int(size.get("cx")), int(size.get("cy"))


def inherited_parts(zf: zipfile.ZipFile, slide_part: str) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    slide_rels = relationships(zf, slide_part)
    layout = next((r["resolved_target"] for r in slide_rels.values() if rel_tail(r["type"]) == "slideLayout"), None)
    if layout and layout in zf.namelist():
        out.append((layout, "layout"))
        lrels = relationships(zf, layout)
        master = next((r["resolved_target"] for r in lrels.values() if rel_tail(r["type"]) == "slideMaster"), None)
        if master and master in zf.namelist(): out.append((master, "master"))
    return out


def find_preview(preview_dir: Path, slide_num: int) -> Path | None:
    for name in (f"slide-{slide_num}.png", f"slide_{slide_num}.png", f"{slide_num}.png"):
        p = preview_dir / name
        if p.exists(): return p
    return None


def save_occurrence(zf: zipfile.ZipFile, item: dict[str, Any], slide_dir: Path, idx: int,
                    slide_num: int, sw: int, sh: int, preview: Image.Image | None) -> dict[str, Any]:
    stem = f"asset_{idx:02d}"
    rel = item.get("relationship")
    original_name = None
    package_path = None
    source_filename = None
    components: list[dict[str, Any]] = []
    if "xml_bytes" in item:
        data = item["xml_bytes"]
        ext = "xml"
        source_filename = item.get("shape_name")
    elif rel and rel["target_mode"] == "Internal" and rel["resolved_target"] in zf.namelist():
        package_path = rel["resolved_target"]
        data = zf.read(package_path)
        ext = detect_extension(data, package_path)
        source_filename = Path(package_path).name
    elif rel and rel["target_mode"] == "External":
        data = json.dumps({"external_target": rel["target"], "relationship_type": rel["type"]}, indent=2).encode()
        ext = "json"
        source_filename = rel["target"]
    else:
        data = b""
        ext = "bin"
    original_name = f"{stem}_original.{ext}"
    (slide_dir / original_name).write_bytes(data)
    wpx, hpx = image_dimensions(data, ext)
    rendered_name = None
    bbox = item.get("position")
    if preview is not None and bbox and bbox.get("width_emu", 0) > 0 and bbox.get("height_emu", 0) > 0:
        box = visual_bbox(bbox, sw, sh, preview.width, preview.height)
        if box[2] > box[0] and box[3] > box[1]:
            rendered_name = f"{stem}_rendered.png"
            preview.crop(box).save(slide_dir / rendered_name, "PNG")
    if package_path and item["kind"] in {"chart", "ole_object", "embedded_package", "diagram"}:
        for ci, dep in enumerate(dependent_parts(zf, package_path), 1):
            b = zf.read(dep); dext = detect_extension(b, dep)
            fn = f"{stem}_component_{ci:02d}.{dext}"
            (slide_dir / fn).write_bytes(b)
            components.append({"filename": fn, "package_path": dep, "sha256": sha256(b), "source_filename": Path(dep).name})
    rec = {
        "asset_id": f"slide_{slide_num:02d}_asset_{idx:02d}",
        "filename": original_name,
        "rendered_filename": rendered_name,
        "type": classify(item["kind"], ext, bbox, sw, sh),
        "object_kind": item["kind"],
        "original_format": ext,
        "width_px": wpx, "height_px": hpx,
        "position": bbox,
        "rotation": bbox.get("rotation_degrees") if bbox else None,
        "cropped": bool(item.get("crop")), "crop_percent": item.get("crop"),
        "flip_horizontal": bbox.get("flip_horizontal") if bbox else None,
        "flip_vertical": bbox.get("flip_vertical") if bbox else None,
        "mask_shape": item.get("mask_shape"),
        "opacity": None,
        "z_order": item.get("z_order"),
        "shape_id": item.get("shape_id"), "shape_name": item.get("shape_name"),
        "text_content": item.get("text_content"),
        "source_scope": item.get("source_scope"), "source_part": item.get("source_part"),
        "package_path": package_path, "source_filename": source_filename,
        "relationship_id": rel.get("id") if rel else None,
        "relationship_type": rel.get("type") if rel else None,
        "sha256": sha256(data), "components": components,
        "reused_on_slides": [], "reuse_count": 1,
    }
    return rec


def make_contact_sheet(records: list[dict[str, Any]], output: Path) -> None:
    visual = [r for r in records if r.get("slide") and (r.get("rendered_path") or r["original_format"] in {"png","jpg","jpeg","gif","webp"})]
    if len(visual) > 500:
        cols, tile_w, tile_h, font_size = 16, 180, 140, 9
    elif len(visual) > 200:
        cols, tile_w, tile_h, font_size = 10, 220, 170, 10
    else:
        cols, tile_w, tile_h, font_size = 4, 360, 290, 14
    rows = max(1, math.ceil(len(visual) / cols))
    sheet = Image.new("RGB", (cols * tile_w, rows * tile_h), "white")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=font_size)
    for i, r in enumerate(visual):
        x, y = (i % cols) * tile_w, (i // cols) * tile_h
        path = Path(r.get("rendered_path") or r["absolute_path"])
        try:
            with Image.open(path) as im:
                thumb = im.convert("RGB"); thumb.thumbnail((tile_w - 20, tile_h - 58))
                px = x + (tile_w - thumb.width) // 2; py = y + 8 + (tile_h - 58 - thumb.height) // 2
                sheet.paste(thumb, (px, py))
        except Exception:
            draw.rectangle((x+10, y+10, x+tile_w-10, y+tile_h-58), outline="#bbbbbb")
        label = f"{r['asset_id']} | Slide {r['slide']:02d}\n{r['filename']}"
        draw.multiline_text((x+10, y+tile_h-46), label, fill="black", font=font, spacing=2)
        draw.rectangle((x, y, x+tile_w-1, y+tile_h-1), outline="#d0d0d0")
    sheet.save(output, "PNG")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input_pptx", type=Path)
    ap.add_argument("output_dir", type=Path)
    ap.add_argument("--preview-dir", type=Path)
    ap.add_argument("--render-script", type=Path, help="Optional render_slides.py; invoked when previews are absent")
    ap.add_argument("--render-width", type=int, default=1920)
    ap.add_argument("--render-height", type=int, default=1080)
    args = ap.parse_args()
    src = args.input_pptx.resolve(); out = args.output_dir.resolve()
    out.mkdir(parents=True, exist_ok=True)
    preview_dir = (args.preview_dir or (out / "_rendered_slides")).resolve()
    if args.render_script and not preview_dir.exists():
        preview_dir.mkdir(parents=True, exist_ok=True)
        subprocess.run([sys.executable, str(args.render_script), str(src), "--output_dir", str(preview_dir),
                        "--width", str(args.render_width), "--height", str(args.render_height)], check=True)

    with zipfile.ZipFile(src) as zf:
        slides, sw, sh = presentation_order(zf)
        all_records: list[dict[str, Any]] = []
        referenced_package_paths: set[str] = set()
        flattened_slides: list[int] = []
        for sn, slide_part in enumerate(slides, 1):
            slide_dir = out / f"slide_{sn:02d}"; slide_dir.mkdir(parents=True, exist_ok=True)
            pp = find_preview(preview_dir, sn)
            preview = Image.open(pp).convert("RGBA") if pp else None
            if preview is not None: preview.save(slide_dir / "slide_preview.png", "PNG")
            candidates = collect_part_assets(zf, slide_part, "slide", sw, sh)
            for inherited, scope in inherited_parts(zf, slide_part):
                candidates.extend(collect_part_assets(zf, inherited, scope, sw, sh))
            # Deterministic de-dupe of the exact same relationship/object discovered twice.
            seen = set(); unique_candidates = []
            for c in candidates:
                r = c.get("relationship") or {}
                key = (c.get("source_part"), c.get("shape_id"), c.get("kind"), r.get("id"), sha256(c.get("xml_bytes", b"")) if c.get("xml_bytes") else None)
                if key in seen: continue
                seen.add(key); unique_candidates.append(c)
            assets = []
            for idx, item in enumerate(unique_candidates, 1):
                rec = save_occurrence(zf, item, slide_dir, idx, sn, sw, sh, preview)
                rec["slide"] = sn
                rec["absolute_path"] = str((slide_dir / rec["filename"]).resolve())
                rec["rendered_path"] = str((slide_dir / rec["rendered_filename"]).resolve()) if rec["rendered_filename"] else None
                if rec["package_path"]: referenced_package_paths.add(rec["package_path"])
                for comp in rec["components"]: referenced_package_paths.add(comp["package_path"])
                assets.append(rec); all_records.append(rec)
            slide_root = read_xml(zf, slide_part)
            top_visuals = list(iter_top_level_visuals(slide_root))
            pics = [e for e in top_visuals if qlocal(e) == "pic"]
            flattened = len(pics) == 1 and len([e for e in top_visuals if qlocal(e) in {"sp","grpSp","graphicFrame"} and (qlocal(e)!="sp" or e.find(".//p:ph",NS) is None)]) == 0
            if flattened: flattened_slides.append(sn)
            manifest = {"slide_number": sn, "slide_part": slide_part, "flattened": flattened,
                        "flattened_note": "A single raster picture is the only non-placeholder visual; internal elements baked into it cannot be independently recovered." if flattened else None,
                        "preview_filename": "slide_preview.png" if preview is not None else None,
                        "assets": assets}
            (slide_dir / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
            if preview is not None: preview.close()

        # Reuse is based on unmodified original bytes.
        by_hash: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for r in all_records: by_hash[r["sha256"]].append(r)
        for group in by_hash.values():
            slides_used = sorted({r["slide"] for r in group})
            for r in group:
                r["reuse_count"] = len(group)
                r["first_occurrence_slide"] = min(slides_used)
                r["reused_on_slides"] = [s for s in slides_used if s != r["slide"]]
        # Rewrite slide manifests after reuse annotation.
        for sn in range(1, len(slides)+1):
            mp = out / f"slide_{sn:02d}" / "manifest.json"
            m = json.loads(mp.read_text(encoding="utf-8"))
            lookup = {r["asset_id"]: r for r in all_records if r["slide"] == sn}
            m["assets"] = [lookup[a["asset_id"]] for a in m["assets"]]
            mp.write_text(json.dumps(m, indent=2, ensure_ascii=False), encoding="utf-8")

        # Package media/embeddings not associated with a visible slide object.
        package_candidates = sorted(n for n in zf.namelist() if n.startswith(("ppt/media/", "ppt/embeddings/")) and not n.endswith("/"))
        orphans = [n for n in package_candidates if n not in referenced_package_paths]
        orphan_records = []
        if orphans:
            od = out / "unassigned"; od.mkdir(exist_ok=True)
            for i, part in enumerate(orphans, 1):
                data = zf.read(part); ext = detect_extension(data, part); fn = f"asset_{i:02d}_original.{ext}"
                (od/fn).write_bytes(data); w,h = image_dimensions(data,ext)
                orphan_records.append({"asset_id":f"unassigned_asset_{i:02d}","slide":None,"filename":fn,
                                       "type":"unknown","object_kind":"unassigned_package_part","original_format":ext,
                                       "width_px":w,"height_px":h,"sha256":sha256(data),"package_path":part,
                                       "source_filename":Path(part).name,"reuse_count":1,"reused_on_slides":[],
                                       "absolute_path":str((od/fn).resolve()),"rendered_path":None})

        counts = Counter(r["type"] for r in all_records)
        unique_hashes = set(by_hash)
        reused_hashes = {h for h,g in by_hash.items() if len(g)>1}
        summary = {
            "slide_count": len(slides), "unique_assets": len(unique_hashes),
            "total_asset_occurrences": len(all_records), "duplicated_or_reused_unique_assets": len(reused_hashes),
            "flattened_slide_count": len(flattened_slides), "flattened_slides": flattened_slides,
            "video_count": counts["video"], "audio_count": counts["audio"],
            "vector_asset_count": sum(1 for r in all_records if r["original_format"] in {"svg","emf","wmf"} or r["object_kind"] in {"native_shape","native_text","native_group"}),
            "embedded_object_count": sum(1 for r in all_records if r["object_kind"] in {"ole_object","embedded_package"}),
            "unassigned_package_asset_count": len(orphan_records),
        }
        global_manifest = {
            "source_pptx": str(src), "source_sha256": sha256(src.read_bytes()),
            "slide_size_emu": {"width":sw,"height":sh},
            "summary": summary,
            "limitations": [
                "Flattened raster artwork cannot be split into independent assets without segmentation, which was intentionally not performed.",
                "Rendered occurrence images are crops of the fully rendered slide and can include overlapping neighboring content when objects overlap.",
                "Native PowerPoint drawing objects are preserved as OOXML fragments plus rendered previews; OOXML fragments require PowerPoint-aware reconstruction for editing.",
                "Opacity is recorded as null when no reliable single object-level value is available from DrawingML effects.",
            ],
            "assets": all_records, "unassigned_package_assets": orphan_records,
        }
        (out/"manifest.json").write_text(json.dumps(global_manifest, indent=2, ensure_ascii=False), encoding="utf-8")
        make_contact_sheet(all_records, out/"contact_sheet.png")

        # Second-pass validation ledger.
        validation = {"valid": True, "checks": {}, "warnings": []}
        validation["checks"]["slide_folder_count"] = len(list(out.glob("slide_[0-9][0-9]")))
        validation["checks"]["slide_manifest_count"] = len(list(out.glob("slide_[0-9][0-9]/manifest.json")))
        validation["checks"]["slide_preview_count"] = len(list(out.glob("slide_[0-9][0-9]/slide_preview.png")))
        validation["checks"]["all_original_files_exist"] = all(Path(r["absolute_path"]).exists() for r in all_records)
        validation["checks"]["all_original_hashes_match"] = all(sha256(Path(r["absolute_path"]).read_bytes()) == r["sha256"] for r in all_records)
        validation["checks"]["all_slide_manifests_valid_json"] = True
        try:
            for mp in out.glob("slide_[0-9][0-9]/manifest.json"): json.loads(mp.read_text(encoding="utf-8"))
        except Exception as e:
            validation["checks"]["all_slide_manifests_valid_json"] = False; validation["warnings"].append(str(e))
        expected = len(slides)
        for key in ("slide_folder_count","slide_manifest_count","slide_preview_count"):
            if validation["checks"][key] != expected: validation["valid"] = False
        if not all(v for k,v in validation["checks"].items() if isinstance(v,bool)): validation["valid"] = False
        validation["checks"]["package_media_and_embeddings"] = len(package_candidates)
        validation["checks"]["package_assets_accounted_for"] = len(referenced_package_paths.intersection(package_candidates)) + len(orphans)
        if validation["checks"]["package_assets_accounted_for"] != len(package_candidates):
            validation["valid"] = False; validation["warnings"].append("Not all package media/embedding parts were accounted for.")
        (out/"validation_report.json").write_text(json.dumps(validation, indent=2), encoding="utf-8")
        print(json.dumps({"output_dir":str(out),"summary":summary,"validation":validation},indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
