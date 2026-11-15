#!/usr/bin/env python3
"""Refresh the Tempus fallback and the Jump Academy server snapshot.

Tempus publishes a CORS-enabled API, so the page reads it directly and uses
data/tempus-fallback.json only when that request fails. Jump Academy addresses
are parsed from the public servers page. Name, map, and player counts for
those addresses come from a Steam server query (A2S_INFO), the same query the
in-game server browser uses. The browser cannot send that UDP query itself.
"""

import json
import re
import socket
import struct
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
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


def parse_academy_addresses(html):
    """Read addresses and locations from the Jump Academy servers page.

    Player counts, maps, and hostnames are not taken from this page. Those
    come from a Steam server query of the addresses.
    """
    rows = re.findall(r'<tr class="server-[^"]+">(.*?)</tr>', html, re.S)
    servers = []
    seen = set()
    for row in rows:
        connect = re.search(r"steam://connect/([0-9.]+):(\d+)", row)
        if not connect:
            continue
        address = "%s:%s" % (connect.group(1), connect.group(2))
        if address in seen:
            continue
        seen.add(address)
        location = ""
        located = re.search(r'<img[^>]+title="([^"]+)"', row)
        if located and not located.group(1).startswith("Connect to"):
            location = located.group(1)
        country = location.split(",")[-1].strip() if location else ""
        name = ""
        named = re.search(r"<img[^>]*>\s*(?:&nbsp;)?\s*([^<]+)", row)
        if named:
            name = re.sub(r"\s+", " ", named.group(1)).strip()
        servers.append({
            "name": name or address,
            "address": address,
            "map": "",
            "players": 0,
            "maxPlayers": None,
            "online": False,
            "password": None,
            "country": country,
            "location": location,
        })
    if len(servers) < 10:
        raise RuntimeError("Jump Academy server page parsed too few addresses")
    return servers


def _cstring(data, index):
    end = data.index(b"\x00", index)
    return data[index:end].decode("utf-8", "replace"), end + 1


def query_a2s(address, timeout=2.0):
    host, port_text = address.rsplit(":", 1)
    port = int(port_text)
    request = b"\xFF\xFF\xFF\xFF\x54Source Engine Query\x00"
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(timeout)
    try:
        sock.sendto(request, (host, port))
        data, _ = sock.recvfrom(8192)
        if len(data) >= 9 and data[4:5] == b"A":
            sock.sendto(request + data[5:9], (host, port))
            data, _ = sock.recvfrom(8192)
        if len(data) < 6 or data[4:5] != b"I":
            return None
        index = 6
        name, index = _cstring(data, index)
        map_name, index = _cstring(data, index)
        folder, index = _cstring(data, index)
        _game, index = _cstring(data, index)
        appid = struct.unpack_from("<H", data, index)[0]
        index += 2
        if appid != 440 and folder != "tf":
            return None
        if index + 5 >= len(data):
            return None
        players = data[index]
        max_players = data[index + 1]
        # A2S visibility: 0 is public, 1 means the server asks for a password.
        visibility = data[index + 5]
        return {
            "name": name,
            "map": map_name,
            "players": int(players),
            "maxPlayers": int(max_players),
            "password": visibility == 1,
            "online": True,
        }
    except (socket.timeout, OSError, ValueError, IndexError, UnicodeError):
        return None
    finally:
        sock.close()


def apply_a2s(servers):
    def query_one(server):
        return server["address"], query_a2s(server["address"])

    answered = 0
    with ThreadPoolExecutor(max_workers=12) as pool:
        for address, info in pool.map(query_one, servers):
            if not info:
                continue
            answered += 1
            for server in servers:
                if server["address"] != address:
                    continue
                server["name"] = info["name"] or server["name"]
                server["map"] = info["map"]
                server["players"] = info["players"]
                server["maxPlayers"] = info["maxPlayers"]
                server["password"] = bool(info["password"])
                server["online"] = True
                break
    if answered < 5:
        raise RuntimeError("Steam server query answered %s Jump Academy servers" % answered)
    return answered


def tempus_addresses(servers):
    found = []
    seen = set()
    for item in servers:
        info = item.get("server_info") if isinstance(item, dict) else None
        if not isinstance(info, dict) or info.get("hidden"):
            continue
        host = info.get("ipAddr") or info.get("addr")
        port = info.get("port")
        if not isinstance(host, str) or not isinstance(port, int):
            continue
        if not re.match(r"^[A-Za-z0-9.-]+$", host):
            continue
        address = "%s:%s" % (host, port)
        if address in seen:
            continue
        seen.add(address)
        found.append(address)
    return found


def query_password_flags(addresses):
    def query_one(address):
        info = query_a2s(address)
        if not info:
            return None
        return {"address": address, "password": bool(info["password"])}

    found = []
    with ThreadPoolExecutor(max_workers=12) as pool:
        for item in pool.map(query_one, addresses):
            if item:
                found.append(item)
    return found


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
    academy = parse_academy_addresses(body.decode("utf-8", "replace"))
    answered = apply_a2s(academy)
    write_json(DATA / "jump-academy.json", {
        "source": ACADEMY,
        "query": "A2S_INFO",
        "retrieved": retrieved,
        "note": "Addresses are parsed from the Jump Academy servers page. Name, map, player counts, and password come from a Steam server query of those addresses.",
        "servers": academy,
    })
    passwords = query_password_flags(tempus_addresses(servers))
    if len(passwords) >= 5:
        write_json(DATA / "server-passwords.json", {
            "source": "A2S_INFO",
            "retrieved": retrieved,
            "note": "password true means the Steam query reported a private server. Addresses that did not answer are omitted.",
            "servers": passwords,
        })
    else:
        print("Left server-passwords.json unchanged; %s Tempus servers answered." % len(passwords), file=sys.stderr)
    online = sum(1 for server in academy if server["online"])
    locked = sum(1 for server in academy if server.get("password") is True)
    print("Wrote %s maps, %s Tempus servers, %s Jump Academy addresses (%s answered, %s online, %s password)" % (
        len(maps), len(servers), len(academy), answered, online, locked))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Refresh failed: %s" % error, file=sys.stderr)
        sys.exit(1)
