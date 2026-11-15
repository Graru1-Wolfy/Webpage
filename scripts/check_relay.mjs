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

var calls = [];
function fetchOk(url) {
  calls.push(url);
  return Promise.resolve(new Response(JSON.stringify([
    { map_name: "jump_beef", class: "soldier", type: "map", duration: 10, rank: 1, points: 50, name: "secret" },
    { map_name: "jump_beef", class: "demoman", type: "map", duration: 12 },
    { map_name: "jump_open", class: "soldier", type: "map", duration: null },
    { map_name: "../etc", class: "soldier", type: "map", duration: 1 },
    { map_name: "jump_course", class: "soldier", type: "course", duration: 1 }
  ]), { status: 200, headers: { "Content-Type": "application/json" } }));
}

var allowed = await handleRequest(
  request("POST", "https://relay.example/player-records", "https://graru1-wolfy.github.io", JSON.stringify({ id: 181188 })),
  fetchOk
);
var payload = await allowed.json();
assert("status 200", allowed.status === 200);
assert("no store", allowed.headers.get("Cache-Control") === "private, no-store");
assert("cors origin", allowed.headers.get("Access-Control-Allow-Origin") === "https://graru1-wolfy.github.io");
assert("only finished safe maps", JSON.stringify(payload.records) === JSON.stringify([
  { map: "jump_beef", class: "soldier" },
  { map: "jump_beef", class: "demoman" }
]));
assert("upstream url", calls.length === 1 && calls[0] === "https://api.tempusplaza.com/players/181188/records");

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

if (!failed) console.log("relay checks passed");
process.exitCode = failed;
