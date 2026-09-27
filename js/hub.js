(function () {
  var classes = [
    { id: "scout", name: "Scout", role: "Offense", health: 125, speed: "133%", weapon: "Scattergun", color: "#d27a2c", blurb: "The fastest class. He takes flanks, grabs the intel, and finishes hurt targets before they can turn around." },
    { id: "soldier", name: "Soldier", role: "Offense", health: 200, speed: "80%", weapon: "Rocket launcher", color: "#c4473a", blurb: "A slow, sturdy generalist. Rockets control space, and rocket jumps let him take ground the long way around." },
    { id: "pyro", name: "Pyro", role: "Offense", health: 175, speed: "100%", weapon: "Flamethrower", color: "#e0a322", blurb: "Close-range pressure. Fire denies doorways, and airblast can throw back projectiles and burning players." },
    { id: "demoman", name: "Demoman", role: "Defense", health: 175, speed: "93%", weapon: "Grenade launcher", color: "#3f8f4e", blurb: "Area denial. Grenades and sticky bombs lock down chokes, carts, and the corners people like to hide in." },
    { id: "heavy", name: "Heavy", role: "Defense", health: 300, speed: "77%", weapon: "Minigun", color: "#8d3b32", blurb: "The largest health pool in the game. Spun up, he holds a sightline. Caught revving, he is an easy target." },
    { id: "engineer", name: "Engineer", role: "Defense", health: 125, speed: "100%", weapon: "Shotgun", color: "#c4893a", blurb: "Builds the sentry, dispenser, and teleporters that decide whether a last point holds." },
    { id: "medic", name: "Medic", role: "Support", health: 150, speed: "107%", weapon: "Medi Gun", color: "#d8d2c4", blurb: "Keeps a push alive. Healing builds ÜberCharge, the few seconds that let a pair walk through a sentry nest." },
    { id: "sniper", name: "Sniper", role: "Support", health: 125, speed: "100%", weapon: "Sniper rifle", color: "#7f8f45", blurb: "Picks targets across the map. A fully charged bodyshot drops most classes; a headshot drops all of them." },
    { id: "spy", name: "Spy", role: "Support", health: 125, speed: "107%", weapon: "Knife", color: "#3d4f73", blurb: "Disguises, saps buildings, and looks for the backstab. He is useless if the enemy is already watching their feet." }
  ];

  var modes = [
    { name: "Payload", text: "BLU pushes a cart through checkpoints. RED tries to stop it before the timer runs out." },
    { name: "Control Point", text: "Teams capture a chain of points. On some maps the middle starts unlocked and the ends are locked until the previous point falls." },
    { name: "Attack / Defend", text: "RED owns the points and only has to hold. BLU has to take them in order before time expires." },
    { name: "Capture the Flag", text: "Each side has a briefcase in its base. Steal theirs and bring it home. A dropped case returns after a short wait." },
    { name: "King of the Hill", text: "One point, and a clock for each team. Standing on the point drains your clock. The team that hits zero wins." },
    { name: "Mann vs. Machine", text: "A co-op mode. Six players defend against robot waves, spending credits on upgrades between them." }
  ];

  var maps = [
    { name: "2Fort", mode: "Capture the Flag" },
    { name: "Turbine", mode: "Capture the Flag" },
    { name: "Double Cross", mode: "Capture the Flag" },
    { name: "Dustbowl", mode: "Attack / Defend" },
    { name: "Gold Rush", mode: "Payload" },
    { name: "Badwater Basin", mode: "Payload" },
    { name: "Upward", mode: "Payload" },
    { name: "Thunder Mountain", mode: "Payload" },
    { name: "Granary", mode: "Control Point" },
    { name: "Well", mode: "Control Point" },
    { name: "Viaduct", mode: "King of the Hill" },
    { name: "Harvest", mode: "King of the Hill" },
    { name: "Hightower", mode: "Payload Race" },
    { name: "Mannworks", mode: "Mann vs. Machine" }
  ];

  var selectedId = "soldier";
  var mapFilter = "All";

  var grid = document.getElementById("class-grid");
  var dossier = document.getElementById("dossier");
  var modeGrid = document.getElementById("mode-grid");
  var mapGrid = document.getElementById("map-grid");
  var mapFilters = document.getElementById("map-filters");

  grid.addEventListener("click", function (event) {
    var button = event.target.closest("[data-class]");
    if (!button) return;
    selectedId = button.getAttribute("data-class");
    renderClasses();
  });

  mapFilters.addEventListener("click", function (event) {
    var button = event.target.closest("[data-filter]");
    if (!button) return;
    mapFilter = button.getAttribute("data-filter");
    renderMaps();
  });

  var communityCategory = "tempus";
  var communityFilters = document.getElementById("community-filters");
  var serverRows = document.getElementById("server-rows");

  communityFilters.addEventListener("click", function (event) {
    var button = event.target.closest("[data-category]");
    if (!button) return;
    communityCategory = button.getAttribute("data-category");
    renderCommunity();
  });

  renderClasses();
  renderModes();
  renderMaps();
  renderCommunity();

  function renderClasses() {
    grid.innerHTML = classes.map(function (item) {
      var selected = item.id === selectedId;
      return (
        '<button type="button" class="class-card' + (selected ? " is-selected" : "") + '" data-class="' + item.id + '" aria-pressed="' + selected + '">' +
          '<span class="swatch" style="background:' + item.color + '"></span>' +
          '<span class="class-name">' + item.name + '</span>' +
          '<span class="class-role">' + item.role + '</span>' +
        '</button>'
      );
    }).join("");

    var current = classes.filter(function (item) { return item.id === selectedId; })[0];
    dossier.innerHTML =
      '<p class="kicker">' + current.role + '</p>' +
      '<h3>' + current.name + '</h3>' +
      '<p>' + current.blurb + '</p>' +
      '<dl>' +
        '<div><dt>Health</dt><dd>' + current.health + '</dd></div>' +
        '<div><dt>Speed</dt><dd>' + current.speed + '</dd></div>' +
        '<div><dt>Primary</dt><dd>' + current.weapon + '</dd></div>' +
      '</dl>';
  }

  function renderModes() {
    modeGrid.innerHTML = modes.map(function (mode) {
      return '<article class="info-card"><h3>' + mode.name + '</h3><p>' + mode.text + '</p></article>';
    }).join("");
  }

  function renderMaps() {
    var filters = ["All"].concat(unique(maps.map(function (map) { return map.mode; })));
    mapFilters.innerHTML = filters.map(function (name) {
      var pressed = name === mapFilter;
      return '<button type="button" data-filter="' + name + '" aria-pressed="' + pressed + '">' + name + '</button>';
    }).join("");

    var visible = maps.filter(function (map) {
      return mapFilter === "All" || map.mode === mapFilter;
    });
    mapGrid.innerHTML = visible.map(function (map) {
      return '<article class="info-card map-card"><h3>' + map.name + '</h3><p>' + map.mode + '</p></article>';
    }).join("");
  }

  function renderCommunity() {
    var overview = ServerData.overview;
    document.getElementById("community-stats").innerHTML =
      statCard("Servers online", overview.servers.toLocaleString()) +
      statCard("Players online", overview.players.toLocaleString()) +
      statCard("Maps in rotation", overview.maps.toLocaleString());

    document.getElementById("region-grid").innerHTML = overview.regions.map(function (region) {
      return '<article class="info-card"><h3>' + escapeHtml(region.name) + '</h3><p>' +
        region.servers.toLocaleString() + ' servers · ' + region.players.toLocaleString() + ' players</p></article>';
    }).join("");

    var categories = [
      { id: "tempus", label: "Tempus" },
      { id: "jumpacademy", label: "Jump Academy" }
    ];
    communityFilters.innerHTML = categories.map(function (category) {
      var count = ServerData[category.id].length;
      var pressed = category.id === communityCategory;
      return '<button type="button" data-category="' + category.id + '" aria-pressed="' + pressed + '">' +
        category.label + ' (' + count + ')</button>';
    }).join("");

    var rows = ServerData[communityCategory].slice().sort(function (a, b) {
      var aPlayers = a.online ? a.players || 0 : -1;
      var bPlayers = b.online ? b.players || 0 : -1;
      if (bPlayers !== aPlayers) return bPlayers - aPlayers;
      return a.name.localeCompare(b.name);
    });

    serverRows.innerHTML = rows.map(function (server) {
      var players = server.online
        ? (server.players || 0) + "/" + (server.maxPlayers || "?")
        : "Offline";
      var where = server.country ? '<span class="class-role">' + escapeHtml(server.country) + '</span>' : "";
      return '<tr>' +
        '<td><strong>' + escapeHtml(server.name) + '</strong>' + where + '</td>' +
        '<td>' + escapeHtml(server.map || "—") + '</td>' +
        '<td>' + players + '</td>' +
        '<td><a href="' + escapeHtml(server.url) + '">' + escapeHtml(server.address) + '</a></td>' +
      '</tr>';
    }).join("");
  }

  function statCard(label, value) {
    return '<article><span>' + label + '</span><strong>' + value + '</strong></article>';
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function unique(list) {
    return list.filter(function (value, index) {
      return list.indexOf(value) === index;
    });
  }
})();
