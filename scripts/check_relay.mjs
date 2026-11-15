import { handleRequest } from "../relay/worker.mjs";

var failed = 0;

function assert(name, condition) {
  if (!condition) {
    console.error("FAIL " + name);
    failed = 1;
  }
}

function request(method, url, origin, body) {
  return new Request(url, {
    method: method,
    headers: origin ? { Origin: origin, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
    body: method === "GET" || method === "OPTIONS" ? undefined : body
  });
}

function jsonResponse(body, status) {
  return Promise.resolve(new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "Content-Type": "application/json" }
  }));
}

var calls = [];
function fetchOk(url) {
  var target = String(url);
  calls.push(target);
  if (target.endsWith("/players/181188/records")) {
    return jsonResponse([
      { map_name: "jump_beef", class: "soldier", type: "map", duration: 10, rank: 20, completion_count: 100, points: 1, placement: 15, tier: 1, rating: 1, name: "secret", demo_id: 9 },
      { map_name: "jump_beef", class: "demoman", type: "map", duration: 12, placement: 1, points: 1001, tier: 1, rating: 1, rank: 1, completion_count: 50 },
      { map_name: "jump_bottom", class: "soldier", type: "map", duration: 4, placement: 15, points: 2.5, tier: 2, rating: 4, rank: 8, completion_count: 8 },
      { map_name: "jump_open", class: "soldier", type: "map", duration: null },
      { map_name: "../etc", class: "soldier", type: "map", duration: 1 },
      { map_name: "jump_course", class: "soldier", type: "course", duration: 1, placement: 11, points: 0.5, tier: 1, rating: 4, rank: 3, completion_count: 9 }
    ]);
  }
  if (target.endsWith("/players/181188/ranks")) {
    return jsonResponse([{ soldier_rank: 4, soldier_points: 10.5, demoman_rank: 1, demoman_points: 3, overall_rank: 2 }]);
  }
  if (target === "https://api.tempusplaza.com/maps") {
    return jsonResponse([{
      name: "jump_beef",
      soldier_tier: 1,
      demoman_tier: 1,
      soldier_rating: 1,
      demoman_rating: 3,
      authors: "hidden",
      tags: [
        { id: 1, name: "Mixed", color: "#fff", class: "both" },
        { name: "<script>", class: "soldier" }
      ]
    }]);
  }
  if (target === "https://api.tempusplaza.com/players/data/points/total/points/2/1") {
    return jsonResponse([
      [{ amount: 12.5, name: "neighbor", steam_avatar: "https://example.invalid/secret.png" }],
      [{ amount: 1, name: "other" }],
      []
    ]);
  }
  return jsonResponse({ error: "unexpected " + target }, 404);
}

var allowed = await handleRequest(
  request("POST", "https://relay.example/player-records", "https://graru1-wolfy.github.io", JSON.stringify({ id: 181188 })),
  fetchOk
);
var payload = await allowed.json();
assert("status 200", allowed.status === 200);
assert("no store", allowed.headers.get("Cache-Control") === "private, no-store");
assert("cors origin", allowed.headers.get("Access-Control-Allow-Origin") === "https://graru1-wolfy.github.io");
assert("finished runs keep class group and points", JSON.stringify(payload.records) === JSON.stringify([
  { map: "jump_beef", class: "soldier", type: "map", tier: 1, rating: 1, placement: 15, group: "G5", bottom: false, points: 1 },
  { map: "jump_beef", class: "demoman", type: "map", tier: 1, rating: 1, placement: 1, group: "WR", bottom: false, points: 1001 },
  { map: "jump_bottom", class: "soldier", type: "map", tier: 2, rating: 4, placement: 15, group: "G5", bottom: true, points: 2.5 },
  { map: "jump_course", class: "soldier", type: "course", tier: 1, rating: 4, placement: 11, group: "G1", bottom: false, points: 0.5 }
]));
assert("map tags stripped", JSON.stringify(payload.maps) === JSON.stringify([{
  name: "jump_beef",
  soldier_tier: 1,
  demoman_tier: 1,
  soldier_rating: 1,
  demoman_rating: 3,
  tags: [{ name: "Mixed", class: "both" }]
}]));
assert("next rank is only the points total", JSON.stringify(payload.ranks) === JSON.stringify({
  soldier: { rank: 4, points: 10.5, next_points: 12.5 },
  demoman: { rank: 1, points: 3, next_points: null }
}));
var packed = JSON.stringify(payload);
assert("drops names and demos", packed.indexOf("secret") === -1 && packed.indexOf("neighbor") === -1 && packed.indexOf("demo_id") === -1);
assert("upstream urls", calls.join("\n") === [
  "https://api.tempusplaza.com/players/181188/records",
  "https://api.tempusplaza.com/players/181188/ranks",
  "https://api.tempusplaza.com/maps",
  "https://api.tempusplaza.com/players/data/points/total/points/2/1"
].join("\n"));

var evil = await handleRequest(
  request("POST", "https://relay.example/player-records", "https://evil.example", JSON.stringify({ id: 181188 })),
  function () { throw new Error("should not fetch"); }
);
assert("rejects other sites", evil.status === 403 && !evil.headers.get("Access-Control-Allow-Origin"));

var local = await handleRequest(
  request("POST", "https://relay.example/player-records", "http://127.0.0.1:8080", JSON.stringify({ id: "181188" })),
  fetchOk
);
assert("allows local preview", local.status === 200);

var injected = await handleRequest(
  request("POST", "https://relay.example/player-records", "https://graru1-wolfy.github.io", JSON.stringify({ id: "181188/../maps" })),
  function () { throw new Error("should not fetch"); }
);
assert("rejects path injection", injected.status === 400);

var missing = await handleRequest(
  request("GET", "https://relay.example/player-records", "https://graru1-wolfy.github.io"),
  function () { throw new Error("should not fetch"); }
);
assert("rejects get", missing.status === 405);

var preflight = await handleRequest(
  request("OPTIONS", "https://relay.example/player-records", "https://graru1-wolfy.github.io"),
  function () { throw new Error("should not fetch"); }
);
assert("preflight", preflight.status === 204 && preflight.headers.get("Access-Control-Allow-Methods").indexOf("POST") !== -1);

var mapsDown = await handleRequest(
  request("POST", "https://relay.example/player-records", "https://graru1-wolfy.github.io", JSON.stringify({ id: 181188 })),
  function (url) {
    if (String(url) === "https://api.tempusplaza.com/maps") return jsonResponse({ error: "down" }, 500);
    return fetchOk(url);
  }
);
var partial = await mapsDown.json();
assert("records survive a map catalog miss", mapsDown.status === 200 && partial.records.length === 4 && partial.maps.length === 0);

if (!failed) console.log("relay checks passed");
process.exitCode = failed;
