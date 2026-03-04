"""
process_harvest_data.py
=======================
Converts CPW 2024 moose harvest report into moose_harvest_2024.json
which the map reads from data/processed/.

Run once from your project root:
    python scripts/process_harvest_data.py

Output: data/processed/moose_harvest_2024.json
"""

import json, os

# ── Raw harvest data from the 2024 CPW report ──────────────────────────
# Source: "2024 Moose Licenses, Hunters, Harvest & Recreation Days
#          for All Manners of Take" (all license types combined)

HARVEST_2024 = [
    {"unit":"4",   "licenses":1,  "hunters":1,  "harvest":0,  "success_pct":0,   "avg_days":7.0},
    {"unit":"6",   "licenses":56, "hunters":55, "harvest":41, "success_pct":75,  "avg_days":4.4},
    {"unit":"7",   "licenses":18, "hunters":15, "harvest":7,  "success_pct":47,  "avg_days":7.1},
    {"unit":"8",   "licenses":26, "hunters":26, "harvest":23, "success_pct":88,  "avg_days":6.0},
    {"unit":"12",  "licenses":7,  "hunters":5,  "harvest":2,  "success_pct":40,  "avg_days":8.4},
    {"unit":"14",  "licenses":39, "hunters":39, "harvest":32, "success_pct":82,  "avg_days":6.7},
    {"unit":"15",  "licenses":15, "hunters":13, "harvest":10, "success_pct":77,  "avg_days":8.0},
    {"unit":"16",  "licenses":38, "hunters":38, "harvest":30, "success_pct":79,  "avg_days":6.3},
    {"unit":"17",  "licenses":16, "hunters":15, "harvest":8,  "success_pct":53,  "avg_days":7.3},
    {"unit":"18",  "licenses":30, "hunters":27, "harvest":21, "success_pct":78,  "avg_days":4.4},
    {"unit":"19",  "licenses":22, "hunters":18, "harvest":15, "success_pct":83,  "avg_days":4.8},
    {"unit":"20",  "licenses":9,  "hunters":7,  "harvest":4,  "success_pct":57,  "avg_days":7.4},
    {"unit":"23",  "licenses":2,  "hunters":2,  "harvest":2,  "success_pct":100, "avg_days":15.0},
    {"unit":"24",  "licenses":13, "hunters":13, "harvest":9,  "success_pct":69,  "avg_days":5.5},
    {"unit":"25",  "licenses":1,  "hunters":1,  "harvest":1,  "success_pct":100, "avg_days":4.0},
    {"unit":"26",  "licenses":4,  "hunters":4,  "harvest":4,  "success_pct":100, "avg_days":1.5},
    {"unit":"28",  "licenses":34, "hunters":34, "harvest":25, "success_pct":74,  "avg_days":8.0},
    {"unit":"29",  "licenses":13, "hunters":13, "harvest":11, "success_pct":85,  "avg_days":6.8},
    {"unit":"34",  "licenses":2,  "hunters":2,  "harvest":1,  "success_pct":50,  "avg_days":4.5},
    {"unit":"36",  "licenses":3,  "hunters":3,  "harvest":3,  "success_pct":100, "avg_days":5.7},
    {"unit":"37",  "licenses":31, "hunters":28, "harvest":20, "success_pct":71,  "avg_days":4.6},
    {"unit":"38",  "licenses":17, "hunters":17, "harvest":13, "success_pct":76,  "avg_days":5.1},
    {"unit":"39",  "licenses":8,  "hunters":8,  "harvest":7,  "success_pct":88,  "avg_days":7.4},
    {"unit":"40",  "licenses":1,  "hunters":1,  "harvest":0,  "success_pct":0,   "avg_days":5.0},
    {"unit":"41",  "licenses":13, "hunters":5,  "harvest":1,  "success_pct":20,  "avg_days":12.2},
    {"unit":"42",  "licenses":8,  "hunters":8,  "harvest":5,  "success_pct":63,  "avg_days":11.1},
    {"unit":"43",  "licenses":6,  "hunters":6,  "harvest":4,  "success_pct":67,  "avg_days":6.7},
    {"unit":"44",  "licenses":3,  "hunters":2,  "harvest":2,  "success_pct":100, "avg_days":2.5},
    {"unit":"45",  "licenses":2,  "hunters":2,  "harvest":2,  "success_pct":100, "avg_days":4.5},
    {"unit":"46",  "licenses":10, "hunters":10, "harvest":8,  "success_pct":80,  "avg_days":3.8},
    {"unit":"47",  "licenses":3,  "hunters":2,  "harvest":1,  "success_pct":50,  "avg_days":7.5},
    {"unit":"48",  "licenses":2,  "hunters":2,  "harvest":1,  "success_pct":50,  "avg_days":5.0},
    {"unit":"49",  "licenses":17, "hunters":14, "harvest":12, "success_pct":86,  "avg_days":5.1},
    {"unit":"51",  "licenses":1,  "hunters":1,  "harvest":0,  "success_pct":0,   "avg_days":3.0},
    {"unit":"52",  "licenses":3,  "hunters":2,  "harvest":0,  "success_pct":0,   "avg_days":8.0},
    {"unit":"53",  "licenses":1,  "hunters":1,  "harvest":1,  "success_pct":100, "avg_days":12.0},
    {"unit":"54",  "licenses":2,  "hunters":2,  "harvest":2,  "success_pct":100, "avg_days":9.5},
    {"unit":"55",  "licenses":7,  "hunters":7,  "harvest":7,  "success_pct":100, "avg_days":5.0},
    {"unit":"56",  "licenses":2,  "hunters":2,  "harvest":2,  "success_pct":100, "avg_days":5.0},
    {"unit":"65",  "licenses":1,  "hunters":1,  "harvest":1,  "success_pct":100, "avg_days":11.0},
    {"unit":"66",  "licenses":8,  "hunters":8,  "harvest":8,  "success_pct":100, "avg_days":2.5},
    {"unit":"67",  "licenses":7,  "hunters":7,  "harvest":7,  "success_pct":100, "avg_days":3.3},
    {"unit":"68",  "licenses":2,  "hunters":2,  "harvest":2,  "success_pct":100, "avg_days":10.0},
    {"unit":"75",  "licenses":1,  "hunters":1,  "harvest":1,  "success_pct":100, "avg_days":1.0},
    {"unit":"76",  "licenses":17, "hunters":16, "harvest":14, "success_pct":88,  "avg_days":3.3},
    {"unit":"77",  "licenses":1,  "hunters":1,  "harvest":1,  "success_pct":100, "avg_days":2.0},
    {"unit":"79",  "licenses":1,  "hunters":1,  "harvest":1,  "success_pct":100, "avg_days":9.0},
    {"unit":"161", "licenses":35, "hunters":35, "harvest":32, "success_pct":91,  "avg_days":4.0},
    {"unit":"171", "licenses":36, "hunters":35, "harvest":31, "success_pct":89,  "avg_days":4.1},
    {"unit":"181", "licenses":3,  "hunters":3,  "harvest":3,  "success_pct":100, "avg_days":7.7},
    {"unit":"191", "licenses":1,  "hunters":1,  "harvest":0,  "success_pct":0,   "avg_days":7.0},
    {"unit":"201", "licenses":1,  "hunters":1,  "harvest":1,  "success_pct":100, "avg_days":8.0},
    {"unit":"231", "licenses":1,  "hunters":1,  "harvest":1,  "success_pct":100, "avg_days":8.0},
    {"unit":"361", "licenses":2,  "hunters":2,  "harvest":1,  "success_pct":50,  "avg_days":19.5},
    {"unit":"371", "licenses":9,  "hunters":9,  "harvest":9,  "success_pct":100, "avg_days":3.2},
    {"unit":"421", "licenses":12, "hunters":12, "harvest":9,  "success_pct":75,  "avg_days":6.5},
    {"unit":"444", "licenses":1,  "hunters":1,  "harvest":1,  "success_pct":100, "avg_days":10.0},
    {"unit":"471", "licenses":2,  "hunters":2,  "harvest":2,  "success_pct":100, "avg_days":5.0},
    {"unit":"481", "licenses":1,  "hunters":1,  "harvest":1,  "success_pct":100, "avg_days":11.0},
    {"unit":"500", "licenses":15, "hunters":15, "harvest":14, "success_pct":93,  "avg_days":4.7},
    {"unit":"501", "licenses":11, "hunters":11, "harvest":11, "success_pct":100, "avg_days":2.6},
    {"unit":"511", "licenses":6,  "hunters":6,  "harvest":6,  "success_pct":100, "avg_days":4.0},
    {"unit":"521", "licenses":8,  "hunters":8,  "harvest":5,  "success_pct":63,  "avg_days":9.1},
    {"unit":"561", "licenses":1,  "hunters":1,  "harvest":1,  "success_pct":100, "avg_days":4.0},
    {"unit":"751", "licenses":1,  "hunters":1,  "harvest":1,  "success_pct":100, "avg_days":8.0},
]

# ── Build lookup dict keyed by unit string ─────────────────────────────
harvest_by_unit = {str(r["unit"]): r for r in HARVEST_2024}

# ── Derive statewide percentile thresholds ─────────────────────────────
success_rates = sorted([r["success_pct"] for r in HARVEST_2024 if r["hunters"] > 0])
n = len(success_rates)
p33 = success_rates[n // 3]
p66 = success_rates[(2 * n) // 3]

for r in HARVEST_2024:
    s = r["success_pct"]
    if r["hunters"] == 0:
        r["success_tier"] = "No Data"
    else:
        r["success_tier"] = (
            "High"   if s >= p66 else
            "Medium" if s >= p33 else
            "Low"
        )

# ── Write output ───────────────────────────────────────────────────────
out_dir  = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'processed')
out_path = os.path.join(out_dir, 'moose_harvest_2024.json')
os.makedirs(out_dir, exist_ok=True)

output = {
    "year": 2024,
    "source": "CPW 2024 Moose Licenses, Hunters, Harvest & Recreation Days — All Manners of Take",
    "statewide": {
        "total_licenses":   sum(r["licenses"] for r in HARVEST_2024),
        "total_hunters":    sum(r["hunters"]  for r in HARVEST_2024),
        "total_harvest":    sum(r["harvest"]  for r in HARVEST_2024),
        "overall_success_pct": 79,
        "units_with_data":  len(HARVEST_2024)
    },
    "success_thresholds": {"high": p66, "medium": p33},
    "units": harvest_by_unit
}

with open(out_path, 'w') as f:
    json.dump(output, f, indent=2)

print(f"✅  Written {len(HARVEST_2024)} units  →  {out_path}")
print(f"    Thresholds: Low <{p33}%  |  Medium {p33}–{p66}%  |  High ≥{p66}%")
print(f"    Statewide totals: {output['statewide']['total_licenses']} licenses  "
      f"{output['statewide']['total_harvest']} harvested  "
      f"{output['statewide']['overall_success_pct']}% success")