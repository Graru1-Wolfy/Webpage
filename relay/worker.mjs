// Forwards one player's finished Tempus Plaza map names.
// The player id stays in the request body so the URL path is not a lookup list.
// Nothing is written to KV, D1, or the Cache API.

var PLAZA_RECORDS = "https://api.tempusplaza.com/players/";
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

function finishedMaps(rows) {
  if (!Array.isArray(rows)) return null;
  var records = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row || (row.type && row.type !== "map")) continue;
    if (row.class !== "soldier" && row.class !== "demoman") continue;
    if (typeof row.duration !== "number") continue;
    if (typeof row.map_name !== "string" || !/^[A-Za-z0-9_]+$/.test(row.map_name)) continue;
    records.push({ map: row.map_name, class: row.class });
  }
  return records;
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

  var upstream = PLAZA_RECORDS + id + "/records";
  var response;
  try {
    response = await fetchImpl(upstream, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-store",
        "User-Agent": "tf2-hub-relay/1.0"
      },
      cf: { cacheTtl: 0, cacheEverything: false }
    });
  } catch (error) {
    return reply({ error: "Tempus Plaza did not respond." }, 502, origin);
  }
  if (!response.ok) return reply({ error: "Tempus Plaza did not return records." }, 502, origin);
  var text = await response.text();
  if (text.length > 1500000) return reply({ error: "Tempus Plaza returned an unexpected response." }, 502, origin);
  var parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return reply({ error: "Tempus Plaza returned an unexpected response." }, 502, origin);
  }
  var records = finishedMaps(parsed);
  if (!records) return reply({ error: "Tempus Plaza returned an unexpected response." }, 502, origin);
  return reply({ records: records }, 200, origin);
}

export default {
  fetch: function (request) {
    return handleRequest(request, fetch);
  }
};
