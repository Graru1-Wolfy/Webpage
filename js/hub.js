(function () {
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

  var ratings = { 1: "Good", 2: "Decent", 3: "Poor", 4: "Bad" };
  var kindLabels = { rocket: "Rocket jump", sticky: "Sticky jump", conc: "Conc", other: "Other" };
  var zoneNames = { map: "Map", course: "Course", bonus: "Bonus", trick: "Trick" };
  var jumpClass = "soldier";
  var jumpTier = "all";
  var jumpActivity = "map_wrs";
  var jumpRank = "overall";
  var catalog = { maps: null, activity: null, ranks: null };
  var catalogLive = { maps: false, activity: false, ranks: false };
  var catalogRetrieved = "";
  var servers = [];
  var tempusLive = false;
  var tempusRetrieved = "";
  var academyRetrieved = "";
  var loadError = "";

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
  trackSection();
  renderJump();
  renderActivity();
  renderRanks();
  renderServers();
  loadSnapshots().then(refreshLive);

  function loadSnapshots() {
    return loadJson("data/tempus-fallback.json").then(function (data) {
      if (!data) return;
      catalogRetrieved = data.retrieved || "";
      tempusRetrieved = data.retrieved || "";
      var maps = normalizeMaps(data.maps);
      var activity = normalizeActivity(data.activity);
      var ranks = normalizeRankSet(data.ranks);
      var tempus = normalizeTempusServers(data.servers);
      if (maps.length >= 100) catalog.maps = maps;
      if (activity) catalog.activity = activity;
      if (ranks) catalog.ranks = ranks;
      if (tempus.length >= 10) replaceTempus(tempus);
      renderCatalog();
      renderOverview();
      renderServers();
    }).catch(function () {
      loadError = "The saved Tempus snapshot could not be read.";
    }).then(function () {
      return loadJson("data/jump-academy.json");
    }).then(function (data) {
      if (!data) return;
      academyRetrieved = data.retrieved || "";
      var academy = normalizeAcademyServers(data.servers);
      if (academy.length < 10) return;
      replaceAcademy(academy);
      renderOverview();
      renderServers();
    }).catch(function () {
      if (!loadError) loadError = "The Jump Academy snapshot could not be read.";
      renderServers();
    });
  }

  function refreshLive() {
    var steps = [
      function () {
        return loadJson("https://tempus2.xyz/api/v0/maps/detailedList", 15000).then(function (data) {
          var maps = normalizeMaps(data);
          if (maps.length < 100) throw new Error("short map list");
          catalog.maps = maps;
          catalogLive.maps = true;
          renderJump();
          setJumpStatus();
        });
      },
      function () {
        return loadJson("https://tempus2.xyz/api/v0/activity", 15000).then(function (data) {
          var activity = normalizeActivity(data);
          if (!activity) throw new Error("activity");
          catalog.activity = activity;
          catalogLive.activity = true;
          renderActivity();
          setJumpStatus();
        });
      },
      function () {
        return loadJson("https://tempus2.xyz/api/v0/ranks/overall", 15000).then(function (overall) {
          return wait(1100).then(function () {
            return loadJson("https://tempus2.xyz/api/v0/ranks/class/3", 15000);
          }).then(function (soldier) {
            return wait(1100).then(function () {
              return loadJson("https://tempus2.xyz/api/v0/ranks/class/4", 15000);
            }).then(function (demoman) {
              var ranks = normalizeRankSet({ overall: overall, soldier: soldier, demoman: demoman });
              if (!ranks) throw new Error("ranks");
              catalog.ranks = ranks;
              catalogLive.ranks = true;
              renderRanks();
              setJumpStatus();
            });
          });
        });
      },
      function () {
        return loadJson("https://tempus2.xyz/api/v0/servers/statusList", 15000).then(function (data) {
          var tempus = normalizeTempusServers(data);
          if (tempus.length < 10) throw new Error("short server list");
          tempusLive = true;
          tempusRetrieved = new Date().toISOString();
          replaceTempus(tempus);
          renderOverview();
          renderServers();
        });
      }
    ];
    return steps.reduce(function (chain, step, index) {
      return chain.then(function () {
        return wait(index === 0 ? 0 : 1100).then(step);
      }).catch(function () {
        setJumpStatus();
        setServerStatus();
      });
    }, Promise.resolve());
  }

  function renderCatalog() {
    renderJump();
    renderActivity();
    renderRanks();
    setJumpStatus();
    setServerStatus();
  }

  function trackSection() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".site-nav a"));
    var sections = links.map(function (link) {
      return document.getElementById(link.getAttribute("href").slice(1));
    }).filter(Boolean);
    if (!sections.length) return;
    var currentId = "";

    function update() {
      var header = document.querySelector(".site-header");
      var marker = (header ? header.getBoundingClientRect().bottom : 80) + 36;
      var current = sections[0];
      sections.forEach(function (section) {
        if (section.getBoundingClientRect().top <= marker) current = section;
      });
      if (current.id === currentId) return;
      currentId = current.id;
      links.forEach(function (link) {
        var on = link.getAttribute("href") === "#" + currentId;
        if (on) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
        if (!on) return;
        var nav = link.parentElement;
        var navRect = nav.getBoundingClientRect();
        var linkRect = link.getBoundingClientRect();
        if (linkRect.left < navRect.left) nav.scrollLeft -= navRect.left - linkRect.left;
        else if (linkRect.right > navRect.right) nav.scrollLeft += linkRect.right - navRect.right;
      });
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function applyTheme(theme, persist) {
    document.documentElement.dataset.theme = theme;
    document.getElementById("theme-color").setAttribute("content", theme === "dark" ? "#14121c" : "#F4F2FA");
    themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    themeToggle.textContent = "Dark theme";
    if (persist) {
      try {
        localStorage.setItem("tf2-theme", theme);
      } catch (error) {
        /* The toggle still updates the page when storage is blocked. */
      }
    }
  }

  function setJumpStatus() {
    var node = document.getElementById("jump-status");
    if (!node) return;
    if (!catalog.maps && !catalog.activity && !catalog.ranks) {
      node.textContent = "Loading the Tempus catalog, records, and ranks.";
      return;
    }
    var text = "Map catalog: " + (catalogLive.maps ? "live" : "saved snapshot") +
      ", records: " + (catalogLive.activity ? "live" : "saved snapshot") +
      ", ranks: " + (catalogLive.ranks ? "live" : "saved snapshot") + ".";
    if (!(catalogLive.maps && catalogLive.activity && catalogLive.ranks)) {
      text += " Saved copy from " + formatIso(catalogRetrieved) + ".";
    }
    node.textContent = text;
  }

  function setServerStatus() {
    var node = document.getElementById("server-status");
    if (!node) return;
    var tempus = tempusLive ? "Tempus status is live." : "Tempus status is the saved snapshot from " + formatIso(tempusRetrieved) + ".";
    var academy = "Jump Academy name, map, and player counts are a Steam server query of the parsed addresses from " + formatIso(academyRetrieved) + ".";
    node.textContent = tempus + " " + academy;
  }

  function renderJump() {
    var maps = catalog.maps;
    if (!maps) {
      jumpCount.textContent = catalogRetrieved ? "" : "Loading the Tempus catalog…";
      if (jumpTierBar) jumpTierBar.innerHTML = "";
      jumpRows.innerHTML = '<tr><td class="empty-row" colspan="4">' +
        (catalogRetrieved ? "The jump catalog could not be read." : "Loading the Tempus catalog…") + "</td></tr>";
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
    var tierFocus = focusedValue(jumpTierBar, "data-tier");
    jumpTierBar.innerHTML = tiers.map(function (tier) {
      var count = maps.filter(function (map) {
        return matchesJump(map, filters, tier.id);
      }).length;
      var pressed = jumpTier === tier.id;
      return '<button type="button" data-tier="' + tier.id + '" aria-pressed="' + pressed + '"><strong>' +
        count + '</strong><span>' + tier.label + "</span></button>";
    }).join("");
    focusButton(jumpTierBar, "data-tier", tierFocus);

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
      jumpRows.innerHTML = '<tr><td class="empty-row" colspan="4">No maps match these categories.</td></tr>';
      return;
    }

    jumpRows.innerHTML = visible.map(function (map) {
      var page = "https://tempus2.xyz/maps/" + encodeURIComponent(map.name);
      var detail = map.authors || "";
      if (map.kind !== "rocket") detail = kindLabels[map.kind] + (detail ? " · " + detail : "");
      return "<tr>" +
        '<td data-label="Map"><strong><a href="' + page + '">' + escapeHtml(map.name) + "</a></strong><span class=\"class-role\">" + escapeHtml(detail) + "</span></td>" +
        '<td data-label="Soldier">' + classCell(map.s, map.sr, map.sv) + "</td>" +
        '<td data-label="Demoman">' + classCell(map.d, map.dr, map.dv) + "</td>" +
        '<td data-label="Layout">' + escapeHtml(layoutLabel(map)) + "</td>" +
      "</tr>";
    }).join("");
  }

  function renderActivity() {
    var runs = catalog.activity && catalog.activity[jumpActivity];
    Array.prototype.forEach.call(jumpActivityBar.querySelectorAll("[data-activity]"), function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-activity") === jumpActivity ? "true" : "false");
    });
    if (!runs) {
      jumpActivityCount.textContent = "";
      jumpActivityRows.innerHTML = '<tr><td class="empty-row" colspan="7">' +
        (catalogRetrieved ? "Recent records could not be read." : "Loading recent records…") + "</td></tr>";
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
        '<td data-label="Class">' + escapeHtml(className(run.class)) + "</td>" +
        '<td data-label="Time">' + escapeHtml(formatDuration(run.time)) + "</td>" +
        '<td data-label="Date">' + escapeHtml(formatStamp(run.date)) + "</td>" +
      "</tr>";
    }).join("");
  }

  function renderRanks() {
    var list = catalog.ranks && catalog.ranks[jumpRank];
    Array.prototype.forEach.call(jumpRankBar.querySelectorAll("[data-rank]"), function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-rank") === jumpRank ? "true" : "false");
    });
    if (!list) {
      jumpRankCount.textContent = "";
      jumpRankRows.innerHTML = '<tr><td class="empty-row" colspan="3">' +
        (catalogRetrieved ? "Ranks could not be read." : "Loading ranks…") + "</td></tr>";
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

  function renderOverview() {
    if (!servers.length) {
      document.getElementById("community-stats").innerHTML = "";
      document.getElementById("region-grid").innerHTML = "";
      setServerStatus();
      return;
    }
    var online = servers.filter(function (server) { return server.online; });
    var players = online.reduce(function (sum, server) { return sum + (server.players || 0); }, 0);
    var running = {};
    online.forEach(function (server) {
      if (server.map) running[server.map] = true;
    });
    var regions = {};
    servers.forEach(function (server) {
      var name = server.region === "Not stated" ? "Not stated" : server.region;
      if (!regions[name]) regions[name] = { name: name, servers: 0, players: 0 };
      regions[name].servers += 1;
      if (server.online) regions[name].players += server.players || 0;
    });
    var regionList = Object.keys(regions).map(function (name) { return regions[name]; }).sort(function (a, b) {
      return b.players - a.players || b.servers - a.servers;
    });
    document.getElementById("community-stats").innerHTML =
      statCard("Jump servers online", online.length + " / " + servers.length) +
      statCard("Players online", players.toLocaleString()) +
      statCard("Maps running", Object.keys(running).length.toLocaleString());
    document.getElementById("region-grid").innerHTML = regionList.map(function (region) {
      return '<article class="info-card"><h3>' + escapeHtml(region.name) + "</h3><p>" +
        region.servers.toLocaleString() + " servers · " + region.players.toLocaleString() + " players online</p></article>";
    }).join("");
    setServerStatus();
  }

  function renderServers() {
    if (!filterForm) return;
    var filters = Object.fromEntries(new FormData(filterForm).entries());
    var visible = servers.filter(function (server) {
      return matches(server, filters);
    }).sort(function (a, b) {
      var aPlayers = a.online ? a.players || 0 : -1;
      var bPlayers = b.online ? b.players || 0 : -1;
      if (bPlayers !== aPlayers) return bPlayers - aPlayers;
      var aLatency = a.latency == null ? 9999 : a.latency;
      var bLatency = b.latency == null ? 9999 : b.latency;
      return aLatency - bLatency;
    });

    filterCount.textContent = servers.length ? visible.length + " of " + servers.length + " jump servers" : "";
    if (!servers.length) {
      serverRows.innerHTML = '<tr><td class="empty-row" colspan="8">' + escapeHtml(loadError || "Loading jump servers…") + "</td></tr>";
      return;
    }
    if (!visible.length) {
      serverRows.innerHTML = '<tr><td class="empty-row" colspan="8">No servers match these filters.</td></tr>';
      return;
    }

    serverRows.innerHTML = visible.map(function (server) {
      var players = server.online ? (server.players || 0) + "/" + (server.maxPlayers == null ? "?" : server.maxPlayers) : "Offline";
      var address = server.url
        ? '<a href="' + escapeHtml(server.url) + '">' + escapeHtml(server.address) + "</a>"
        : escapeHtml(server.address);
      return "<tr>" +
        '<td data-label="Server"><strong>' + escapeHtml(server.name) + '</strong><span class="class-role">' + escapeHtml(server.communityLabel) + "</span></td>" +
        '<td data-label="Region">' + escapeHtml(regionText(server)) + "</td>" +
        '<td data-label="Est. tier">' + escapeHtml(server.tier) + "</td>" +
        '<td data-label="Rank">' + escapeHtml(server.rankLabel) + "</td>" +
        '<td data-label="Map">' + escapeHtml(server.map || "—") + "</td>" +
        '<td data-label="Players">' + players + "</td>" +
        '<td data-label="Est. latency">' + (server.latency == null ? "—" : "est. " + server.latency + " ms") + "</td>" +
        '<td data-label="Address">' + address + "</td>" +
      "</tr>";
    }).join("");
  }

  function matches(server, filters) {
    if (filters.region !== "all" && server.region !== filters.region) return false;
    if (filters.latency !== "all" && (server.latency == null || server.latency > Number(filters.latency))) return false;
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

  function replaceTempus(list) {
    servers = servers.filter(function (server) { return server.category !== "tempus"; }).concat(list.map(describeServer));
  }

  function replaceAcademy(list) {
    servers = servers.filter(function (server) { return server.category !== "jumpacademy"; }).concat(list.map(describeServer));
  }

  function describeServer(server) {
    var region = regionFor(server);
    var rank = rankLimitFor(server.name);
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
      region: region.name,
      regionSource: region.source,
      latency: region.source === "unknown" ? null : latencyByRegion[region.name] || null,
      tier: tierFor(server),
      rankLimit: rank.limit,
      rankSource: rank.source,
      rankLabel: rankLabel(rank)
    };
  }

  function regionText(server) {
    if (server.regionSource === "unknown") return "Not stated";
    if (server.regionSource === "name") return server.region + " · from name";
    return server.region;
  }

  function regionFor(server) {
    if (server.country && regionByCountry[server.country]) return { name: regionByCountry[server.country], source: "country" };
    var name = server.name;
    if (/\| KOR\b| Asia/.test(name)) return { name: "Asia", source: "name" };
    if (/\| AU\b/.test(name)) return { name: "Oceania", source: "name" };
    if (/\| EU\b/.test(name)) return { name: "Europe", source: "name" };
    if (/US East|US West|US Central/.test(name)) return { name: "North America", source: "name" };
    return { name: "Not stated", source: "unknown" };
  }

  function rankLimitFor(name) {
    var match = String(name).match(/Rank (\d+)/i);
    if (match) return { limit: Number(match[1]), source: "name" };
    var skill = String(name).match(/S(\d)/);
    if (skill && Number(skill[1]) >= 5) return { limit: 100, source: "heuristic" };
    if (skill && Number(skill[1]) >= 4) return { limit: 200, source: "heuristic" };
    return { limit: null, source: "unknown" };
  }

  function rankLabel(rank) {
    if (rank.source === "name") return "Top " + rank.limit;
    if (rank.source === "heuristic") return "Est. top " + rank.limit;
    return "Not stated";
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

  function normalizeMaps(list) {
    if (!Array.isArray(list)) return [];
    return list.map(function (item) {
      if (!item || typeof item.name !== "string" || typeof item.id !== "number") return null;
      var zones = item.zone_counts || {};
      var tiers = item.tier_info || {};
      var rating = item.rating_info || {};
      var videos = item.videos || {};
      var authors = Array.isArray(item.authors) ? item.authors.map(function (author) {
        return author && typeof author.name === "string" ? author.name : "";
      }).filter(Boolean).join(", ") : "";
      return {
        id: item.id,
        name: item.name,
        kind: kindFromName(item.name),
        s: numberOrZero(tiers["3"]),
        d: numberOrZero(tiers["4"]),
        sr: numberOrZero(rating["3"]),
        dr: numberOrZero(rating["4"]),
        sv: youtubeId(videos.soldier),
        dv: youtubeId(videos.demoman),
        bonus: numberOrZero(zones.bonus),
        course: numberOrZero(zones.course),
        trick: numberOrZero(zones.trick),
        linear: numberOrZero(zones.linear),
        checkpoint: numberOrZero(zones.checkpoint),
        authors: authors
      };
    }).filter(Boolean);
  }

  function normalizeActivity(raw) {
    if (!raw || typeof raw !== "object") return null;
    var keys = ["map_wrs", "course_wrs", "bonus_wrs", "trick_wrs", "map_tops"];
    var groups = {};
    for (var i = 0; i < keys.length; i++) {
      var list = raw[keys[i]];
      if (!Array.isArray(list) || !list.length) return null;
      groups[keys[i]] = list.map(function (item) {
        var record = item && item.record_info;
        var place = keys[i] === "map_tops" && record && typeof record.rank === "number" ? record.rank : 1;
        return normalizeRun(item, place);
      }).filter(Boolean);
      if (!groups[keys[i]].length) return null;
    }
    return groups;
  }

  function normalizeRun(item, place) {
    var record = item && item.record_info;
    var player = item && item.player_info;
    var map = item && item.map_info;
    var zone = item && item.zone_info;
    if (!record || typeof record.duration !== "number") return null;
    return {
      player: player && typeof player.name === "string" ? player.name : "—",
      playerId: player && typeof player.id === "number" ? player.id : 0,
      map: map && typeof map.name === "string" ? map.name : "",
      zone: zone && zone.type || "",
      index: zone && zone.zoneindex || 0,
      zoneName: zone && zone.custom_name || "",
      class: record.class,
      time: record.duration,
      date: record.date,
      place: place
    };
  }

  function normalizeRankSet(raw) {
    if (!raw) return null;
    var overall = normalizeRankList(raw.overall);
    var soldier = normalizeRankList(raw.soldier);
    var demoman = normalizeRankList(raw.demoman);
    if (!overall || !soldier || !demoman) return null;
    return { overall: overall, soldier: soldier, demoman: demoman };
  }

  function normalizeRankList(raw) {
    if (!raw || !Array.isArray(raw.players) || !raw.players.length) return null;
    return {
      count: typeof raw.count === "number" ? raw.count : raw.players.length,
      players: raw.players.filter(function (player) {
        return player && typeof player.id === "number" && typeof player.name === "string";
      }).map(function (player) {
        return {
          id: player.id,
          name: player.name,
          points: Number(player.points) || 0,
          rank: player.rank
        };
      })
    };
  }

  function normalizeTempusServers(list) {
    if (!Array.isArray(list)) return [];
    return list.map(function (item) {
      var info = item && item.server_info;
      var game = item && item.game_info;
      if (!info || info.hidden || typeof info.name !== "string") return null;
      var host = info.ipAddr || info.addr;
      if (typeof host !== "string" || !/^[A-Za-z0-9.-]+$/.test(host) || typeof info.port !== "number") return null;
      var online = !!game && typeof game.playerCount === "number";
      return {
        name: game && typeof game.hostname === "string" && game.hostname ? game.hostname : info.name,
        address: host + ":" + info.port,
        map: game && typeof game.currentMap === "string" ? game.currentMap : "",
        players: online ? game.playerCount : 0,
        maxPlayers: game && typeof game.maxPlayers === "number" ? game.maxPlayers : null,
        online: online,
        country: typeof info.country === "string" ? info.country : "",
        category: "tempus",
        url: "steam://connect/" + host + ":" + info.port
      };
    }).filter(Boolean);
  }

  function normalizeAcademyServers(list) {
    if (!Array.isArray(list)) return [];
    return list.map(function (item) {
      if (!item || typeof item.name !== "string" || typeof item.address !== "string") return null;
      var parts = item.address.split(":");
      if (parts.length !== 2 || !/^[0-9.]+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) return null;
      return {
        name: item.name,
        address: item.address,
        map: typeof item.map === "string" ? item.map : "",
        players: item.online ? Number(item.players) || 0 : 0,
        maxPlayers: typeof item.maxPlayers === "number" ? item.maxPlayers : null,
        online: !!item.online,
        country: typeof item.country === "string" ? item.country : "",
        category: "jumpacademy",
        url: "steam://connect/" + item.address
      };
    }).filter(Boolean);
  }

  function kindFromName(name) {
    var prefix = String(name || "").split("_")[0];
    if (prefix === "sj" || prefix === "sticky") return "sticky";
    if (prefix === "conc") return "conc";
    if (prefix === "jump" || prefix === "rj") return "rocket";
    return "other";
  }

  function youtubeId(value) {
    return typeof value === "string" && /^[A-Za-z0-9_-]{6,}$/.test(value) ? value : "";
  }

  function numberOrZero(value) {
    return typeof value === "number" && isFinite(value) ? value : 0;
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

  function className(id) {
    if (id === 3) return "Soldier";
    if (id === 4) return "Demoman";
    if (typeof id === "number") return "Class " + id;
    return "—";
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
    if (isNaN(date.getTime())) return "—";
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return date.getUTCDate() + " " + months[date.getUTCMonth()] + " " + date.getUTCFullYear();
  }

  function formatIso(iso) {
    var match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!match) return "an unknown time";
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return Number(match[3]) + " " + months[Number(match[2]) - 1] + " " + match[1];
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

  function focusedValue(bar, attr) {
    var active = document.activeElement;
    if (!bar || !active || !bar.contains(active)) return "";
    return active.getAttribute(attr) || "";
  }

  function focusButton(bar, attr, value) {
    if (!bar || !value) return;
    var buttons = bar.querySelectorAll("[" + attr + "]");
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute(attr) === value) {
        buttons[i].focus();
        return;
      }
    }
  }

  function loadJson(url, timeout) {
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, timeout || 15000) : null;
    return fetch(url, controller ? { signal: controller.signal } : {}).then(function (response) {
      if (timer) clearTimeout(timer);
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    }, function (error) {
      if (timer) clearTimeout(timer);
      throw error;
    });
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }
})();
