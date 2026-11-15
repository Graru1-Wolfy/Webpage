var fs = require("fs");
var path = require("path");
var vm = require("vm");

function element() {
  return {
    innerHTML: "",
    textContent: "",
    hidden: false,
    className: "",
    addEventListener: function () {},
    querySelectorAll: function () { return []; },
    setAttribute: function () {},
    getAttribute: function () { return ""; },
    closest: function () { return null; },
    contains: function () { return false; },
    focus: function () {}
  };
}

var ids = {};
function get(id) {
  if (!ids[id]) ids[id] = element();
  return ids[id];
}

global.window = global;
global.document = {
  documentElement: { dataset: { theme: "dark" } },
  getElementById: get,
  activeElement: null
};
global.localStorage = { getItem: function () { return null; }, setItem: function () {} };
global.FormData = function () {
  return {
    entries: function () {
      return [
        ["region", "all"],
        ["latency", "all"],
        ["tier", "all"],
        ["rank", "all"],
        ["players", "all"],
        ["query", ""],
        ["type", "all"],
        ["rating", "all"],
        ["layout", "all"],
        ["player", ""]
      ];
    },
    get: function () { return ""; }
  };
};
global.fetch = function (url) {
  var file = String(url).replace(/^data\//, "data/");
  if (file.indexOf("data/") === 0) {
    return Promise.resolve({
      ok: true,
      json: function () { return Promise.resolve(JSON.parse(fs.readFileSync(path.join("/workspace", file), "utf8"))); }
    });
  }
  return Promise.reject(new Error("skip live " + url));
};
global.AbortController = function () { this.signal = {}; this.abort = function () {}; };

function load(file) {
  vm.runInThisContext(fs.readFileSync(file, "utf8"), { filename: file });
}

load("/workspace/js/logic.js");
load("/workspace/js/common.js");
load("/workspace/js/data.js");
load("/workspace/js/servers.js");

setTimeout(function () {
  var tempus = ids["tempus-rows"].innerHTML;
  var academy = ids["academy-rows"].innerHTML;
  var status = ids["server-status"].textContent;
  if (tempus.indexOf("Top ") === -1) {
    console.error("Tempus rows did not include a stated rank");
    process.exit(1);
  }
  if (academy.indexOf("No rank limit") !== -1) {
    console.error("Jump Academy table should not have a rank column");
    process.exit(1);
  }
  if (academy.indexOf("Password") === -1 && academy.indexOf("Open") === -1) {
    console.error("Jump Academy rows are missing the password field");
    process.exit(1);
  }
  if (status.indexOf("Jump Academy") === -1) {
    console.error("status missing");
    process.exit(1);
  }
  var academyNames = academy.split("data-label=\"Server\"").slice(1).map(function (part) {
    var match = part.match(/<strong>([^<]*)<\/strong>/);
    return match ? match[1] : "";
  });
  var passwordAt = academy.indexOf(">Password</td>");
  var openAt = academy.indexOf(">Open</td>");
  if (passwordAt !== -1 && openAt !== -1 && passwordAt < openAt) {
    console.error("A password server is listed before an open server");
    process.exit(1);
  }
  console.log("servers smoke ok", academyNames.length, "academy rows");
  console.log(status);
  load("/workspace/js/maps.js");
  setTimeout(function () {
    var count = ids["jump-count"].textContent;
    var cards = (ids["map-results"].innerHTML.match(/class="map-card"/g) || []).length;
    if (count.indexOf("795 of 795") !== 0) {
      console.error("unexpected map count: " + count);
      process.exit(1);
    }
    if (cards !== 24) {
      console.error("expected 24 map cards, got " + cards);
      process.exit(1);
    }
    if (ids["map-results"].innerHTML.indexOf("https://static.tempus2.xyz/web/screenshots/raw/") === -1) {
      console.error("map cards are missing screenshot URLs");
      process.exit(1);
    }
    console.log("maps smoke ok", count);
  }, 50);
}, 50);
