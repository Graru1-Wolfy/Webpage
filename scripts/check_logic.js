var TF2 = require("../js/logic.js");

function assert(name, condition) {
  if (!condition) {
    console.error("FAIL " + name);
    process.exitCode = 1;
  }
}

var easy = { name: "Easy EU", region: "Europe", tier: "Beginner", password: false };
var hard = { name: "Hard EU", region: "Europe", tier: "Advanced", password: false };
var named = { name: "A EU", region: "Europe", tier: "Beginner", password: false };
var asia = { name: "Asia easy", region: "Asia", tier: "Beginner", password: false };
var locked = { name: "Locked EU", region: "Europe", tier: "Beginner", password: true };
var unknown = { name: "Unknown EU", region: "Europe", tier: "Beginner", password: null };
var ordered = [locked, asia, hard, easy, unknown, named].sort(TF2.compareServers).map(function (server) {
  return server.name;
});
assert("password last", ordered[ordered.length - 1] === "Locked EU");
assert("region before name", ordered.indexOf("A EU") < ordered.indexOf("Asia easy"));
assert("easy before advanced", ordered.indexOf("A EU") < ordered.indexOf("Easy EU") && ordered.indexOf("Easy EU") < ordered.indexOf("Hard EU"));
assert("unknown stays with open", ordered.indexOf("Unknown EU") < ordered.indexOf("Locked EU"));

var practice = TF2.suggestBand(25, 400, "practice");
assert("top practice starts at 6", practice.min === 6 && practice.max === 7);
var improve = TF2.suggestBand(25, 400, "improve");
assert("top improve is tier 8 plus", improve.min === 8);
var beginner = TF2.suggestBand(30000, 2, "practice");
assert("few completions stay low", beginner.max <= 2);
var points = TF2.suggestBand(800, 100, "points");
assert("mid points starts above the practice tier", points.min === 5 && points.max === 99);

var academy = TF2.describeServer({
  name: "jumpacademy.tf | S4-D4 | US East",
  address: "1.2.3.4:27015",
  category: "jumpacademy",
  password: true,
  country: "United States",
  online: true,
  players: 1,
  maxPlayers: 24,
  map: "jump_beef",
  url: "steam://connect/1.2.3.4:27015"
});
assert("academy has no rank limit", academy.rankSource === "none" && academy.rankLabel === "No rank limit");
assert("academy password kept", academy.password === true);

var tempus = TF2.describeServer({
  name: "jump.tf Rank 100",
  address: "eu.example:27015",
  category: "tempus",
  password: false,
  country: "Germany",
  online: true,
  players: 2,
  maxPlayers: 24,
  map: "jump_beef",
  url: "steam://connect/eu.example:27015"
});
assert("tempus rank from the name", tempus.rankLimit === 100 && tempus.rankSource === "name");
assert("screenshot url is the tempus 320p file", TF2.screenshotUrl("jump_beef").endsWith("/jump_beef_320p.jpeg"));
assert("unsafe map name has no screenshot", TF2.screenshotUrl("jump beef") === "");

var filters = { region: "all", latency: "all", tier: "all", players: "all" };
assert("top 50 filter keeps a looser rank 100 server", TF2.matchesServer(tempus, Object.assign({ rank: "50" }, filters)) === true);
var tighter = Object.assign({}, tempus, { rankLimit: 50 });
assert("top 100 filter hides a tighter rank 50 server", TF2.matchesServer(tighter, Object.assign({ rank: "100" }, filters)) === false);

if (!process.exitCode) console.log("logic checks passed");
