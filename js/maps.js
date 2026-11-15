(function () {
  var TF2 = window.TF2;
  var jumpClass = "soldier";
  var jumpTier = "all";
  var mapView = "grid";
  var shown = 24;
  var goal = "practice";
  var selectedPlayer = null;
  var playerStats = null;
  var searchResults = [];

  var classBar = document.getElementById("jump-class");
  var tierBar = document.getElementById("jump-tiers");
  var form = document.getElementById("jump-filters");
  var count = document.getElementById("jump-count");
  var results = document.getElementById("map-results");
  var tableWrap = document.getElementById("map-table-wrap");
  var rows = document.getElementById("jump-rows");
  var more = document.getElementById("map-more");
  var viewBar = document.getElementById("map-view");
  var recommendForm = document.getElementById("recommend-form");
  var recommendStatus = document.getElementById("recommend-status");
  var recommendPicks = document.getElementById("recommend-picks");
  var recommendResults = document.getElementById("recommend-results");
  var goalBar = document.getElementById("recommend-goal");

  try {
    var savedView = localStorage.getItem("tf2-map-view");
    if (savedView === "grid" || savedView === "list" || savedView === "table") mapView = savedView;
  } catch (error) {
    /* Keep the grid when storage is unavailable. */
  }

  classBar.addEventListener("click", function (event) {
    var button = event.target.closest("[data-class]");
    if (!button) return;
    jumpClass = button.getAttribute("data-class");
    shown = 24;
    renderMaps();
    renderSuggestions();
  });
  tierBar.addEventListener("click", function (event) {
    var button = event.target.closest("[data-tier]");
    if (!button) return;
    var next = button.getAttribute("data-tier");
    jumpTier = jumpTier === next ? "all" : next;
    shown = 24;
    renderMaps();
  });
  form.addEventListener("input", function () {
    shown = 24;
    renderMaps();
  });
  form.addEventListener("change", function () {
    shown = 24;
    renderMaps();
  });
  viewBar.addEventListener("click", function (event) {
    var button = event.target.closest("[data-view]");
    if (!button) return;
    mapView = button.getAttribute("data-view");
    try {
      localStorage.setItem("tf2-map-view", mapView);
    } catch (error) {
      /* The view still changes for this visit. */
    }
    renderMaps();
  });
  more.addEventListener("click", function () {
    shown += 24;
    renderMaps();
  });
  goalBar.addEventListener("click", function (event) {
    var button = event.target.closest("[data-goal]");
    if (!button) return;
    goal = button.getAttribute("data-goal");
    renderSuggestions();
  });
  recommendForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var query = new FormData(recommendForm).get("player");
    query = String(query || "").trim();
    selectedPlayer = null;
    playerStats = null;
    searchResults = [];
    renderSuggestions();
    if (query.length < 2) {
      recommendStatus.textContent = "Enter at least two characters of a Tempus player name.";
      return;
    }
    recommendStatus.textContent = "Searching Tempus players.";
    TF2.loadJson("https://tempus2.xyz/api/v0/search/playersAndMaps/" + encodeURIComponent(query), 15000).then(function (data) {
      var players = data && Array.isArray(data.players) ? data.players.filter(function (player) {
        return player && typeof player.id === "number" && typeof player.name === "string";
      }) : [];
      if (!players.length) {
        recommendStatus.textContent = "Tempus returned no players for that name.";
        return;
      }
      var exact = players.filter(function (player) {
        return player.name.toLowerCase() === query.toLowerCase();
      });
      if (exact.length === 1) {
        choosePlayer(exact[0]);
        return;
      }
      searchResults = players.slice(0, 12);
      recommendStatus.textContent = "Choose the Tempus player.";
      renderPicks();
    }).catch(function () {
      recommendStatus.textContent = "The Tempus player search did not respond.";
    });
  });
  recommendPicks.addEventListener("click", function (event) {
    var button = event.target.closest("[data-player]");
    if (!button) return;
    var id = Number(button.getAttribute("data-player"));
    var player = searchResults.filter(function (item) { return item.id === id; })[0];
    if (player) choosePlayer(player);
  });

  renderMaps();
  renderSuggestions();
  TF2.loadTempus({ maps: true }).then(function () {
    setStatus();
    renderMaps();
    renderSuggestions();
  });

  function choosePlayer(player) {
    selectedPlayer = player;
    searchResults = [];
    playerStats = null;
    renderPicks();
    recommendStatus.textContent = "Loading the Tempus profile for " + player.name + ".";
    TF2.wait(1100).then(function () {
      return TF2.loadJson("https://tempus2.xyz/api/v0/players/id/" + player.id + "/stats", 15000);
    }).then(function (stats) {
      if (!stats || !stats.class_rank_info || !stats.player_info) throw new Error("stats");
      playerStats = stats;
      renderSuggestions();
    }).catch(function () {
      recommendStatus.textContent = "The Tempus profile did not load.";
    });
  }

  function setStatus() {
    var node = document.getElementById("jump-status");
    if (!TF2.catalog.maps) {
      node.textContent = TF2.catalogRetrieved ? "The map catalog could not be read." : "Loading the Tempus catalog.";
      return;
    }
    node.textContent = TF2.catalogLive.maps
      ? "Map catalog is live from Tempus."
      : "Map catalog is the saved snapshot from " + TF2.formatIso(TF2.catalogRetrieved) + ".";
  }

  function filters() {
    var values = Object.fromEntries(new FormData(form).entries());
    values.query = values.query || "";
    return values;
  }

  function visibleMaps() {
    var maps = TF2.catalog.maps || [];
    var current = filters();
    return maps.filter(function (map) {
      return TF2.matchesMap(map, current, jumpTier, jumpClass);
    }).sort(function (a, b) {
      var aTier = TF2.classTier(a, jumpClass) || 99;
      var bTier = TF2.classTier(b, jumpClass) || 99;
      if (aTier !== bTier) return aTier - bTier;
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
  }

  function renderMaps() {
    Array.prototype.forEach.call(classBar.querySelectorAll("[data-class]"), function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-class") === jumpClass ? "true" : "false");
    });
    Array.prototype.forEach.call(viewBar.querySelectorAll("[data-view]"), function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-view") === mapView ? "true" : "false");
    });
    var maps = TF2.catalog.maps;
    var tierFocus = TF2.focusedValue(tierBar, "data-tier");
    var tiers = [
      { id: "1", label: "Tier 1" },
      { id: "2", label: "Tier 2" },
      { id: "3", label: "Tier 3" },
      { id: "4", label: "Tier 4" },
      { id: "5", label: "Tier 5" },
      { id: "6", label: "Tier 6+" }
    ];
    var current = filters();
    tierBar.innerHTML = tiers.map(function (tier) {
      var tierCount = maps ? maps.filter(function (map) {
        return TF2.matchesMap(map, current, tier.id, jumpClass);
      }).length : 0;
      return '<button type="button" data-tier="' + tier.id + '" aria-pressed="' + (jumpTier === tier.id) + '"><strong>' +
        tierCount + "</strong><span>" + tier.label + "</span></button>";
    }).join("");
    TF2.focusButton(tierBar, "data-tier", tierFocus);

    if (!maps) {
      count.textContent = "";
      results.innerHTML = "";
      rows.innerHTML = '<tr><td class="empty-row" colspan="4">Loading the Tempus catalog…</td></tr>';
      more.hidden = true;
      return;
    }
    var visible = visibleMaps();
    count.textContent = visible.length + " of " + maps.length + " maps";
    var slice = visible.slice(0, shown);
    more.hidden = slice.length >= visible.length;
    more.textContent = "Show more maps";
    if (!visible.length) {
      results.innerHTML = '<p class="empty-row">No maps match these filters.</p>';
      rows.innerHTML = '<tr><td class="empty-row" colspan="4">No maps match these filters.</td></tr>';
      return;
    }
    var tableMode = mapView === "table";
    results.hidden = tableMode;
    tableWrap.hidden = !tableMode;
    results.className = mapView === "list" ? "map-list" : "map-grid";
    if (!tableMode) results.innerHTML = slice.map(cardHtml).join("");
    rows.innerHTML = slice.map(rowHtml).join("");
  }

  function cardHtml(map) {
    var page = TF2.mapPageUrl(map.name);
    var shot = TF2.screenshotUrl(map.name);
    var image = shot
      ? '<img src="' + shot + '" alt="" width="320" height="180" loading="lazy" onerror="this.hidden=true; if (this.nextElementSibling) this.nextElementSibling.hidden=false"><span class="map-shot map-shot-fallback" hidden>No screenshot</span>'
      : '<span class="map-shot map-shot-fallback">No screenshot</span>';
    var detail = TF2.classLabel(TF2.classTier(map, jumpClass), TF2.classRating(map, jumpClass));
    var open = page ? '<a class="map-card" href="' + page + '">' : '<article class="map-card">';
    var close = page ? "</a>" : "</article>";
    return open + image +
      '<div class="map-card-body"><strong>' + TF2.escapeHtml(map.name) + "</strong><span>" +
      TF2.escapeHtml(detail) + "</span><span>" + TF2.escapeHtml(TF2.layoutLabel(map)) + "</span></div>" + close;
  }

  function rowHtml(map) {
    var page = TF2.mapPageUrl(map.name);
    var name = page
      ? '<a href="' + page + '">' + TF2.escapeHtml(map.name) + "</a>"
      : TF2.escapeHtml(map.name);
    var detail = map.authors || "";
    if (map.kind !== "rocket") detail = TF2.kindLabels[map.kind] + (detail ? " · " + detail : "");
    return "<tr><td data-label=\"Map\"><strong>" + name + '</strong><span class="class-role">' + TF2.escapeHtml(detail) +
      "</span></td><td data-label=\"Soldier\">" + classCell(map.s, map.sr, map.sv) +
      "</td><td data-label=\"Demoman\">" + classCell(map.d, map.dr, map.dv) +
      "</td><td data-label=\"Layout\">" + TF2.escapeHtml(TF2.layoutLabel(map)) + "</td></tr>";
  }

  function classCell(tier, rating, video) {
    var text = TF2.classLabel(tier, rating);
    if (!video) return text;
    return text + ' <a href="https://www.youtube.com/watch?v=' + encodeURIComponent(video) + '">Video</a>';
  }

  function renderPicks() {
    recommendPicks.innerHTML = searchResults.map(function (player) {
      return '<button type="button" data-player="' + player.id + '">' + TF2.escapeHtml(player.name) + "</button>";
    }).join("");
  }

  function renderSuggestions() {
    Array.prototype.forEach.call(goalBar.querySelectorAll("[data-goal]"), function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-goal") === goal ? "true" : "false");
    });
    if (!selectedPlayer || !playerStats) {
      recommendResults.innerHTML = "";
      return;
    }
    var classId = jumpClass === "demoman" ? "4" : "3";
    var classRank = playerStats.class_rank_info[classId] || {};
    var completions = playerStats.pr_stats && playerStats.pr_stats.map ? playerStats.pr_stats.map.count : null;
    var rank = typeof classRank.rank === "number" ? classRank.rank : null;
    var points = typeof classRank.points === "number" ? classRank.points : null;
    var band = TF2.suggestBand(rank, completions, goal);
    var maps = (TF2.catalog.maps || []).filter(function (map) {
      return TF2.mapInBand(map, jumpClass, band);
    }).sort(function (a, b) {
      return TF2.compareSuggested(a, b, jumpClass, goal);
    }).slice(0, 12);
    var tierText = band.min === band.max ? "tier " + band.min : band.max >= 99 ? "tier " + band.min + " and above" : "tiers " + band.min + "–" + band.max;
    var profile = selectedPlayer.name + " is " + (classRank.title ? classRank.title + ", " : "") +
      (rank ? "rank " + rank.toLocaleString() : "unranked") + " on " + (jumpClass === "demoman" ? "Demoman" : "Soldier");
    if (points != null) profile += " with " + Math.round(points).toLocaleString() + " points";
    if (typeof completions === "number") profile += ". Map completions on the profile: " + completions.toLocaleString();
    profile += ". Suggested " + tierText + ".";
    var caveat = " This tier band is a suggestion from the class rank and completion count. Tempus does not publish which maps this player has finished, so a suggestion may already be completed. Points shown are the profile total, not a calculated reward for a map.";
    recommendStatus.textContent = profile + caveat;
    if (!maps.length) {
      recommendResults.innerHTML = '<p class="empty-row">No maps in the catalog match this suggestion.</p>';
      return;
    }
    recommendResults.className = "map-grid";
    recommendResults.innerHTML = maps.map(cardHtml).join("");
  }
})();
