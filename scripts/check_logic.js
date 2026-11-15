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
var finished = TF2.finishedMapNames([
  { map: "jump_beef", class: "soldier" },
  { map: "jump_beef", class: "demoman" },
  { map: "jump bad", class: "soldier" },
  { map: "jump_other", class: "scout" }
], "soldier");
assert("finished names keep the selected class", finished.jump_beef === true && !finished.jump_other && !finished["jump bad"]);
var courseOnly = TF2.finishedMapNames([{ map: "jump_beef", class: "soldier", type: "course" }], "soldier");
assert("course finish is not a map finish", !courseOnly.jump_beef);
assert("plaza completion points", TF2.plazaPoints("map", 1, 1, 15) === 1 && TF2.plazaPoints("map", 3, 4, 15) === 5 && TF2.plazaPoints("map", 4, 1, 15) === 10);
assert("plaza world record points", TF2.plazaPoints("map", 1, 1, 1) === 1001);
assert("plaza group four points", TF2.plazaPoints("map", 1, 1, 14) === 3);
assert("group names", TF2.groupName(1) === "WR" && TF2.groupName(5) === "TT" && TF2.groupName(12) === "G2" && TF2.groupName(15) === "G5");
assert("points text", TF2.formatPoints(2.93) === "2.93" && TF2.formatPoints(5) === "5" && TF2.formatPoints(2.5) === "2.5");
var tierRecords = [
  { map: "jump_done", class: "soldier", type: "map", tier: 3, rating: 4, placement: 15, points: 5 },
  { map: "jump_two", class: "soldier", type: "map", tier: 3, rating: 4, placement: 15, points: 5 },
  { map: "jump_three", class: "soldier", type: "map", tier: 3, rating: 4, placement: 15, points: 5 },
  { map: "jump_high", class: "soldier", type: "map", tier: 6, rating: 1, placement: 15, points: 50 }
];
assert("comfortable tier ignores a rare high finish", TF2.establishedTier(tierRecords, "soldier") === 3);
var bulk = [];
function addFinishes(tier, count) {
  for (var i = 0; i < count; i++) {
    bulk.push({ map: "t" + tier + "_" + i, class: "soldier", type: "map", tier: tier, placement: 15 });
  }
}
addFinishes(1, 80);
addFinishes(2, 81);
addFinishes(3, 119);
addFinishes(4, 52);
addFinishes(5, 7);
addFinishes(6, 3);
assert("a few high finishes do not set the comfortable tier", TF2.establishedTier(bulk, "soldier") === 4);
assert("one finish still sets a tier", TF2.establishedTier([{ map: "jump_only", class: "soldier", type: "map", tier: 4, placement: 15 }], "soldier") === 4);
assert("automatic points cap is two tiers up", TF2.tierCap(3, "points", null) === 5);
assert("automatic practice cap stays put", TF2.tierCap(3, "practice", null) === 3);
assert("chosen tier overrides the cap", TF2.tierCap(3, "points", 4) === 4);
assert("next rank gap", TF2.formatPoints(TF2.pointsGap({ soldier: { rank: 1174, points: 2447.73, next_points: 2450.66 } }, "soldier")) === "2.93");
var plebeian = TF2.nextRankGroup("Plebeian");
assert("plebeian next group is jester", plebeian.title === "Jester" && plebeian.maxRank === 1000 && plebeian.belowRank === 1001);
assert("baron next group is count", TF2.nextRankGroup("Baron").title === "Count" && TF2.nextRankGroup("Baron").maxRank === 25);
assert("knight next group is baron", TF2.nextRankGroup("Knight").title === "Baron" && TF2.nextRankGroup("Knight").maxRank === 50);
assert("emperor has no next group", TF2.nextRankGroup("Emperor") === null && TF2.isHighestRankGroup("Emperor") === true);
assert("an unknown title is not a group", TF2.nextRankGroup("NotATitle") === null && TF2.isHighestRankGroup("NotATitle") === false);
assert("peon next group is peasant", TF2.nextRankGroup("Peon").title === "Peasant" && TF2.nextRankGroup("Peon").maxRank === 5000);
assert("a roman numeral stays in its group", TF2.nextRankGroup("Plebeian IV").title === "Jester");
assert("a gendered title uses the same group", TF2.nextRankGroup("Baroness").title === "Count");
assert("cutoff is the worst rank inside the next group", TF2.rankGroupCutoff([
  { rank: 999, points: 3200, name: "hidden" },
  { rank: 1000, points: 3149.2, name: "hidden" },
  { rank: 1001, points: 3148.67, name: "hidden" }
], 1000) === 3149.2);
var boundary = TF2.rankBoundary([
  { rank: 1000, points: 3149.2, name: "hidden", steamid: "STEAM_0:1:1" },
  { rank: 1001, points: 3148.67, name: "hidden", steamid: "STEAM_0:0:2" }
], 1000);
assert("title change is the two neighboring positions", boundary.rank === 1000 && boundary.points === 3149.2 && boundary.belowRank === 1001 && boundary.belowPoints === 3148.67 && boundary.name == null && boundary.steamid == null);
assert("a skipped rank uses the last rank still inside the group", TF2.rankGroupCutoff([
  { rank: 998, points: 10 },
  { rank: 1001, points: 9 }
], 1000) === 10);
var catalog = [
  { name: "jump_done", s: 3, sr: 4 },
  { name: "jump_a", s: 8, sr: 1 },
  { name: "jump_b", s: 6, sr: 1 },
  { name: "jump_c", s: 4, sr: 4 }
];
var plazaMaps = [
  { name: "jump_a", soldier_tier: 3, soldier_rating: 1, tags: [{ name: "Wallshot", class: "soldier" }] },
  { name: "jump_b", soldier_tier: 6, soldier_rating: 1, tags: [{ name: "Mixed", class: "both" }] },
  { name: "jump_c", soldier_tier: 4, soldier_rating: 4, tags: [{ name: "Mixed", class: "both" }] }
];
var covered = TF2.selectSuggestions(catalog, {
  jumpClass: "soldier",
  goal: "points",
  records: tierRecords,
  plazaMaps: plazaMaps,
  maxTier: null,
  tags: [],
  gap: 2.93
});
assert("comfortable tier covers the gap", covered.items.length === 1 && covered.items[0].map.name === "jump_a" && covered.items[0].points === 5);
assert("suggestion cap", covered.established === 3 && covered.cap === 5);
var step = TF2.selectSuggestions([
  { name: "jump_c", s: 4, sr: 4 },
  { name: "jump_b", s: 6, sr: 1 }
], {
  jumpClass: "soldier",
  goal: "points",
  records: tierRecords,
  plazaMaps: plazaMaps,
  maxTier: null,
  tags: [],
  gap: 2.93
});
assert("one tier up when the comfortable tier cannot cover", step.items.length === 1 && step.items[0].map.name === "jump_c");
var raised = TF2.selectSuggestions(catalog, {
  jumpClass: "soldier",
  goal: "points",
  records: tierRecords,
  plazaMaps: plazaMaps,
  maxTier: 8,
  tags: ["Wallshot"],
  gap: 2.93
});
assert("tag filter keeps the comfortable map", raised.items.length === 1 && raised.items[0].map.name === "jump_a" && raised.items[0].tags[0] === "Wallshot");
var groupRecords = tierRecords.map(function (row) { return Object.assign({}, row, { placement: 11 }); });
var grouped = TF2.selectSuggestions([{ name: "jump_new", s: 3, sr: 1 }], {
  jumpClass: "soldier",
  goal: "points",
  records: groupRecords,
  plazaMaps: [],
  maxTier: null,
  tags: [],
  gap: 2.93
});
assert("usual group changes the calculator", grouped.items[0].group === "G1" && grouped.items[0].points === 55);
var towardGroup = TF2.selectSuggestions(catalog, {
  jumpClass: "soldier",
  goal: "points",
  records: tierRecords,
  plazaMaps: plazaMaps,
  maxTier: null,
  tags: [],
  gap: 700
});
assert("a rank group gap stays one tier above comfortable", towardGroup.items.length && towardGroup.items.every(function (item) {
  return item.tier <= 4;
}) && towardGroup.items[0].map.name === "jump_c" && towardGroup.items[0].points === 10);

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
