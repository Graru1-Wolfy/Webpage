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
    Singapore: "Asia"
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
  var mapGrid = document.getElementById("map-grid");
  var mapFilters = document.getElementById("map-filters");
  var serverRows = document.getElementById("server-rows");
  var filterForm = document.getElementById("server-filters");
  var filterCount = document.getElementById("filter-count");
  var themeToggle = document.getElementById("theme-toggle");
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
