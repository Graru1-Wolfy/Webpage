// Forwards one player's finished Tempus Plaza runs and the public map tags.
// The player id stays in the request body so the URL path is not a lookup list.
// Nothing is written to KV, D1, or the Cache API.

var PLAZA = "https://api.tempusplaza.com/";

var ALLOWED_ORIGINS = {
  "https://graru1-wolfy.github.io": true
};

function allowedOrigin(origin) {
  if (ALLOWED_ORIGINS[origin]) return true;
  try {
    var url = new URL(origin);
    return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch (error) {
    return false;
  }
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin"
  };
}

function reply(body, status, origin) {
  var headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff"
  };
  if (origin && allowedOrigin(origin)) {
    Object.assign(headers, corsHeaders(origin));
  }
  return new Response(JSON.stringify(body), { status: status, headers: headers });
}

function playerId(value) {
  var id = String(value == null ? "" : value).trim();
  return /^[1-9][0-9]{0,9}$/.test(id) ? id : "";
}

function groupName(placement) {
  var value = Math.floor(Number(placement));
  if (value === 1) return "WR";
  if (value >= 2 && value <= 10) return "TT";
  if (value >= 11 && value <= 15) return "G" + (value - 10);
  return "";
}

function wholeNumber(value, min, max) {
  if (typeof value !== "number" || !isFinite(value)) return null;
  var number = Math.floor(value);
  if (number < min || number > max) return null;
  return number;
}

function pointsNumber(value) {
  return typeof value === "number" && isFinite(value) ? value : null;
}

function finishedRuns(rows) {
  if (!Array.isArray(rows)) return null;
  var records = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row || (row.type !== "map" && row.type !== "course" && row.type !== "bonus")) continue;
    if (row.class !== "soldier" && row.class !== "demoman") continue;
    if (typeof row.duration !== "number") continue;
    if (typeof row.map_name !== "string" || !/^[A-Za-z0-9_]+$/.test(row.map_name)) continue;
    var placement = wholeNumber(row.placement, 1, 15);
    records.push({
      map: row.map_name,
      class: row.class,
      type: row.type,
      tier: wholeNumber(row.tier, 1, 10),
      rating: wholeNumber(row.rating, 1, 4),
      placement: placement,
      group: groupName(placement),
      bottom: typeof row.rank === "number" && typeof row.completion_count === "number" && row.rank === row.completion_count,
      points: pointsNumber(row.points)
    });
  }
  return records;
}

function publicMaps(rows) {
  if (!Array.isArray(rows)) return [];
  var maps = [];
  for (var i = 0; i < rows.length; i++) {
    var map = rows[i];
    if (!map || typeof map.name !== "string" || !/^[A-Za-z0-9_]+$/.test(map.name)) continue;
    var tags = [];
    var source = Array.isArray(map.tags) ? map.tags : [];
    for (var t = 0; t < source.length; t++) {
      var tag = source[t];
      var name = tag && typeof tag.name === "string" ? tag.name.trim() : "";
      if (!name || name.length > 40 || !/^[A-Za-z0-9][A-Za-z0-9 .'+_-]*$/.test(name)) continue;
      var tagClass = tag.class === "soldier" || tag.class === "demoman" || tag.class === "both" || tag.class === "extra" ? tag.class : "";
      tags.push(tagClass ? { name: name, class: tagClass } : { name: name });
    }
    maps.push({
      name: map.name,
      soldier_tier: wholeNumber(map.soldier_tier, 1, 10),
      demoman_tier: wholeNumber(map.demoman_tier, 1, 10),
      soldier_rating: wholeNumber(map.soldier_rating, 1, 4),
      demoman_rating: wholeNumber(map.demoman_rating, 1, 4),
      tags: tags
    });
  }
  return maps;
}

function classStanding(body, rankKey, pointsKey) {
  var row = Array.isArray(body) ? body[0] : null;
  if (!row) return null;
  var rank = wholeNumber(row[rankKey], 1, 10000000);
  var points = pointsNumber(row[pointsKey]);
  if (rank == null || points == null) return null;
  return { rank: rank, points: points, next_points: null };
}

async function readJson(fetchImpl, url, limit) {
  try {
    var response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-store",
        "User-Agent": "tf2-hub-relay/1.0"
      },
      cf: { cacheTtl: 0, cacheEverything: false }
    });
    if (!response || !response.ok) return null;
    var text = await response.text();
    if (text.length > limit) return null;
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

async function nextPoints(fetchImpl, rank, classIndex) {
  if (typeof rank !== "number" || rank <= 1) return null;
  var offset = Math.floor(rank) - 2;
  if (offset < 0) return null;
  var data = await readJson(
    fetchImpl,
    PLAZA + "players/data/points/total/points/" + offset + "/1",
    200000
  );
  var list = data && data[classIndex];
  var row = list && list[0];
  return row && typeof row.amount === "number" ? row.amount : null;
}

export async function handleRequest(request, fetchImpl) {
  var origin = request.headers.get("Origin") || "";
  var allowed = allowedOrigin(origin);
  if (request.method === "OPTIONS") {
    if (!allowed) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") return reply({ error: "Method not allowed." }, 405, origin);
  var path = new URL(request.url).pathname;
  if (path !== "/player-records") return reply({ error: "Not found." }, 404, origin);
  if (!allowed) return reply({ error: "Origin not allowed." }, 403, "");

  var raw;
  try {
    raw = await request.text();
  } catch (error) {
    return reply({ error: "Expected a player id." }, 400, origin);
  }
  if (raw.length > 64) return reply({ error: "Expected a player id." }, 400, origin);
  var id = "";
  try {
    id = playerId(JSON.parse(raw).id);
  } catch (error) {
    id = "";
  }
  if (!id) return reply({ error: "Expected a player id." }, 400, origin);

  var fetched = await Promise.all([
    readJson(fetchImpl, PLAZA + "players/" + id + "/records", 1500000),
    readJson(fetchImpl, PLAZA + "players/" + id + "/ranks", 200000),
    readJson(fetchImpl, PLAZA + "maps", 4000000)
  ]);
  var records = finishedRuns(fetched[0]);
  if (!records) return reply({ error: "Tempus Plaza did not return records." }, 502, origin);

  var soldier = classStanding(fetched[1], "soldier_rank", "soldier_points");
  var demoman = classStanding(fetched[1], "demoman_rank", "demoman_points");
  if (soldier) soldier.next_points = await nextPoints(fetchImpl, soldier.rank, 0);
  if (demoman) demoman.next_points = await nextPoints(fetchImpl, demoman.rank, 1);

  return reply({
    records: records,
    maps: publicMaps(fetched[2]),
    ranks: {
      soldier: soldier,
      demoman: demoman
    }
  }, 200, origin);
}

export default {
  fetch: function (request) {
    return handleRequest(request, fetch);
  }
};
