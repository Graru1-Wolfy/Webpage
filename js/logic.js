(function (root) {
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

  var regionOrder = ["Europe", "North America", "Asia", "Oceania", "South America", "Africa", "Not stated"];
  var tierOrder = { Beginner: 0, Intermediate: 1, Advanced: 2, Mixed: 3 };
  var ratings = { 1: "Good", 2: "Decent", 3: "Poor", 4: "Bad" };
  var kindLabels = { rocket: "Rocket jump", sticky: "Sticky jump", conc: "Conc", other: "Other" };
  var zoneNames = { map: "Map", course: "Course", bonus: "Bonus", trick: "Trick" };

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

  function screenshotUrl(name) {
    if (!/^[A-Za-z0-9_]+$/.test(name || "")) return "";
    return "https://static.tempus2.xyz/web/screenshots/raw/" + name + "_320p.jpeg";
  }

  function mapPageUrl(name) {
    if (!/^[A-Za-z0-9_]+$/.test(name || "")) return "";
    return "https://tempus2.xyz/maps/" + name;
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
        password: null,
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
        password: typeof item.password === "boolean" ? item.password : null,
        country: typeof item.country === "string" ? item.country : "",
        category: "jumpacademy",
        url: "steam://connect/" + item.address
      };
    }).filter(Boolean);
  }

  function applyPasswordFlags(servers, flags) {
    var byAddress = {};
    (flags || []).forEach(function (item) {
      if (item && typeof item.address === "string" && typeof item.password === "boolean") {
        byAddress[item.address] = item.password;
      }
    });
    return servers.map(function (server) {
      if (!Object.prototype.hasOwnProperty.call(byAddress, server.address)) return server;
      var copy = Object.assign({}, server);
      copy.password = byAddress[server.address];
      return copy;
    });
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

  function rankLimitFor(server) {
    if (server.category === "jumpacademy") return { limit: null, source: "none" };
    var match = String(server.name).match(/Rank (\d+)/i);
    if (match) return { limit: Number(match[1]), source: "name" };
    return { limit: null, source: "unknown" };
  }

  function rankLabel(rank) {
    if (rank.source === "none") return "No rank limit";
    if (rank.source === "name") return "Top " + rank.limit;
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

  function describeServer(server) {
    var region = regionFor(server);
    var rank = rankLimitFor(server);
    return {
      name: server.name,
      address: server.address,
      map: server.map,
      players: server.players,
      maxPlayers: server.maxPlayers,
      online: server.online,
      password: server.password === true ? true : server.password === false ? false : null,
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

  function compareServers(a, b) {
    var aLocked = a.password === true ? 1 : 0;
    var bLocked = b.password === true ? 1 : 0;
    if (aLocked !== bLocked) return aLocked - bLocked;
    var aRegion = regionOrder.indexOf(a.region);
    var bRegion = regionOrder.indexOf(b.region);
    if (aRegion < 0) aRegion = 99;
    if (bRegion < 0) bRegion = 99;
    if (aRegion !== bRegion) return aRegion - bRegion;
    var aTier = Object.prototype.hasOwnProperty.call(tierOrder, a.tier) ? tierOrder[a.tier] : 9;
    var bTier = Object.prototype.hasOwnProperty.call(tierOrder, b.tier) ? tierOrder[b.tier] : 9;
    if (aTier !== bTier) return aTier - bTier;
    return String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" });
  }

  function matchesServer(server, filters) {
    if (filters.region !== "all" && server.region !== filters.region) return false;
    if (filters.latency !== "all" && (server.latency == null || server.latency > Number(filters.latency))) return false;
    if (filters.tier !== "all" && server.tier !== filters.tier) return false;
    if (filters.rank === "open" && server.rankLimit !== null) return false;
    if (filters.rank && filters.rank !== "all" && filters.rank !== "open") {
      var needed = Number(filters.rank);
      if (server.rankLimit !== null && server.rankLimit < needed) return false;
    }
    if (filters.players && filters.players !== "all") {
      var playing = server.online ? server.players || 0 : 0;
      if (playing < Number(filters.players)) return false;
    }
    return true;
  }

  function classTier(map, jumpClass) {
    var value = jumpClass === "demoman" ? map.d : map.s;
    return value || 0;
  }

  function classRating(map, jumpClass) {
    return jumpClass === "demoman" ? map.dr : map.sr;
  }

  function matchesMap(map, filters, tier, jumpClass) {
    if (filters.query) {
      var query = String(filters.query).trim().toLowerCase();
      if (query && map.name.toLowerCase().indexOf(query) === -1) return false;
    }
    if (filters.type !== "all" && map.kind !== filters.type) return false;
    if (filters.rating !== "all" && classRating(map, jumpClass) !== Number(filters.rating)) return false;
    if (filters.layout === "bonus" && !map.bonus) return false;
    if (filters.layout === "course" && !map.course) return false;
    if (filters.layout === "trick" && !map.trick) return false;
    if (filters.layout === "linear" && !map.linear) return false;
    if (tier === "all") return true;
    var value = classTier(map, jumpClass);
    if (tier === "6") return value >= 6;
    return value === Number(tier);
  }

  function suggestBand(rank, mapCompletions, goal) {
    var base = 1;
    if (typeof rank === "number" && rank > 0) {
      if (rank <= 50) base = 6;
      else if (rank <= 200) base = 5;
      else if (rank <= 1000) base = 4;
      else if (rank <= 5000) base = 3;
      else if (rank <= 20000) base = 2;
      else base = 1;
    }
    if (typeof mapCompletions === "number" && mapCompletions < 15) base = Math.min(base, 2);
    if (goal === "improve") {
      if (base >= 6) return { min: 8, max: 99, goal: "improve" };
      return { min: base + 1, max: base + 1, goal: "improve" };
    }
    if (goal === "points") {
      return { min: base >= 6 ? 8 : base + 1, max: 99, goal: "points" };
    }
    return { min: base, max: base === 6 ? 7 : base, goal: "practice" };
  }

  function mapInBand(map, jumpClass, band) {
    var tier = classTier(map, jumpClass);
    if (!tier) return false;
    return tier >= band.min && tier <= band.max;
  }

  function finishedMapNames(records, jumpClass) {
    var names = Object.create(null);
    if (!Array.isArray(records)) return names;
    var expected = jumpClass === "demoman" ? "demoman" : "soldier";
    for (var i = 0; i < records.length; i++) {
      var row = records[i];
      if (!row || row.class !== expected) continue;
      if (typeof row.map !== "string" || !/^[A-Za-z0-9_]+$/.test(row.map)) continue;
      names[row.map] = true;
    }
    return names;
  }

  function compareSuggested(a, b, jumpClass, goal) {
    var aTier = classTier(a, jumpClass);
    var bTier = classTier(b, jumpClass);
    if (goal === "points" && aTier !== bTier) return bTier - aTier;
    if (aTier !== bTier) return aTier - bTier;
    var aRating = classRating(a, jumpClass) || 9;
    var bRating = classRating(b, jumpClass) || 9;
    if (aRating !== bRating) return aRating - bRating;
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  }

  function classLabel(tier, rating) {
    if (!tier) return "—";
    return ratings[rating] ? "T" + tier + " · " + ratings[rating] : "T" + tier;
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

  function zoneLabel(run) {
    var label = zoneNames[run.zone] || "Zone";
    if (run.zone && run.zone !== "map") label += " " + run.index;
    if (run.zoneName) label += " · " + run.zoneName;
    return label;
  }

  function className(id) {
    if (id === 3) return "Soldier";
    if (id === 4) return "Demoman";
    if (typeof id === "number") return "Class " + id;
    return "—";
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

  function passwordText(value) {
    if (value === true) return "Password";
    if (value === false) return "Open";
    return "Not reported";
  }

  function regionText(server) {
    if (server.regionSource === "unknown") return "Not stated";
    if (server.regionSource === "name") return server.region + " · from name";
    return server.region;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var api = {
    ratings: ratings,
    kindLabels: kindLabels,
    normalizeMaps: normalizeMaps,
    normalizeActivity: normalizeActivity,
    normalizeRankSet: normalizeRankSet,
    normalizeTempusServers: normalizeTempusServers,
    normalizeAcademyServers: normalizeAcademyServers,
    applyPasswordFlags: applyPasswordFlags,
    describeServer: describeServer,
    compareServers: compareServers,
    matchesServer: matchesServer,
    classTier: classTier,
    classRating: classRating,
    matchesMap: matchesMap,
    suggestBand: suggestBand,
    mapInBand: mapInBand,
    finishedMapNames: finishedMapNames,
    compareSuggested: compareSuggested,
    classLabel: classLabel,
    layoutLabel: layoutLabel,
    zoneLabel: zoneLabel,
    className: className,
    formatDuration: formatDuration,
    formatStamp: formatStamp,
    formatIso: formatIso,
    passwordText: passwordText,
    regionText: regionText,
    screenshotUrl: screenshotUrl,
    mapPageUrl: mapPageUrl,
    escapeHtml: escapeHtml
  };

  root.TF2 = Object.assign(root.TF2 || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
