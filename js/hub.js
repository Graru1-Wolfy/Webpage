(function () {
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

  var regionByCountry = {
    Australia: "Oceania",
    "New Zealand": "Oceania",
    Brazil: "South America",
    Germany: "Europe",
    Finland: "Europe",
    France: "Europe",
    "United Kingdom": "Europe",
    Russia: "Europe",
    "United States": "North America",
    "Hong Kong": "Asia",
    Japan: "Asia",
    "South Korea": "Asia",
    Singapore: "Asia",
    Sweden: "Europe",
    "United Arab Emirates": "Asia",
    Argentina: "South America",
    Bahrain: "Asia",
    "South Africa": "Africa"
  };

  var latencyByRegion = {
    "North America": 45,
    "South America": 140,
    Europe: 110,
    Asia: 190,
    Oceania: 220,
    Africa: 180
  };

  var mapFilter = "All";
  var jumpClass = "soldier";
  var jumpTier = "all";
  var ratings = { 1: "Good", 2: "Decent", 3: "Poor", 4: "Bad" };
  var kindLabels = { rocket: "Rocket jump", sticky: "Sticky jump", conc: "Conc", other: "Other" };
  var mapGrid = document.getElementById("map-grid");
  var mapFilters = document.getElementById("map-filters");
  var serverRows = document.getElementById("server-rows");
  var filterForm = document.getElementById("server-filters");
  var filterCount = document.getElementById("filter-count");
  var themeToggle = document.getElementById("theme-toggle");
  var jumpClassBar = document.getElementById("jump-class");
  var jumpTierBar = document.getElementById("jump-tiers");
  var jumpForm = document.getElementById("jump-filters");
  var jumpRows = document.getElementById("jump-rows");
  var jumpCount = document.getElementById("jump-count");
  var jumpActivityBar = document.getElementById("jump-activity");
  var jumpActivityRows = document.getElementById("jump-activity-rows");
  var jumpActivityCount = document.getElementById("jump-activity-count");
  var jumpRankBar = document.getElementById("jump-ranks");
  var jumpRankRows = document.getElementById("jump-rank-rows");
  var jumpRankCount = document.getElementById("jump-rank-count");
  var jumpActivity = "map_wrs";
  var jumpRank = "overall";
  var classNames = { 3: "Soldier", 4: "Demoman" };
  var zoneNames = { map: "Map", course: "Course", bonus: "Bonus", trick: "Trick" };
  var servers = [];
  var loadError = "";
  try {
    servers = ServerData.tempus.concat(ServerData.jumpacademy).map(describeServer);
  } catch (error) {
    loadError = "The server list could not be read.";
  }

  if (mapFilters) {
    mapFilters.addEventListener("click", function (event) {
      var button = event.target.closest("[data-filter]");
      if (!button) return;
      mapFilter = button.getAttribute("data-filter");
      renderMaps();
    });
  }

  if (filterForm) filterForm.addEventListener("change", renderServers);
  if (jumpClassBar) {
    jumpClassBar.addEventListener("click", function (event) {
      var button = event.target.closest("[data-class]");
      if (!button) return;
      jumpClass = button.getAttribute("data-class");
      renderJump();
    });
  }
  if (jumpTierBar) {
    jumpTierBar.addEventListener("click", function (event) {
      var button = event.target.closest("[data-tier]");
      if (!button) return;
      var next = button.getAttribute("data-tier");
      jumpTier = jumpTier === next ? "all" : next;
      renderJump();
    });
  }
  if (jumpForm) jumpForm.addEventListener("change", renderJump);
  if (jumpActivityBar) {
    jumpActivityBar.addEventListener("click", function (event) {
      var button = event.target.closest("[data-activity]");
      if (!button) return;
      jumpActivity = button.getAttribute("data-activity");
      renderActivity();
    });
  }
  if (jumpRankBar) {
    jumpRankBar.addEventListener("click", function (event) {
      var button = event.target.closest("[data-rank]");
      if (!button) return;
      jumpRank = button.getAttribute("data-rank");
      renderRanks();
    });
  }
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(next, true);
    });
  }

  applyTheme(document.documentElement.dataset.theme || "dark", false);
  try {
    renderServers();
  } catch (error) {
    serverRows.innerHTML = '<tr><td class="empty-row" colspan="8">The server list could not be read.</td></tr>';
  }
  renderMaps();
  renderOverview();
  renderJump();
  renderActivity();
  renderRanks();

  function applyTheme(theme, persist) {
    document.documentElement.dataset.theme = theme;
    document.getElementById("theme-color").setAttribute("content", theme === "dark" ? "#14121c" : "#F4F2FA");
    themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    if (persist) {
      try {
        localStorage.setItem("tf2-theme", theme);
      } catch (error) {
        /* The toggle still updates the page when storage is blocked. */
      }
    }
  }

  function renderMaps() {
    var filters = ["All"].concat(unique(maps.map(function (map) { return map.mode; })));
    mapFilters.innerHTML = filters.map(function (name) {
      var pressed = name === mapFilter;
      return '<button type="button" data-filter="' + name + '" aria-pressed="' + pressed + '">' + name + "</button>";
    }).join("");

    mapGrid.innerHTML = maps.filter(function (map) {
      return mapFilter === "All" || map.mode === mapFilter;
    }).map(function (map) {
      return '<article class="info-card"><h3>' + escapeHtml(map.name) + "</h3><p>" + escapeHtml(map.mode) + "</p></article>";
    }).join("");
  }

  function renderJump() {
    var maps = (typeof JumpData === "undefined" || !JumpData.maps) ? null : JumpData.maps;
    if (!maps) {
      jumpCount.textContent = "";
      jumpTierBar.innerHTML = "";
      jumpRows.innerHTML = '<tr><td class="empty-row" colspan="5">The jump catalog could not be read.</td></tr>';
      return;
    }

    Array.prototype.forEach.call(jumpClassBar.querySelectorAll("[data-class]"), function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-class") === jumpClass ? "true" : "false");
    });

    var filters = Object.fromEntries(new FormData(jumpForm).entries());
    var tiers = [
      { id: "1", label: "Tier 1" },
      { id: "2", label: "Tier 2" },
      { id: "3", label: "Tier 3" },
      { id: "4", label: "Tier 4" },
      { id: "5", label: "Tier 5" },
      { id: "6", label: "Tier 6+" }
    ];
    jumpTierBar.innerHTML = tiers.map(function (tier) {
      var count = maps.filter(function (map) {
        return matchesJump(map, filters, tier.id);
      }).length;
      var pressed = jumpTier === tier.id;
      return '<button type="button" data-tier="' + tier.id + '" aria-pressed="' + pressed + '"><strong>' +
        count + '</strong><span>' + tier.label + "</span></button>";
    }).join("");

    var visible = maps.filter(function (map) {
      return matchesJump(map, filters, jumpTier);
    }).sort(function (a, b) {
      var aTier = sortTier(a);
      var bTier = sortTier(b);
      if (aTier !== bTier) return aTier - bTier;
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });

    jumpCount.textContent = visible.length + " of " + maps.length + " maps";
    if (!visible.length) {
      jumpRows.innerHTML = '<tr><td class="empty-row" colspan="5">No maps match these categories.</td></tr>';
      return;
    }

    jumpRows.innerHTML = visible.map(function (map) {
      var page = "https://tempus2.xyz/maps/" + encodeURIComponent(map.name);
      var file = "https://static.tempus2.xyz/tempus/server/maps/" + encodeURIComponent(map.name) + ".bsp.bz2";
      var detail = map.authors || map.date || "";
      if (map.kind !== "rocket") detail = kindLabels[map.kind] + (detail ? " · " + detail : "");
      return "<tr>" +
        '<td data-label="Map"><strong><a href="' + page + '">' + escapeHtml(map.name) + "</a></strong><span class=\"class-role\">" + escapeHtml(detail) + "</span></td>" +
        '<td data-label="Soldier">' + classCell(map.s, map.sr, map.sv) + "</td>" +
        '<td data-label="Demoman">' + classCell(map.d, map.dr, map.dv) + "</td>" +
        '<td data-label="Layout">' + escapeHtml(layoutLabel(map)) + "</td>" +
        '<td data-label="Download">' + (map.bytes ? '<a href="' + file + '">' + formatBytes(map.bytes) + "</a>" : "—") + "</td>" +
      "</tr>";
    }).join("");
  }

  function renderActivity() {
    var groups = typeof JumpData === "undefined" ? null : JumpData.activity;
    var runs = groups && groups[jumpActivity];
    Array.prototype.forEach.call(jumpActivityBar.querySelectorAll("[data-activity]"), function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-activity") === jumpActivity ? "true" : "false");
    });
    if (!runs) {
      jumpActivityCount.textContent = "";
      jumpActivityRows.innerHTML = '<tr><td class="empty-row" colspan="7">Recent records could not be read.</td></tr>';
      return;
    }
    var labels = {
      map_wrs: "map records",
      course_wrs: "course records",
      bonus_wrs: "bonus records",
      trick_wrs: "trick records",
      map_tops: "top times"
    };
    jumpActivityCount.textContent = runs.length + " " + labels[jumpActivity];
    jumpActivityRows.innerHTML = runs.map(function (run) {
      var player = run.playerId
        ? '<a href="https://tempus2.xyz/players/' + run.playerId + '">' + escapeHtml(run.player) + "</a>"
        : escapeHtml(run.player);
      var map = run.map
        ? '<a href="https://tempus2.xyz/maps/' + encodeURIComponent(run.map) + '">' + escapeHtml(run.map) + "</a>"
        : "—";
      return "<tr>" +
        '<td data-label="Place">' + escapeHtml(run.place === 1 ? "WR" : "#" + run.place) + "</td>" +
        '<td data-label="Player">' + player + "</td>" +
        '<td data-label="Map">' + map + "</td>" +
        '<td data-label="Zone">' + escapeHtml(zoneLabel(run)) + "</td>" +
        '<td data-label="Class">' + escapeHtml(classNames[run.class] || "—") + "</td>" +
        '<td data-label="Time">' + escapeHtml(formatDuration(run.time)) + "</td>" +
        '<td data-label="Date">' + escapeHtml(formatStamp(run.date)) + "</td>" +
      "</tr>";
    }).join("");
  }

  function renderRanks() {
    var lists = typeof JumpData === "undefined" ? null : JumpData.ranks;
    var list = lists && lists[jumpRank];
    Array.prototype.forEach.call(jumpRankBar.querySelectorAll("[data-rank]"), function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-rank") === jumpRank ? "true" : "false");
    });
    if (!list) {
      jumpRankCount.textContent = "";
      jumpRankRows.innerHTML = '<tr><td class="empty-row" colspan="3">Ranks could not be read.</td></tr>';
      return;
    }
    jumpRankCount.textContent = "Top " + list.players.length + " of " + Number(list.count).toLocaleString() + " players";
    jumpRankRows.innerHTML = list.players.map(function (player) {
      return "<tr>" +
        '<td data-label="Rank">' + escapeHtml(player.rank) + "</td>" +
        '<td data-label="Player"><a href="https://tempus2.xyz/players/' + player.id + '">' + escapeHtml(player.name) + "</a></td>" +
        '<td data-label="Points">' + Number(player.points).toLocaleString(undefined, { maximumFractionDigits: 0 }) + "</td>" +
      "</tr>";
    }).join("");
  }

  function matchesJump(map, filters, tier) {
    if (filters.type !== "all" && map.kind !== filters.type) return false;
    if (filters.rating !== "all" && classRating(map) !== Number(filters.rating)) return false;
    if (filters.layout === "bonus" && !map.bonus) return false;
    if (filters.layout === "course" && !map.course) return false;
    if (filters.layout === "trick" && !map.trick) return false;
    if (filters.layout === "linear" && !map.linear) return false;
    if (tier === "all") return true;
    var value = classTier(map);
    if (tier === "6") return value >= 6;
    return value === Number(tier);
  }

  function classTier(map) {
    var value = jumpClass === "demoman" ? map.d : map.s;
    return value || 0;
  }

  function classRating(map) {
    return jumpClass === "demoman" ? map.dr : map.sr;
  }

  function sortTier(map) {
    var value = classTier(map);
    return value > 0 ? value : 99;
  }

  function classLabel(tier, rating) {
    if (!tier) return "—";
    return ratings[rating] ? "T" + tier + " · " + ratings[rating] : "T" + tier;
  }

  function classCell(tier, rating, video) {
    var text = classLabel(tier, rating);
    if (!video) return text;
    return text + ' <a href="https://www.youtube.com/watch?v=' + encodeURIComponent(video) + '">Video</a>';
  }

  function zoneLabel(run) {
    var label = zoneNames[run.zone] || "Zone";
    if (run.zone && run.zone !== "map") label += " " + run.index;
    if (run.zoneName) label += " · " + run.zoneName;
    return label;
  }

  function formatDuration(seconds) {
    var total = Number(seconds) || 0;
    var minutes = Math.floor(total / 60);
    var rest = (total - minutes * 60).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
    if (minutes && Number(rest) < 10) rest = "0" + rest;
    return minutes ? minutes + ":" + rest : rest;
  }

  function formatStamp(unix) {
    if (!unix) return "—";
    var date = new Date(unix * 1000);
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return date.getUTCDate() + " " + months[date.getUTCMonth()] + " " + date.getUTCFullYear();
  }

  function layoutLabel(map) {
    var parts = [];
    if (map.linear) parts.push("Linear");
    if (map.checkpoint) parts.push(map.checkpoint + (map.checkpoint === 1 ? " checkpoint" : " checkpoints"));
    if (map.bonus) parts.push(map.bonus + (map.bonus === 1 ? " bonus" : " bonuses"));
    if (map.course) parts.push(map.course + (map.course === 1 ? " course" : " courses"));
    if (map.trick) parts.push(map.trick + (map.trick === 1 ? " trick" : " tricks"));
    return parts.length ? parts.join(", ") : "—";
  }

  function formatBytes(bytes) {
    if (bytes >= 1048576) {
      var mib = bytes / 1048576;
      return (mib >= 10 ? mib.toFixed(0) : mib.toFixed(1)) + " MiB";
    }
    return Math.max(1, Math.round(bytes / 1024)) + " KiB";
  }

  function renderOverview() {
    var overview = ServerData.overview;
    document.getElementById("community-stats").innerHTML =
      statCard("Servers online", overview.servers.toLocaleString()) +
      statCard("Players online", overview.players.toLocaleString()) +
      statCard("Maps in rotation", overview.maps.toLocaleString());
    document.getElementById("region-grid").innerHTML = overview.regions.map(function (region) {
      return '<article class="info-card"><h3>' + escapeHtml(region.name) + "</h3><p>" +
        region.servers.toLocaleString() + " servers · " + region.players.toLocaleString() + " players</p></article>";
    }).join("");
  }

  function renderServers() {
    var filters = Object.fromEntries(new FormData(filterForm).entries());
    var visible = servers.filter(function (server) {
      return matches(server, filters);
    }).sort(function (a, b) {
      var aPlayers = a.online ? a.players || 0 : -1;
      var bPlayers = b.online ? b.players || 0 : -1;
      if (bPlayers !== aPlayers) return bPlayers - aPlayers;
      return a.latency - b.latency;
    });

    filterCount.textContent = visible.length + " of " + servers.length + " servers";
    if (loadError) {
      serverRows.innerHTML = '<tr><td class="empty-row" colspan="8">' + escapeHtml(loadError) + "</td></tr>";
      return;
    }
    if (!visible.length) {
      serverRows.innerHTML = '<tr><td class="empty-row" colspan="8">No servers match these filters.</td></tr>';
      return;
    }

    serverRows.innerHTML = visible.map(function (server) {
      var players = server.online ? (server.players || 0) + "/" + (server.maxPlayers || "?") : "Offline";
      return "<tr>" +
        '<td data-label="Server"><strong>' + escapeHtml(server.name) + '</strong><span class="class-role">' + escapeHtml(server.communityLabel) + "</span></td>" +
        '<td data-label="Region">' + escapeHtml(server.region) + "</td>" +
        '<td data-label="Tier">' + escapeHtml(server.tier) + "</td>" +
        '<td data-label="Rank">' + escapeHtml(server.rankLabel) + "</td>" +
        '<td data-label="Map">' + escapeHtml(server.map || "—") + "</td>" +
        '<td data-label="Players">' + players + "</td>" +
        '<td data-label="Latency">~' + server.latency + " ms</td>" +
        '<td data-label="Address"><a href="' + escapeHtml(server.url) + '">' + escapeHtml(server.address) + "</a></td>" +
      "</tr>";
    }).join("");
  }

  function matches(server, filters) {
    if (filters.region !== "all" && server.region !== filters.region) return false;
    if (filters.latency !== "all" && server.latency > Number(filters.latency)) return false;
    if (filters.tier !== "all" && server.tier !== filters.tier) return false;
    if (filters.community !== "all" && server.category !== filters.community) return false;
    if (filters.rank === "open" && server.rankLimit !== null) return false;
    if (filters.rank !== "all" && filters.rank !== "open") {
      var needed = Number(filters.rank);
      if (server.rankLimit !== null && server.rankLimit < needed) return false;
    }
    if (filters.players !== "all") {
      var playing = server.online ? server.players || 0 : 0;
      if (playing < Number(filters.players)) return false;
    }
    return true;
  }

  function describeServer(server) {
    var region = regionFor(server);
    var rankLimit = rankLimitFor(server.name);
    return {
      name: server.name,
      address: server.address,
      map: server.map,
      players: server.players,
      maxPlayers: server.maxPlayers,
      online: server.online,
      url: server.url,
      category: server.category,
      communityLabel: server.category === "tempus" ? "Tempus" : "Jump Academy",
      region: region,
      latency: latencyByRegion[region] || 250,
      tier: tierFor(server),
      rankLimit: rankLimit,
      rankLabel: rankLimit === null ? "Open" : "Top " + rankLimit
    };
  }

  function regionFor(server) {
    if (server.country && regionByCountry[server.country]) return regionByCountry[server.country];
    var name = server.name;
    if (/\| KOR\b| Asia/.test(name)) return "Asia";
    if (/\| AU\b/.test(name)) return "Oceania";
    if (/\| EU\b/.test(name)) return "Europe";
    if (/US East|US West|US Central/.test(name)) return "North America";
    return "North America";
  }

  function rankLimitFor(name) {
    var match = name.match(/Rank (\d+)/i);
    if (match) return Number(match[1]);
    var skill = name.match(/S(\d)/);
    if (skill && Number(skill[1]) >= 5) return 100;
    if (skill && Number(skill[1]) >= 4) return 200;
    return null;
  }

  function tierFor(server) {
    var name = server.name;
    if (/Beginner|Easy|Classic/i.test(name)) return "Beginner";
    if (/Rank (50|100|200)\b/.test(name) || /S[4-6]/.test(name)) return "Advanced";
    if (/Rank (400|500|1000)\b/.test(name) || /Soldier|Demoman/.test(name)) return "Intermediate";
    if (/S1\b/.test(name)) return "Beginner";
    if (/S2|S3/.test(name)) return "Intermediate";
    return "Mixed";
  }

  function statCard(label, value) {
    return "<article><span>" + label + "</span><strong>" + value + "</strong></article>";
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
