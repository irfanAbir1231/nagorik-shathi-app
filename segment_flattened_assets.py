#!/usr/bin/env python3
"""Create clearly labelled, derived crops from flattened slide images.

The source pixels are never overwritten.  Crops with ``transparent=True`` use
border-colour matting to remove only the connected-looking flat background;
they are explicitly recorded as reconstructed assets, not embedded originals.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from extract_pptx_assets import make_contact_sheet


def B(label, kind, x1, y1, x2, y2, transparent=False):
    return {"label": label, "type": kind, "bbox": [x1, y1, x2, y2], "transparent": transparent}


# Coordinates are normalized to a 1920x1080 slide.  Labels use only visible
# content or neutral positional language.
PLAN = {
1: [
 B("citizen_request_card","ui screenshot",910,85,1315,285), B("land_records_card","ui screenshot",1500,105,1875,345),
 B("translation_card","ui screenshot",1245,325,1450,525), B("rules_card","ui screenshot",1270,545,1495,735),
 B("union_parishad_card","ui screenshot",1545,370,1875,565), B("social_safety_card","ui screenshot",1550,585,1885,760),
 B("document_platform","illustration",1160,745,1635,1030), B("verified_badge","icon",1655,765,1880,1015,True),
 B("citizen_scene","photo",585,285,1245,1050), B("service_flow_composite","diagram",900,80,1900,1030),
 B("citizen_icon","icon",925,105,1035,225,True), B("government_building_icon","icon",1530,145,1660,300,True),
 B("union_building_icon","icon",1560,400,1680,535,True), B("people_icon","icon",1590,610,1705,725,True),
 B("brain_icon","icon",1260,345,1405,455,True), B("shield_icon","icon",1310,560,1435,685,True),
],
2: [
 B("widow_question_card","ui screenshot",905,115,1335,325), B("disability_question_card","ui screenshot",1535,175,1875,390),
 B("work_assistance_card","ui screenshot",785,375,1195,585), B("citizen_scene","photo",720,235,1915,1045),
 B("service_cards_stack","ui screenshot",1505,420,1770,810), B("bottom_callout","ui screenshot",75,845,725,985),
 B("citizen_icon_a","icon",925,130,1025,230,True), B("citizen_icon_b","icon",1560,195,1665,300,True),
 B("government_icon","icon",1530,430,1650,555,True), B("shield_icon","icon",1555,565,1665,685,True),
 B("people_icon","icon",1570,690,1680,800,True), B("woman_portrait","photo",1010,345,1635,945),
],
3: [
 B("discover_card","ui screenshot",70,465,380,840), B("understand_card","ui screenshot",450,465,735,840),
 B("decide_card","ui screenshot",815,465,1100,840), B("act_card","ui screenshot",1180,465,1470,840),
 B("trust_remedy_card","ui screenshot",1540,465,1840,840), B("chain_support_banner","ui screenshot",525,865,1400,1015),
 B("discover_icon","icon",145,500,310,665,True), B("understand_icon","icon",530,500,690,650,True),
 B("decide_icon","icon",885,490,1045,655,True), B("act_icon","icon",1240,495,1405,655,True),
 B("trust_icon","icon",1610,495,1775,655,True), B("chain_links","decorative",330,540,1610,650,True),
],
4: [
 B("central_shebar_card","ui screenshot",945,350,1370,785), B("mygov_card","ui screenshot",950,100,1335,290),
 B("helpline_card","ui screenshot",550,395,880,585), B("union_digital_card","ui screenshot",1430,395,1760,585),
 B("ministry_card","ui screenshot",545,720,915,905), B("general_ai_card","ui screenshot",1405,720,1775,905),
 B("channel_network","diagram",525,80,1810,930), B("bottom_banner","ui screenshot",295,930,1725,1045),
 B("citizen_icon","icon",1080,385,1240,520,True), B("headset_icon","icon",590,420,720,545,True),
 B("union_icon","icon",1450,420,1575,550,True), B("ministry_icon","icon",575,745,700,870,True),
 B("robot_icon","icon",1425,745,1550,870,True), B("monitor_icon","icon",985,125,1110,250,True),
],
5: [
 B("citizen_scene","photo",0,390,325,940), B("need_card","ui screenshot",325,470,500,790),
 B("find_card","ui screenshot",565,470,745,790), B("check_card","ui screenshot",805,470,995,790),
 B("explain_card","ui screenshot",1060,470,1260,790), B("act_card","ui screenshot",1315,470,1515,790),
 B("track_terminal","ui screenshot",1570,250,1915,900), B("journey_pipeline","diagram",305,380,1885,835),
 B("need_icon","icon",345,495,485,640,True), B("find_icon","icon",585,495,725,640,True),
 B("check_icon","icon",825,495,975,640,True), B("explain_icon","icon",1080,495,1235,640,True),
 B("act_icon","icon",1335,495,1490,640,True), B("track_icon","icon",1630,465,1805,620,True),
 B("bottom_banner","ui screenshot",540,925,1405,1040), B("woman_cutout","photo",75,420,300,945),
],
6: [
 B("citizen_input_card","ui screenshot",45,350,250,750), B("normalization_card","ui screenshot",285,350,480,750),
 B("intent_card","ui screenshot",510,350,705,750), B("retrieval_card","ui screenshot",735,350,945,800),
 B("eligibility_card","ui screenshot",970,350,1185,800), B("response_plan_card","ui screenshot",1210,350,1420,750),
 B("bilingual_card","ui screenshot",1440,350,1655,750), B("next_step_card","ui screenshot",1670,350,1880,750),
 B("pipeline","diagram",40,330,1885,810), B("language_band","ui screenshot",45,790,750,930),
 B("rules_band","ui screenshot",700,790,1335,930), B("response_band","ui screenshot",1290,790,1885,930),
 B("speech_icon","icon",70,390,220,555,True), B("translation_icon","icon",315,390,455,555,True),
 B("intent_icon","icon",545,390,685,555,True), B("retrieval_icon","icon",765,370,920,560,True),
 B("shield_icon","icon",1000,385,1160,565,True), B("plan_icon","icon",1240,390,1395,560,True),
 B("bilingual_icon","icon",1465,390,1635,565,True), B("door_icon","icon",1710,385,1845,565,True),
 B("bottom_note","ui screenshot",45,935,1880,1045),
],
7: [
 B("citizen_statement_panel","ui screenshot",220,325,805,875), B("statement_bubble","ui screenshot",260,465,750,755),
 B("facts_panel","ui screenshot",845,250,1345,690), B("unknown_panel","ui screenshot",855,685,1340,940),
 B("programmes_panel","ui screenshot",1370,250,1885,950), B("widow_allowance_row","ui screenshot",1410,390,1835,550),
 B("old_age_row","ui screenshot",1410,550,1835,710), B("disability_row","ui screenshot",1410,710,1835,875),
 B("citizen_icon","icon",250,345,370,465,True), B("microphone_icon","icon",245,740,370,850,True),
 B("facts_icon","icon",880,270,995,380,True), B("unknown_icon","icon",880,690,995,810,True),
 B("widow_icon","icon",1420,400,1535,535,True), B("elderly_icon","icon",1420,565,1535,700,True),
 B("wheelchair_icon","icon",1420,720,1545,855,True), B("bottom_note","ui screenshot",620,930,1590,1045),
],
8: [
 B("rule_trace_panel","ui screenshot",70,325,1225,915), B("overall_guidance_panel","ui screenshot",1250,390,1855,650),
 B("status_legend","ui screenshot",1255,645,1855,915), B("bottom_note","ui screenshot",70,930,1850,1045),
 B("rule_trace_icon","icon",1050,340,1185,455,True), B("citizen_icon","icon",160,445,280,555,True),
 B("calendar_icon","icon",160,555,280,665,True), B("income_icon","icon",160,660,280,770,True),
 B("document_icon","icon",160,760,280,870,True), B("guidance_shield","icon",1660,390,1810,525,True),
 B("pass_icon","icon",1300,655,1425,770,True), B("fail_icon","icon",1300,745,1425,850,True),
 B("unknown_icon","icon",1300,825,1425,920,True), B("chat_icon","icon",95,940,210,1035,True),
],
9: [
 B("evidence_panel","ui screenshot",65,245,595,900), B("adversarial_panel","ui screenshot",610,245,1235,900),
 B("provider_flow_panel","ui screenshot",1260,245,1855,900), B("bottom_note","ui screenshot",45,910,1875,1035),
 B("evidence_icon","icon",100,270,220,380,True), B("database_icon","icon",130,390,250,485,True),
 B("search_icon","icon",130,480,250,585,True), B("citizen_icon","icon",130,580,250,690,True),
 B("official_source_icon","icon",130,680,250,795,True), B("system_state_icon","icon",130,775,250,885,True),
 B("adversary_icon","icon",650,405,780,535,True), B("shield_icon","icon",650,585,780,725,True),
 B("retrieval_icon","icon",1300,370,1435,485,True), B("engine_icon","icon",1300,495,1435,610,True),
 B("plan_icon","icon",1300,615,1435,730,True), B("composer_icon","icon",1300,735,1435,855,True),
 B("hero_shield_scene","illustration",1500,20,1900,250), B("plant","decorative",1630,885,1840,1035,True),
],
10: [
 B("bilingual_web_card","ui screenshot",90,370,445,750), B("voice_card","ui screenshot",460,370,810,750),
 B("ussd_card","ui screenshot",820,370,1165,750), B("assisted_use_card","ui screenshot",1170,370,1515,750),
 B("bangladesh_map","illustration",1280,20,1860,735,True), B("quote_banner","ui screenshot",70,760,1320,930),
 B("principles_banner","ui screenshot",70,935,1300,1045), B("web_icon","icon",170,395,365,555,True),
 B("voice_icon","icon",535,390,730,550,True), B("ussd_icon","icon",900,390,1080,555,True),
 B("assisted_icon","icon",1240,390,1440,555,True), B("landscape","illustration",1270,700,1915,1070),
],
11: [
 B("citizen_need_card","ui screenshot",45,450,325,805), B("bm25_card","ui screenshot",390,365,755,865),
 B("semantic_card","ui screenshot",785,365,1155,865), B("reranking_card","ui screenshot",1185,365,1550,865),
 B("ranked_programmes_card","ui screenshot",1590,475,1885,830), B("retrieval_pipeline","diagram",40,350,1885,875),
 B("citizen_icon","icon",110,480,270,630,True), B("bm25_icon","icon",485,390,665,575,True),
 B("semantic_icon","icon",875,390,1060,575,True), B("rerank_icon","icon",1270,390,1465,575,True),
 B("ranking_icon","icon",1640,500,1820,665,True), B("bottom_note","ui screenshot",450,900,1415,1030),
 B("flag_landscape","illustration",1450,125,1910,590),
],
12: [
 B("core_datasets_panel","ui screenshot",90,625,585,1020), B("dataset_placeholder","ui screenshot",625,750,930,1010),
 B("verified_corpus_panel","ui screenshot",1055,45,1835,1020), B("verified_header","ui screenshot",1085,80,1790,285),
 B("verified_row_1","ui screenshot",1100,300,1785,380), B("verified_row_2","ui screenshot",1100,375,1785,455),
 B("verified_row_3","ui screenshot",1100,450,1785,530), B("verified_row_4","ui screenshot",1100,525,1785,605),
 B("verified_row_5","ui screenshot",1100,600,1785,680), B("verified_row_6","ui screenshot",1100,675,1785,755),
 B("verified_row_7","ui screenshot",1100,750,1785,830), B("verified_row_8","ui screenshot",1100,825,1785,900),
 B("verified_row_9","ui screenshot",1100,900,1785,980), B("clipboard_icon","icon",1110,105,1260,250,True),
 B("plant","decorative",1640,770,1840,1010,True),
],
13: [
 B("governance_flow","diagram",80,360,1600,835), B("verification_states","ui screenshot",1600,145,1880,855),
 *[B(f"governance_step_{i+1}","ui screenshot",x,355,x+175,740) for i,x in enumerate([75,250,430,610,790,970,1145,1325,1480])],
 B("state_draft","ui screenshot",1630,245,1855,335), B("state_review","ui screenshot",1630,345,1855,435),
 B("state_verified","ui screenshot",1630,445,1855,535), B("state_expired","ui screenshot",1630,545,1855,635),
 B("state_superseded","ui screenshot",1630,645,1855,735), B("state_suspended","ui screenshot",1630,745,1855,835),
 B("bottom_note","ui screenshot",65,875,1875,1035),
],
14: [
 *[B(f"evaluation_card_{i+1}","ui screenshot",x,365,x+320,815) for i,x in enumerate([80,455,830,1205,1580])],
 *[B(f"evaluation_icon_{i+1}","icon",x,395,x+180,570,True) for i,x in enumerate([145,520,895,1270,1640])],
 B("bottom_note","ui screenshot",75,880,1855,1025),
],
15: [
 B("find_panel","ui screenshot",75,350,575,825), B("understand_panel","ui screenshot",600,350,1235,825),
 B("act_panel","ui screenshot",1250,350,1860,825), B("bottom_filters","diagram",75,850,1855,950),
 B("bottom_note","ui screenshot",70,955,1865,1045),
 B("find_header_icon","icon",100,370,250,520,True), B("understand_header_icon","icon",625,370,780,520,True),
 B("act_header_icon","icon",1275,370,1430,520,True),
 B("programme_icon","icon",125,545,260,690,True), B("time_icon","icon",380,545,515,690,True),
 B("condition_icon","icon",675,545,810,690,True), B("missing_icon","icon",870,545,1005,690,True),
 B("source_icon","icon",1070,545,1205,690,True), B("complete_icon","icon",1290,545,1425,690,True),
 B("document_icon","icon",1480,545,1615,690,True), B("office_icon","icon",1680,545,1815,690,True),
],
16: [
 *[B(f"architecture_row_{i+1}","ui screenshot",205,y,1710,y+85) for i,y in enumerate([315,405,495,585,675,765,855])],
 *[B(f"architecture_icon_{i+1}","icon",235,y+5,340,y+80,True) for i,y in enumerate([315,405,495,585,675,765,855])],
 B("bottom_note","ui screenshot",190,955,1715,1045),
],
17: [
 B("failure_matrix","ui screenshot",95,335,1245,925), B("promise_panel","ui screenshot",1320,285,1850,925),
 *[B(f"failure_row_{i+1}","ui screenshot",105,y,1215,y+100) for i,y in enumerate([400,500,600,700,800])],
 *[B(f"failure_icon_{i+1}","icon",120,y,235,y+105,True) for i,y in enumerate([400,500,600,700,800])],
 *[B(f"promise_row_{i+1}","ui screenshot",1360,y,1815,y+105) for i,y in enumerate([295,400,520,640,760])],
 B("bottom_note","ui screenshot",75,940,1855,1045),
],
18: [
 *[B(f"impact_column_{i+1}","ui screenshot",x,340,x+390,910) for i,x in enumerate([75,540,990,1440])],
 *[B(f"impact_row_{c+1}_{r+1}","ui screenshot",x+20,y,x+370,y+100) for c,x in enumerate([75,540,990,1440]) for r,y in enumerate([440,550,660,770])],
 B("bottom_question","ui screenshot",410,930,1535,1035),
],
19: [
 B("do_not_claim_panel","ui screenshot",95,330,920,920), B("residual_risk_panel","ui screenshot",980,330,1840,920),
 *[B(f"claim_row_{i+1}","ui screenshot",135,y,875,y+80) for i,y in enumerate([455,545,635,725,815])],
 *[B(f"risk_row_{i+1}","ui screenshot",1020,y,1785,y+80) for i,y in enumerate([455,545,635,725,815])],
 B("bottom_note","ui screenshot",75,935,1855,1045),
],
20: [
 B("language_card","ui screenshot",90,475,465,635), B("rules_card","ui screenshot",475,475,825,635),
 B("sources_card","ui screenshot",90,640,465,800), B("humans_card","ui screenshot",475,640,825,800),
 B("citizen_scene","photo",880,120,1620,1015), B("next_steps_stack","ui screenshot",1510,100,1890,825),
 B("union_office","illustration",1560,785,1845,1010), B("bottom_principles","diagram",65,835,970,945),
 B("language_icon","icon",115,500,235,620,True), B("rules_icon","icon",505,500,625,620,True),
 B("sources_icon","icon",115,665,235,785,True), B("humans_icon","icon",505,665,625,785,True),
],
}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def clean_opaque_corners(im: Image.Image) -> Image.Image:
    """Flatten to RGB and replace border-connected corner residue cleanly."""
    out = im.convert("RGB")
    arr = np.asarray(out)
    h, w = arr.shape[:2]
    bw = max(2, min(h, w) // 35)
    border = np.concatenate([
        arr[:bw].reshape(-1, 3), arr[-bw:].reshape(-1, 3),
        arr[:, :bw].reshape(-1, 3), arr[:, -bw:].reshape(-1, 3),
    ])
    bg = tuple(int(x) for x in np.median(border, axis=0))
    seeds = [(0,0),(w-1,0),(0,h-1),(w-1,h-1),(w//2,0),(w//2,h-1),(0,h//2),(w-1,h//2)]
    for seed in seeds:
        px = out.getpixel(seed)
        if sum((px[i]-bg[i])**2 for i in range(3)) ** 0.5 < 48:
            ImageDraw.floodfill(out, seed, bg, thresh=34)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("asset_root", type=Path)
    args = ap.parse_args()
    root = args.asset_root.resolve()
    global_manifest = json.loads((root/"manifest.json").read_text(encoding="utf-8"))
    base_assets = [a for a in global_manifest["assets"] if a.get("provenance") != "reconstructed_crop"]
    added = []
    for sn, entries in PLAN.items():
        sd = root/f"slide_{sn:02d}"
        smp = sd/"manifest.json"
        sm = json.loads(smp.read_text(encoding="utf-8"))
        sm["assets"] = [a for a in sm["assets"] if a.get("provenance") != "reconstructed_crop"]
        for old in sd.glob("asset_*_reconstructed_*.png"):
            old.unlink()
        src = Image.open(sd/"slide_preview.png").convert("RGBA")
        sx, sy = src.width/1920.0, src.height/1080.0
        idx = len(sm["assets"]) + 1
        for e in entries:
            x1,y1,x2,y2 = e["bbox"]
            pxbox = [max(0,round(x1*sx)),max(0,round(y1*sy)),min(src.width,round(x2*sx)),min(src.height,round(y2*sy))]
            crop = clean_opaque_corners(src.crop(tuple(pxbox)))
            safe = "".join(c if c.isalnum() else "_" for c in e["label"].lower()).strip("_")[:48]
            fn = f"asset_{idx:02d}_reconstructed_{safe}.png"
            path = sd/fn
            crop.save(path,"PNG")
            data = path.read_bytes()
            rec = {
                "asset_id": f"slide_{sn:02d}_asset_{idx:02d}", "slide": sn,
                "filename": fn, "rendered_filename": fn, "type": e["type"],
                "object_kind": "reconstructed_crop", "provenance": "reconstructed_crop",
                "original_format": "png", "width_px": crop.width, "height_px": crop.height,
                "position": None, "source_crop_px": {"left":pxbox[0],"top":pxbox[1],"right":pxbox[2],"bottom":pxbox[3]},
                "source_crop_normalized_1920x1080": e["bbox"], "semantic_label": e["label"],
                "transparent_background_derived": False, "alpha_channel": False,
                "corner_cleanup": "border-connected flood fill using sampled local background colour",
                "source_part": sm.get("slide_part"), "source_scope": "flattened_slide_raster",
                "source_filename": sm["assets"][0]["filename"], "package_path": sm["assets"][0].get("package_path"),
                "sha256": sha(data), "reuse_count": 1, "reused_on_slides": [],
                "absolute_path": str(path.resolve()), "rendered_path": str(path.resolve()),
                "limitations": "Derived opaque pixel crop; not an independently embedded source object. Occluded pixels were not reconstructed.",
            }
            sm["assets"].append(rec); added.append(rec); idx += 1
        src.close()
        sm["segmentation_override_applied"] = True
        sm["reconstructed_asset_count"] = len(entries)
        smp.write_text(json.dumps(sm,indent=2,ensure_ascii=False),encoding="utf-8")

    all_assets = base_assets + added
    groups = defaultdict(list)
    for a in all_assets: groups[a["sha256"]].append(a)
    for group in groups.values():
        slides = sorted({a["slide"] for a in group if a.get("slide") is not None})
        for a in group:
            a["reuse_count"] = len(group)
            a["first_occurrence_slide"] = min(slides) if slides else None
            a["reused_on_slides"] = [s for s in slides if s != a.get("slide")]
    global_manifest["assets"] = all_assets
    s = global_manifest["summary"]
    s["unique_assets"] = len(groups); s["total_asset_occurrences"] = len(all_assets)
    s["duplicated_or_reused_unique_assets"] = sum(1 for g in groups.values() if len(g)>1)
    s["reconstructed_crop_count"] = len(added)
    s["transparent_reconstructed_crop_count"] = 0
    s["opaque_corner_cleaned_crop_count"] = len(added)
    global_manifest["limitations"] = [x for x in global_manifest.get("limitations",[]) if not x.startswith("Flattened raster artwork cannot")]
    global_manifest["limitations"].insert(0,"Slides 1-20 were segmented into derived crops by explicit user override. These crops preserve source pixels but are not original independent objects.")
    (root/"manifest.json").write_text(json.dumps(global_manifest,indent=2,ensure_ascii=False),encoding="utf-8")
    make_contact_sheet(all_assets, root/"contact_sheet.png")
    make_contact_sheet(added, root/"reconstructed_contact_sheet.png")
    report_path = root/"validation_report.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    report["checks"]["reconstructed_crop_files"] = len(list(root.glob("slide_*/asset_*_reconstructed_*.png")))
    report["checks"]["reconstructed_crop_hashes_match"] = all(sha(Path(a["absolute_path"]).read_bytes())==a["sha256"] for a in added)
    report["checks"]["reconstructed_crops_are_rgb_without_alpha"] = all(Image.open(a["absolute_path"]).mode == "RGB" for a in added)
    report["valid"] = report["valid"] and report["checks"]["reconstructed_crop_files"] == len(added) and report["checks"]["reconstructed_crop_hashes_match"] and report["checks"]["reconstructed_crops_are_rgb_without_alpha"]
    report_path.write_text(json.dumps(report,indent=2),encoding="utf-8")
    print(json.dumps({"added":len(added),"alpha_channel_assets":0,"opaque_corner_cleaned":len(added),"total":len(all_assets),"valid":report["valid"]},indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
