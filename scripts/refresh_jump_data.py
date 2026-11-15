#!/usr/bin/env python3
"""Refresh the Tempus fallback and the Jump Academy server snapshot.

Tempus publishes a CORS-enabled API, so the page reads it directly and uses
data/tempus-fallback.json only when that request fails. jumpacademy.tf does
not send Access-Control-Allow-Origin, so the browser cannot read it. This
script copies the public servers page into data/jump-academy.json.
"""

import json
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
TEMPUS = "https://tempus2.xyz/api/v0"
ACADEMY = "https://jumpacademy.tf/servers"
PAUSE_SECONDS = 1.1


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "tf2-hub-snapshot"})
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status != 200:
            raise RuntimeError("%s returned %s" % (url, response.status))
        content_type = response.headers.get("Content-Type", "")
        body = response.read()
    return content_type, body


def fetch_json(url):
    content_type, body = fetch(url)
    if "json" not in content_type:
        raise RuntimeError("%s returned %s" % (url, content_type or "no content type"))
    return json.loads(body.decode("utf-8"))


def require_maps(maps):
    if not isinstance(maps, list) or len(maps) < 100:
        raise RuntimeError("Tempus map list is missing or too short")
    for item in maps:
        if not isinstance(item.get("id"), int) or not isinstance(item.get("name"), str):
            raise RuntimeError("Tempus map list has an invalid record")
        if not isinstance(item.get("tier_info"), dict):
            raise RuntimeError("Tempus map %s has no tier info" % item.get("name"))


def require_activity(activity):
    expected = ("map_wrs", "course_wrs", "bonus_wrs", "trick_wrs", "map_tops")
    if not isinstance(activity, dict) or any(key not in activity for key in expected):
        raise RuntimeError("Tempus activity is missing a record list")
    for key in expected:
        if not isinstance(activity[key], list) or not activity[key]:
            raise RuntimeError("Tempus activity list %s is empty" % key)


def require_ranks(ranks):
    if not isinstance(ranks, dict) or not isinstance(ranks.get("players"), list) or not ranks["players"]:
        raise RuntimeError("Tempus rank list is empty")
    if not isinstance(ranks.get("count"), int):
        raise RuntimeError("Tempus rank list has no player count")


def require_servers(servers):
    if not isinstance(servers, list) or len(servers) < 10:
        raise RuntimeError("Tempus server list is missing or too short")
    for item in servers:
        info = item.get("server_info") if isinstance(item, dict) else None
        if not isinstance(info, dict) or not isinstance(info.get("name"), str):
            raise RuntimeError("Tempus server list has an invalid record")


def parse_academy(html):
    rows = re.findall(r'<tr class="server-[^"]+">(.*?)</tr>', html, re.S)
    servers = []
    for row in rows:
        connect = re.search(r"steam://connect/([0-9.]+):(\d+)", row)
        if not connect:
            continue
        location = ""
        located = re.search(r'<img[^>]+title="([^"]+)"', row)
        if located and not located.group(1).startswith("Connect to"):
            location = located.group(1)
        country = location.split(",")[-1].strip() if location else ""
        name = ""
        named = re.search(r"<img[^>]*>\s*(?:&nbsp;)?\s*([^<]+)", row)
        if named:
            name = re.sub(r"\s+", " ", named.group(1)).strip()
        current = re.search(r'href="https://jumpacademy\.tf/maps/[^"]*">([^<]*)</a>', row)
        map_name = current.group(1).strip() if current else ""
        players_cell = re.search(r"<td[^>]*>\s*(OFFLINE|\d+\s*/\s*\d+)\s*</td>", row)
        online = False
        players = 0
        max_players = None
        if players_cell and players_cell.group(1) != "OFFLINE":
            online = True
            counts = players_cell.group(1).split("/")
            players = int(counts[0].strip())
            max_players = int(counts[1].strip())
        if not name:
            continue
        servers.append({
            "name": name,
            "address": "%s:%s" % (connect.group(1), connect.group(2)),
            "map": map_name,
            "players": players,
            "maxPlayers": max_players,
            "online": online,
            "country": country,
            "location": location,
        })
    if len(servers) < 10:
        raise RuntimeError("Jump Academy server page parsed too few servers")
    return servers


def write_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temporary.replace(path)


def main():
    retrieved = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    maps = fetch_json(TEMPUS + "/maps/detailedList")
    time.sleep(PAUSE_SECONDS)
    activity = fetch_json(TEMPUS + "/activity")
    time.sleep(PAUSE_SECONDS)
    overall = fetch_json(TEMPUS + "/ranks/overall")
    time.sleep(PAUSE_SECONDS)
    soldier = fetch_json(TEMPUS + "/ranks/class/3")
    time.sleep(PAUSE_SECONDS)
    demoman = fetch_json(TEMPUS + "/ranks/class/4")
    time.sleep(PAUSE_SECONDS)
    servers = fetch_json(TEMPUS + "/servers/statusList")
    require_maps(maps)
    require_activity(activity)
    require_ranks(overall)
    require_ranks(soldier)
    require_ranks(demoman)
    require_servers(servers)
    write_json(DATA / "tempus-fallback.json", {
        "source": TEMPUS,
        "docs": "https://tempus2.xyz/apidocs/",
        "retrieved": retrieved,
        "maps": maps,
        "activity": activity,
        "ranks": {"overall": overall, "soldier": soldier, "demoman": demoman},
        "servers": servers,
    })

    content_type, body = fetch(ACADEMY)
    if "html" not in content_type:
        raise RuntimeError("Jump Academy servers page returned %s" % (content_type or "no content type"))
    academy = parse_academy(body.decode("utf-8", "replace"))
    write_json(DATA / "jump-academy.json", {
        "source": ACADEMY,
        "retrieved": retrieved,
        "note": "Parsed from the public servers page. The browser cannot request this host directly.",
        "servers": academy,
    })
    print("Wrote %s maps, %s Tempus servers, %s Jump Academy servers" % (len(maps), len(servers), len(academy)))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Refresh failed: %s" % error, file=sys.stderr)
        sys.exit(1)
