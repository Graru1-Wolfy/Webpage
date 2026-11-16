(function () {
  var TF2 = window.TF2;
  var jumpClass = "soldier";
  var jumpTier = "all";
  var mapView = "grid";
  var shown = 24;
  var goal = "practice";
  var selectedPlayer = null;
  var playerStats = null;
  var playerRecords = null;
  var plazaMaps = [];
  var plazaByName = Object.create(null);
  var plazaRanks = null;
  var tierChoice = null;
  var selectedTags = Object.create(null);
  var recordsState = "idle";
  var lookupToken = 0;
  var groupTarget = null;
  var groupToken = 0;
  var listMode = "catalog";
  var titleChoice = null;
  var showFinished = true;
  var groupTimeCache = Object.create(null);
  var groupTimeFlight = Object.create(null);
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
  var recommendRefine = document.getElementById("recommend-refine");
  var suggestCap = document.getElementById("suggest-cap");
  var suggestTags = document.getElementById("suggest-tags");
  var suggestCapLabel = document.getElementById("suggest-cap-label");
  var goalBar = document.getElementById("recommend-goal");
  var playerTools = document.getElementById("player-tools");
  var playerDetail = document.getElementById("player-detail");
  var listBar = document.getElementById("list-mode");
  var finishedBar = document.getElementById("finished-mode");
  var titleTarget = document.getElementById("title-target");
  var titleLabel = document.getElementById("title-target-label");

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
    if (playerStats) loadGroupTarget();
    renderMaps();
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
    shown = 24;
    if (playerStats) loadGroupTarget();
    else renderMaps();
  });
  if (finishedBar) finishedBar.addEventListener("click", function (event) {
    var button = event.target.closest("[data-finished]");
    if (!button) return;
    showFinished = button.getAttribute("data-finished") !== "hide";
    shown = 24;
    renderMaps();
  });
  listBar.addEventListener("click", function (event) {
    var button = event.target.closest("[data-list]");
    if (!button) return;
    listMode = button.getAttribute("data-list") === "catalog" ? "catalog" : "suggested";
    shown = 24;
    renderMaps();
  });
  titleTarget.addEventListener("change", function () {
    var value = Number(titleTarget.value);
    titleChoice = titleTarget.value && isFinite(value) ? value : null;
    shown = 24;
    if (playerStats) loadGroupTarget();
  });
  suggestCap.addEventListener("click", function (event) {
    var button = event.target.closest("[data-cap]");
    if (!button) return;
    var value = button.getAttribute("data-cap");
    tierChoice = value === "auto" ? null : Number(value);
    renderMaps();
  });
  suggestTags.addEventListener("click", function (event) {
    var button = event.target.closest("[data-tag]");
    if (!button) return;
    var tag = button.getAttribute("data-tag");
    if (!tag) return;
    if (selectedTags[tag]) delete selectedTags[tag];
    else selectedTags[tag] = true;
    renderMaps();
  });
  recommendForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var query = new FormData(recommendForm).get("player");
    query = String(query || "").trim();
    selectedPlayer = null;
    playerStats = null;
    clearPlaza();
    recordsState = "idle";
    lookupToken += 1;
    searchResults = [];
    try {
      renderMaps();
    } catch (error) {
      /* The search still runs when the list cannot be drawn yet. */
    }
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
  TF2.loadTempus({ maps: true }, showLoadedCatalog).catch(function () {
    if (!TF2.loadError) TF2.loadError = "The map catalog could not be read.";
    showLoadedCatalog();
  });

  function choosePlayer(player) {
    selectedPlayer = player;
    searchResults = [];
    playerStats = null;
    clearPlaza();
    recordsState = "loading";
    listMode = "suggested";
    var token = ++lookupToken;
    renderPicks();
    recommendStatus.textContent = "Loading the Tempus profile and finished maps for " + player.name + ".";
    playerDetail.textContent = "";
    renderMaps();
    TF2.loadPlazaRecords(player.id).then(function (payload) {
      if (token !== lookupToken) return;
      playerRecords = payload.records;
      rememberPlaza(payload.maps);
      plazaRanks = payload.ranks || null;
      recordsState = "ready";
      renderMaps();
      queueGroupTimes();
    }).catch(function () {
      if (token !== lookupToken) return;
      playerRecords = null;
      recordsState = "failed";
      renderMaps();
    });
    TF2.wait(1100).then(function () {
      return TF2.loadJson("https://tempus2.xyz/api/v0/players/id/" + player.id + "/stats", 15000);
    }).then(function (stats) {
      if (token !== lookupToken) return;
      if (!stats || !stats.class_rank_info || !stats.player_info) throw new Error("stats");
      playerStats = stats;
      loadGroupTarget();
    }).catch(function () {
      if (token !== lookupToken) return;
      recommendStatus.textContent = "The Tempus profile did not load.";
    });
  }

  function showLoadedCatalog() {
    setStatus();
    renderMaps();
  }

  function setStatus() {
    var node = document.getElementById("jump-status");
    if (!TF2.catalog.maps) {
      node.textContent = TF2.loadError || "Loading the Tempus catalog.";
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

  function useSuggestions() {
    return listMode === "suggested" && !!(selectedPlayer && playerStats);
  }

  function renderMaps() {
    syncPlayerChrome();
    Array.prototype.forEach.call(classBar.querySelectorAll("[data-class]"), function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-class") === jumpClass ? "true" : "false");
    });
    Array.prototype.forEach.call(viewBar.querySelectorAll("[data-view]"), function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-view") === mapView ? "true" : "false");
    });
    if (useSuggestions()) {
      tierBar.hidden = true;
      renderSuggestions();
      return;
    }
    tierBar.hidden = false;
    recommendRefine.hidden = true;
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
      var message = TF2.loadError || "Loading the Tempus catalog.";
      results.hidden = false;
      tableWrap.hidden = true;
      results.className = "";
      results.innerHTML = '<p class="empty-row">' + TF2.escapeHtml(message) + "</p>";
      rows.innerHTML = '<tr><td class="empty-row" colspan="4">' + TF2.escapeHtml(message) + "</td></tr>";
      more.hidden = true;
      return;
    }
    var visible = visibleMaps();
    count.textContent = visible.length + " of " + maps.length + " maps";
    var slice = visible.slice(0, shown);
    queueGroupTimes(slice.map(function (map) { return map.name; }));
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
    if (!tableMode) {
      results.innerHTML = slice.map(function (map) { return cardHtml(map, catalogNote(map)); }).join("");
    }
    rows.innerHTML = slice.map(function (map) { return rowHtml(map, catalogNote(map)); }).join("");
  }

  function catalogNote(map) {
    var row = finishRow(map && map.name);
    if (!row) return "";
    var parts = ["Finished"];
    if (row.group) parts.push(row.group);
    if (typeof row.points === "number") parts.push(TF2.formatPoints(row.points) + " pts");
    var step = TF2.nextGroupStep(row.placement);
    var left = step ? timeLeft(row, step) : null;
    var label = left != null ? TF2.formatTimeLeft(left) : "";
    if (step && label) parts.push(label + " to " + step.group);
    return parts.join(" · ");
  }

  function finishRow(name) {
    if (recordsState !== "ready" || !name || !Array.isArray(playerRecords)) return null;
    var expected = jumpClass === "demoman" ? "demoman" : "soldier";
    for (var i = 0; i < playerRecords.length; i++) {
      var row = playerRecords[i];
      if (!row || row.map !== name || row.class !== expected) continue;
      if (row.type && row.type !== "map") continue;
      return row;
    }
    return null;
  }

  function cutoffRank(info, group) {
    if (!info || !group || group.charAt(0) !== "G") return null;
    var key = (jumpClass === "demoman" ? "demoman_g" : "soldier_g") + group.charAt(1);
    return typeof info[key] === "number" ? info[key] : null;
  }

  function timeLeft(row, step) {
    if (!row || typeof row.duration !== "number") return null;
    var info = plazaByName[row.map];
    var rank = cutoffRank(info, step.group);
    if (!info || typeof info.id !== "number" || rank == null) return null;
    var cutoff = groupTimeCache[jumpClass + ":" + info.id + ":" + rank];
    if (typeof cutoff !== "number") return null;
    var left = row.duration - cutoff;
    return left > 0 ? left : null;
  }

  function queueGroupTimes(names) {
    if (recordsState !== "ready" || !Array.isArray(playerRecords)) return;
    var preferred = Object.create(null);
    (names || []).forEach(function (name) { preferred[name] = true; });
    var cuts = [];
    var seen = Object.create(null);
    playerRecords.forEach(function (row) {
      var step = row ? TF2.nextGroupStep(row.placement) : null;
      var info = row ? plazaByName[row.map] : null;
      if (!step || !finishRow(row.map) || finishRow(row.map) !== row) return;
      var rank = cutoffRank(info, step.group);
      if (!info || typeof info.id !== "number" || rank == null || typeof row.duration !== "number") return;
      var key = jumpClass + ":" + info.id + ":" + rank;
      if (seen[key] || Object.prototype.hasOwnProperty.call(groupTimeCache, key) || groupTimeFlight[key]) return;
      seen[key] = true;
      var gain = TF2.groupPointGain(row);
      cuts.push({
        id: info.id,
        rank: rank,
        key: key,
        gain: gain ? gain.gain : 0,
        preferred: !!preferred[row.map]
      });
    });
    cuts.sort(function (a, b) {
      if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
      return b.gain - a.gain;
    });
    cuts = cuts.slice(0, 40);
    if (!cuts.length) return;
    cuts.forEach(function (cut) { groupTimeFlight[cut.key] = true; });
    var requested = jumpClass;
    TF2.loadGroupTimes(requested, cuts).then(function (times) {
      var found = Object.create(null);
      (times || []).forEach(function (row) {
        if (!row || typeof row.id !== "number" || typeof row.rank !== "number" || typeof row.duration !== "number") return;
        var key = requested + ":" + row.id + ":" + row.rank;
        groupTimeCache[key] = row.duration;
        found[key] = true;
      });
      cuts.forEach(function (cut) {
        delete groupTimeFlight[cut.key];
        if (!found[cut.key] && !Object.prototype.hasOwnProperty.call(groupTimeCache, cut.key)) groupTimeCache[cut.key] = false;
      });
      renderMaps();
    }).catch(function () {
      cuts.forEach(function (cut) {
        delete groupTimeFlight[cut.key];
        if (!Object.prototype.hasOwnProperty.call(groupTimeCache, cut.key)) groupTimeCache[cut.key] = false;
      });
    });
  }

  function pointImprovements() {
    var catalog = Object.create(null);
    (TF2.catalog.maps || []).forEach(function (map) {
      if (map && map.name) catalog[map.name] = map;
    });
    var items = [];
    var seen = Object.create(null);
    playerRecords.forEach(function (row) {
      if (!row || seen[row.map] || !catalog[row.map] || finishRow(row.map) !== row) return;
      var gain = TF2.groupPointGain(row);
      var step = TF2.nextGroupStep(row.placement);
      var left = step ? timeLeft(row, step) : null;
      if (!gain || left == null) return;
      seen[row.map] = true;
      items.push({
        map: catalog[row.map],
        tier: row.tier,
        gain: gain.gain,
        timeLeft: left,
        group: gain.group,
        points: gain.points,
        improve: true
      });
    });
    return items;
  }

  function clearPlaza() {
    playerRecords = null;
    plazaRanks = null;
    tierChoice = null;
    titleChoice = null;
    selectedTags = Object.create(null);
    groupTarget = null;
    groupToken += 1;
    groupTimeCache = Object.create(null);
    groupTimeFlight = Object.create(null);
    listMode = "catalog";
    rememberPlaza([]);
  }

  function currentRankTitle() {
    if (!playerStats || !playerStats.class_rank_info) return "";
    var classId = jumpClass === "demoman" ? "4" : "3";
    var info = playerStats.class_rank_info[classId] || {};
    return typeof info.title === "string" ? info.title : "";
  }

  function classRankNumber() {
    if (!playerStats || !playerStats.class_rank_info) return null;
    var classId = jumpClass === "demoman" ? "4" : "3";
    var info = playerStats.class_rank_info[classId] || {};
    return typeof info.rank === "number" ? info.rank : null;
  }

  function shownTitle(rank) {
    var placed = typeof rank === "number" ? TF2.rankTitle(rank) : null;
    var api = currentRankTitle();
    if (placed && (!api || TF2.rankGroupName(api) === placed.title)) return placed.label;
    return api;
  }

  function loadGroupTarget() {
    var title = currentRankTitle();
    var rank = classRankNumber();
    var chosen = goal === "points" && titleChoice
      ? TF2.rankChoices().filter(function (choice) { return choice.maxRank === titleChoice; })[0]
      : null;
    var next = chosen || (rank ? TF2.nextRankStep(rank) : TF2.nextRankGroup(title));
    var token = ++groupToken;
    if (!title && !rank) {
      groupTarget = null;
      renderMaps();
      return;
    }
    if (!next) {
      var known = TF2.isHighestRankGroup(title) || (rank && TF2.rankTitle(rank) && TF2.rankTitle(rank).title === "Emperor");
      groupTarget = { title: "", points: null, state: known ? "top" : "unknown" };
      renderMaps();
      return;
    }
    groupTarget = { title: next.label || next.title, points: null, state: "loading" };
    renderMaps();
    var classId = jumpClass === "demoman" ? 4 : 3;
    loadCutoff(classId, next.maxRank).then(function (boundary) {
      if (token !== groupToken) return;
      var upper = boundary.rank ? TF2.rankTitle(boundary.rank) : null;
      groupTarget = {
        title: upper ? upper.label : (next.label || next.title),
        rank: boundary.rank,
        points: boundary.points,
        belowRank: boundary.belowRank,
        belowPoints: boundary.belowPoints,
        state: boundary.points == null ? "missing" : "ready"
      };
      renderMaps();
    }).catch(function () {
      if (token !== groupToken) return;
      groupTarget = { title: next.title, points: null, state: "missing" };
      renderMaps();
    });
  }

  function loadCutoff(classId, maxRank) {
    function read(start) {
      return TF2.loadJson("https://tempus2.xyz/api/v0/ranks/class/" + classId + "?start=" + start, 15000).then(function (data) {
        return TF2.rankBoundary(data && data.players, maxRank);
      });
    }
    function merge(first, second) {
      return {
        rank: first.rank != null ? first.rank : second.rank,
        points: first.points != null ? first.points : second.points,
        belowRank: first.belowRank != null ? first.belowRank : second.belowRank,
        belowPoints: first.belowPoints != null ? first.belowPoints : second.belowPoints
      };
    }
    return read(maxRank).then(function (boundary) {
      if ((boundary.points != null && boundary.belowPoints != null) || maxRank <= 1) return boundary;
      return read(Math.max(1, maxRank - 49)).then(function (wider) {
        return merge(boundary, wider);
      });
    });
  }

  function rememberPlaza(list) {
    plazaMaps = list || [];
    plazaByName = Object.create(null);
    plazaMaps.forEach(function (map) {
      if (map && map.name) plazaByName[map.name] = map;
    });
  }

  function tagsFor(name) {
    return TF2.mapTagNames(plazaByName[name], jumpClass);
  }

  function classTitle() {
    return jumpClass === "demoman" ? "Demoman" : "Soldier";
  }

  function cardHtml(map, note) {
    var page = TF2.mapPageUrl(map.name);
    var shot = TF2.screenshotUrl(map.name);
    var image = shot
      ? '<img src="' + shot + '" alt="" width="320" height="180" loading="lazy" onerror="this.hidden=true; if (this.nextElementSibling) this.nextElementSibling.hidden=false"><span class="map-shot map-shot-fallback" hidden>No screenshot</span>'
      : '<span class="map-shot map-shot-fallback">No screenshot</span>';
    var detail = TF2.classLabel(TF2.classTier(map, jumpClass), TF2.classRating(map, jumpClass));
    var open = page ? '<a class="map-card" href="' + page + '">' : '<article class="map-card">';
    var close = page ? "</a>" : "</article>";
    var tags = tagsFor(map.name);
    var tagLine = tags.length
      ? '<span>' + TF2.escapeHtml(tags.slice(0, 3).join(" · ") + (tags.length > 3 ? " · +" + (tags.length - 3) : "")) + "</span>"
      : "";
    var noteLine = typeof note === "string" && note ? "<span>" + TF2.escapeHtml(note) + "</span>" : "";
    return open + image +
      '<div class="map-card-body"><strong>' + TF2.escapeHtml(map.name) + "</strong><span>" +
      TF2.escapeHtml(detail) + "</span><span>" + TF2.escapeHtml(TF2.layoutLabel(map)) + "</span>" +
      noteLine + tagLine + "</div>" + close;
  }

  function rowHtml(map, note) {
    var page = TF2.mapPageUrl(map.name);
    var name = page
      ? '<a href="' + page + '">' + TF2.escapeHtml(map.name) + "</a>"
      : TF2.escapeHtml(map.name);
    var detail = map.authors || "";
    if (map.kind !== "rocket") detail = TF2.kindLabels[map.kind] + (detail ? " · " + detail : "");
    if (typeof note === "string" && note) detail = note + (detail ? " · " + detail : "");
    var tags = tagsFor(map.name);
    var layout = TF2.layoutLabel(map);
    if (tags.length) layout += " · " + tags.slice(0, 3).join(" · ");
    return "<tr><td data-label=\"Map\"><strong>" + name + '</strong><span class="class-role">' + TF2.escapeHtml(detail) +
      "</span></td><td data-label=\"Soldier\">" + classCell(map.s, map.sr, map.sv) +
      "</td><td data-label=\"Demoman\">" + classCell(map.d, map.dr, map.dv) +
      "</td><td data-label=\"Layout\">" + TF2.escapeHtml(layout) + "</td></tr>";
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

  function syncPlayerChrome() {
    if (!playerTools || !goalBar || !titleLabel || !listBar || !titleTarget) return;
    if (typeof TF2.rankChoices !== "function") return;
    playerTools.hidden = !selectedPlayer;
    goalBar.hidden = !selectedPlayer || listMode !== "suggested";
    if (finishedBar) finishedBar.hidden = !selectedPlayer || listMode !== "suggested";
    titleLabel.hidden = !(selectedPlayer && goal === "points" && listMode === "suggested");
    Array.prototype.forEach.call(goalBar.querySelectorAll("[data-goal]"), function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-goal") === goal ? "true" : "false");
    });
    Array.prototype.forEach.call(listBar.querySelectorAll("[data-list]"), function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-list") === listMode ? "true" : "false");
    });
    if (finishedBar) {
      Array.prototype.forEach.call(finishedBar.querySelectorAll("[data-finished]"), function (button) {
        var showing = button.getAttribute("data-finished") !== "hide";
        button.setAttribute("aria-pressed", showing === showFinished ? "true" : "false");
      });
    }
    var html = '<option value="">Next title</option>';
    var group = "";
    TF2.rankChoices().forEach(function (choice) {
      if (choice.title !== group) {
        if (group) html += "</optgroup>";
        group = choice.title;
        html += '<optgroup label="' + TF2.escapeHtml(group) + '">';
      }
      var range = choice.minRank === choice.maxRank
        ? "rank " + choice.maxRank.toLocaleString()
        : "ranks " + choice.minRank.toLocaleString() + "–" + choice.maxRank.toLocaleString();
      html += '<option value="' + choice.maxRank + '">' + TF2.escapeHtml(choice.label + " · " + range) + "</option>";
    });
    if (group) html += "</optgroup>";
    if (titleTarget.innerHTML !== html) titleTarget.innerHTML = html;
    titleTarget.value = titleChoice ? String(titleChoice) : "";
  }

  function renderSuggestions() {
    if (!selectedPlayer || !playerStats) return;
    var established = recordsState === "ready" ? TF2.establishedTier(playerRecords, jumpClass) : 0;
    if (established > 0) renderRichSuggestions(established);
    else renderBandSuggestions();
  }

  function renderBandSuggestions() {
    recommendRefine.hidden = true;
    var classId = jumpClass === "demoman" ? "4" : "3";
    var classRank = playerStats.class_rank_info[classId] || {};
    var completions = playerStats.pr_stats && playerStats.pr_stats.map ? playerStats.pr_stats.map.count : null;
    var rank = typeof classRank.rank === "number" ? classRank.rank : null;
    var points = typeof classRank.points === "number" ? classRank.points : null;
    var band = TF2.suggestBand(rank, completions, goal);
    var finished = recordsState === "ready" ? TF2.finishedMapNames(playerRecords, jumpClass) : null;
    var maps = (TF2.catalog.maps || []).filter(function (map) {
      if (!showFinished && finished && finished[map.name]) return false;
      return TF2.mapInBand(map, jumpClass, band);
    }).sort(function (a, b) {
      return TF2.compareSuggested(a, b, jumpClass, goal);
    });
    var tierText = band.min === band.max ? "tier " + band.min : band.max >= 99 ? "tier " + band.min + " and above" : "tiers " + band.min + "–" + band.max;
    var placed = shownTitle(rank) || classRank.title || "";
    var profile = (placed ? selectedPlayer.name + " is " + placed + ", " : selectedPlayer.name + " is ") + classTitle();
    if (points != null) profile += " with " + Math.round(points).toLocaleString() + " points";
    profile += ". Suggested " + tierText + ".";
    var caveat = "This tier band is a suggestion from the class rank and completion count. Points shown are the profile total, not a calculated reward for a map.";
    if (recordsState === "ready") {
      var finishedCount = finished ? Object.keys(finished).length : 0;
      var detailed = (playerRecords || []).some(function (row) { return row && typeof row.tier === "number"; });
      caveat += showFinished
        ? " Finished maps stay in the suggestions until you hide them."
        : " Left out " + finishedCount.toLocaleString() + " finished " + classTitle() + " maps for this visit.";
      caveat += " This site does not keep a copy.";
      if (playerRecords && playerRecords.length && !detailed) {
        caveat += " The lookup did not include tier, group, or points, so this band still comes from class rank and completion count.";
      }
    } else if (recordsState === "loading") {
      caveat += " Finished maps from Tempus Plaza are still loading.";
    } else {
      caveat += " Tempus Plaza did not return the finished maps, so a suggestion may already be completed.";
    }
    recommendStatus.textContent = profile;
    playerDetail.textContent = caveat;
    var current = filters();
    var visible = maps.filter(function (map) { return TF2.matchesMap(map, current, "all", jumpClass); });
    paintList(visible, function (map) {
      return showFinished ? catalogNote(map) : "";
    }, "No maps in the catalog match this suggestion.", visible.length + " suggested maps");
  }

  function renderRichSuggestions(established) {
    var info = classStanding();
    var gap = groupGap(info);
    var result = TF2.selectSuggestions(TF2.catalog.maps || [], {
      jumpClass: jumpClass,
      goal: goal,
      records: playerRecords,
      plazaMaps: plazaMaps,
      maxTier: tierChoice,
      tags: Object.keys(selectedTags),
      gap: gap,
      limit: 1000,
      includeFinished: showFinished,
      improvements: pointImprovements()
    });
    var current = filters();
    var items = result.items.filter(function (item) { return TF2.matchesMap(item.map, current, "all", jumpClass); });
    recommendRefine.hidden = false;
    renderCap(established);
    renderTagChips(result.tagCounts);
    recommendStatus.textContent = standingText(info, result);
    playerDetail.textContent = detailText(result, info, gap);
    if (!items.length) {
      paintList([], function () { return ""; }, emptySuggestion(result), "0 suggested maps");
      return;
    }
    paintList(items.map(function (item) { return item.map; }), function (map) {
      var item = items.filter(function (entry) { return entry.map === map; })[0];
      if (item && item.improve) {
        var left = TF2.formatTimeLeft(item.timeLeft);
        return (left ? left + " to " + item.group : item.group) + " · +" + TF2.formatPoints(item.gain) + " pts";
      }
      if (item && item.finished) return catalogNote(map);
      return goal === "points" && item && item.points != null
        ? TF2.formatPoints(item.points) + " pts · " + (item.group || "G5")
        : "";
    }, emptySuggestion(result), items.length + " suggested maps");
  }

  function classStanding() {
    var key = jumpClass === "demoman" ? "demoman" : "soldier";
    var plaza = plazaRanks && plazaRanks[key];
    if (plaza && typeof plaza.rank === "number" && typeof plaza.points === "number") {
      return { rank: plaza.rank, points: plaza.points, source: "Tempus Plaza" };
    }
    var classId = jumpClass === "demoman" ? "4" : "3";
    var classRank = playerStats.class_rank_info[classId] || {};
    return {
      rank: typeof classRank.rank === "number" ? classRank.rank : null,
      points: typeof classRank.points === "number" ? classRank.points : null,
      source: "the Tempus profile"
    };
  }

  function groupGap(info) {
    if (!groupTarget || groupTarget.state !== "ready" || typeof groupTarget.points !== "number" || info.points == null) return null;
    return groupTarget.points - info.points;
  }

  function standingText(info) {
    var label = classTitle();
    var title = shownTitle(info.rank);
    var sentence = title ? selectedPlayer.name + " is " + title + ", " + label : selectedPlayer.name + " is " + label;
    if (info.rank) sentence += " rank " + info.rank.toLocaleString();
    if (info.points != null) sentence += " with " + TF2.formatPoints(info.points) + " points on " + info.source;
    sentence += ".";
    if (goal === "points" && groupTarget && groupTarget.state === "ready" && info.points != null) {
      var remain = groupTarget.points - info.points;
      sentence += remain > 0
        ? " " + TF2.formatPoints(remain) + " points remain to reach " + groupTarget.title + "."
        : " These points already reach " + groupTarget.title + ".";
    } else if (goal === "points" && groupTarget && groupTarget.state === "loading") {
      sentence += " Checking the points for " + (groupTarget.title || "the next title") + ".";
    } else if (goal === "points" && groupTarget && groupTarget.state === "top") {
      sentence += " Emperor is the highest title.";
    }
    return sentence;
  }

  function detailText(result, info, gap) {
    var label = classTitle();
    var title = shownTitle(info.rank);
    var sentence = "";
    if (groupTarget && groupTarget.state === "ready" && info.points != null) {
      var remain = groupTarget.points - info.points;
      var lowerPlaced = groupTarget.belowRank ? TF2.rankTitle(groupTarget.belowRank) : null;
      var lowerTitle = lowerPlaced ? lowerPlaced.label : title;
      if (groupTarget.rank && groupTarget.belowRank && lowerTitle) {
        sentence += " The title changes between " + label + " rank " + groupTarget.rank.toLocaleString() + " and rank " + groupTarget.belowRank.toLocaleString() + ".";
        sentence += " Rank " + groupTarget.rank.toLocaleString() + " is " + groupTarget.title + " at " + TF2.formatPoints(groupTarget.points) + " points";
        sentence += groupTarget.belowPoints != null
          ? ", and rank " + groupTarget.belowRank.toLocaleString() + " is " + lowerTitle + " at " + TF2.formatPoints(groupTarget.belowPoints) + " points."
          : ".";
      }
      sentence += remain > 0
        ? " " + TF2.formatPoints(remain) + " points remain to reach rank " + (groupTarget.rank ? groupTarget.rank.toLocaleString() : groupTarget.title) + "."
        : " These points already reach rank " + (groupTarget.rank ? groupTarget.rank.toLocaleString() : groupTarget.title) + ".";
    } else if (groupTarget && groupTarget.state === "top") {
      sentence += " Emperor is the highest rank group.";
    } else if (groupTarget && groupTarget.state === "unknown") {
      sentence += " The next rank group for this title was not recognized.";
    } else if (groupTarget && groupTarget.state === "missing") {
      sentence += " The next rank group is " + groupTarget.title + ". The points for that group were not available.";
    } else if (groupTarget && groupTarget.state === "loading") {
      sentence += " Checking the points for the next rank group.";
    }
    var usual = TF2.usualGroup(playerRecords, jumpClass);
    sentence += " Finished " + label + " maps put the comfortable tier at " + result.established + (usual ? ", and the usual group is " + usual : "") + ".";
    sentence += " " + tierWindow(result);
    if (tierChoice != null && tierChoice > result.established + 2) {
      sentence += " Tier " + tierChoice + " is more than two tiers above the comfortable tier, so a finish is much less likely.";
    }
    if (goal === "points") {
      sentence += " Point values use the Tempus Plaza calculator for the usual group on that tier. A tier with no finish yet is counted as G5, which is completion points only.";
      sentence += " A finished time within 2 seconds of the next group, from G5 up to G1, is included with these maps.";
      if (gap > 0 && result.items.length && result.items.every(function (item) { return item.tier <= result.established && item.points >= gap; })) {
        sentence += " These maps can cover the " + TF2.formatPoints(gap) + " points at the comfortable tier.";
      } else if (gap > 0 && result.items.length) {
        sentence += " These maps stay inside the tier limit and do not cover the full gap to the next rank group.";
      }
    }
    var finishedCount = Object.keys(TF2.finishedMapNames(playerRecords, jumpClass)).length;
    sentence += showFinished
      ? " Finished maps stay in the suggestions until you hide them."
      : " Left out " + finishedCount.toLocaleString() + " finished " + label + " maps for this visit.";
    sentence += " This site does not keep a copy.";
    return sentence.replace(/^\s+/, "");
  }

  function tierWindow(result) {
    if (goal === "practice") {
      var floor = Math.max(1, result.established - 1);
      return floor === result.cap ? "Practice stays on tier " + floor + "." : "Practice stays on tiers " + floor + "–" + result.cap + ".";
    }
    if (goal === "improve") {
      if (result.cap < result.established + 1) return "The highest tier is " + result.cap + ", under the next step.";
      var start = result.established + 1;
      return start === result.cap ? "The step up stays on tier " + start + "." : "The step up stays on tiers " + start + "–" + result.cap + ".";
    }
    return "Suggestions stay at tier " + result.cap + " and below.";
  }

  function emptySuggestion(result) {
    if (Object.keys(selectedTags).length) return "No unfinished maps inside this tier limit have the selected tags.";
    if (goal === "improve" && result.cap < result.established + 1) {
      return "The highest tier is " + result.cap + ". The next step above the comfortable tier is " + (result.established + 1) + ".";
    }
    if (goal === "improve") return "No unfinished " + classTitle() + " maps are on the next tier inside this limit.";
    if (goal === "practice") return "No unfinished " + classTitle() + " maps remain on the comfortable tiers.";
    return "No unfinished " + classTitle() + " maps inside this tier limit can add points.";
  }

  function renderCap(established) {
    var buttons = ['<button type="button" data-cap="auto" aria-pressed="' + (tierChoice == null ? "true" : "false") + '">Auto</button>'];
    for (var tier = 1; tier <= 10; tier++) {
      buttons.push('<button type="button" data-cap="' + tier + '" aria-pressed="' + (tierChoice === tier ? "true" : "false") + '">T' + tier + "</button>");
    }
    suggestCap.innerHTML = buttons.join("");
    suggestCapLabel.textContent = "Highest tier. Comfortable tier is " + established + ".";
  }

  function renderTagChips(tagCounts) {
    var names = Object.keys(tagCounts || {});
    names.sort(function (a, b) {
      return tagCounts[b] - tagCounts[a] || (a < b ? -1 : a > b ? 1 : 0);
    });
    Object.keys(selectedTags).forEach(function (tag) {
      if (!tagCounts || !tagCounts[tag]) delete selectedTags[tag];
    });
    suggestTags.hidden = !names.length;
    suggestTags.innerHTML = names.map(function (tag) {
      return '<button type="button" data-tag="' + TF2.escapeHtml(tag) + '" aria-pressed="' +
        (selectedTags[tag] ? "true" : "false") + '">' + TF2.escapeHtml(tag) +
        " <span>" + tagCounts[tag] + "</span></button>";
    }).join("");
  }

  function paintList(maps, noteFor, emptyText, countText) {
    count.textContent = countText;
    var slice = maps.slice(0, shown);
    queueGroupTimes(slice.map(function (map) { return map.name; }));
    more.hidden = slice.length >= maps.length;
    if (!maps.length) {
      results.hidden = false;
      tableWrap.hidden = true;
      results.className = "";
      results.innerHTML = '<p class="empty-row">' + TF2.escapeHtml(emptyText) + "</p>";
      rows.innerHTML = '<tr><td class="empty-row" colspan="4">' + TF2.escapeHtml(emptyText) + "</td></tr>";
      return;
    }
    var tableMode = mapView === "table";
    results.hidden = tableMode;
    tableWrap.hidden = !tableMode;
    results.className = mapView === "list" ? "map-list" : "map-grid";
    if (!tableMode) results.innerHTML = slice.map(function (map) { return cardHtml(map, noteFor(map)); }).join("");
    rows.innerHTML = slice.map(function (map) { return rowHtml(map, noteFor(map)); }).join("");
  }

})();
