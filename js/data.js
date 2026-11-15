(function () {
  var TF2 = window.TF2;
  TF2.catalog = { maps: null, activity: null, ranks: null };
  TF2.catalogLive = { maps: false, activity: false, ranks: false };
  TF2.catalogRetrieved = "";
  TF2.servers = [];
  TF2.tempusLive = false;
  TF2.tempusRetrieved = "";
  TF2.academyRetrieved = "";
  TF2.passwordRetrieved = "";
  TF2.loadError = "";
  TF2.plazaRelay = "https://tf2-hub-plaza-relay.confusion-quartz.workers.dev";

  TF2.loadPlazaRecords = function (playerId) {
    var id = String(playerId == null ? "" : playerId);
    if (!/^[1-9][0-9]{0,9}$/.test(id) || !TF2.plazaRelay) return Promise.reject(new Error("relay"));
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 20000) : null;
    return fetch(TF2.plazaRelay.replace(/\/$/, "") + "/player-records", {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8", Accept: "application/json" },
      body: JSON.stringify({ id: Number(id) }),
      cache: "no-store",
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      if (timer) clearTimeout(timer);
      if (!response.ok) throw new Error("relay");
      return response.json();
    }, function (error) {
      if (timer) clearTimeout(timer);
      throw error;
    }).then(function (data) {
      if (!data || !Array.isArray(data.records)) throw new Error("relay");
      return data.records;
    });
  };

  TF2.loadTempus = function (needs) {
    needs = needs || {};
    return TF2.loadJson("data/tempus-fallback.json").then(function (data) {
      if (!data) return;
      TF2.catalogRetrieved = data.retrieved || "";
      TF2.tempusRetrieved = data.retrieved || "";
      if (needs.maps) {
        var maps = TF2.normalizeMaps(data.maps);
        if (maps.length >= 100) TF2.catalog.maps = maps;
      }
      if (needs.activity) {
        var activity = TF2.normalizeActivity(data.activity);
        if (activity) TF2.catalog.activity = activity;
      }
      if (needs.ranks) {
        var ranks = TF2.normalizeRankSet(data.ranks);
        if (ranks) TF2.catalog.ranks = ranks;
      }
      if (needs.servers) {
        var tempus = TF2.normalizeTempusServers(data.servers);
        if (tempus.length >= 10) TF2.pendingTempus = tempus;
      }
    }).catch(function () {
      TF2.loadError = "The saved Tempus snapshot could not be read.";
    }).then(function () {
      if (!needs.servers) return null;
      return TF2.loadJson("data/server-passwords.json").then(function (data) {
        if (!data || !Array.isArray(data.servers)) return;
        TF2.passwordRetrieved = data.retrieved || "";
        if (TF2.pendingTempus) TF2.pendingTempus = TF2.applyPasswordFlags(TF2.pendingTempus, data.servers);
      }).catch(function () {
        /* Password flags are optional. Servers stay listed without them. */
      });
    }).then(function () {
      if (TF2.pendingTempus) replaceTempus(TF2.pendingTempus);
    }).then(function () {
      if (!needs.servers) return null;
      return TF2.loadJson("data/jump-academy.json").then(function (data) {
        if (!data) return;
        TF2.academyRetrieved = data.retrieved || "";
        var academy = TF2.normalizeAcademyServers(data.servers);
        if (academy.length < 10) return;
        replaceAcademy(academy);
      }).catch(function () {
        if (!TF2.loadError) TF2.loadError = "The Jump Academy snapshot could not be read.";
      });
    }).then(function () {
      return refreshLive(needs);
    });
  };

  function replaceTempus(list) {
    TF2.servers = TF2.servers.filter(function (server) {
      return server.category !== "tempus";
    }).concat(list.map(TF2.describeServer));
  }

  function replaceAcademy(list) {
    TF2.servers = TF2.servers.filter(function (server) {
      return server.category !== "jumpacademy";
    }).concat(list.map(TF2.describeServer));
  }

  function refreshLive(needs) {
    var steps = [];
    if (needs.maps) {
      steps.push(function () {
        return TF2.loadJson("https://tempus2.xyz/api/v0/maps/detailedList", 15000).then(function (data) {
          var maps = TF2.normalizeMaps(data);
          if (maps.length < 100) throw new Error("short map list");
          TF2.catalog.maps = maps;
          TF2.catalogLive.maps = true;
        });
      });
    }
    if (needs.activity) {
      steps.push(function () {
        return TF2.loadJson("https://tempus2.xyz/api/v0/activity", 15000).then(function (data) {
          var activity = TF2.normalizeActivity(data);
          if (!activity) throw new Error("activity");
          TF2.catalog.activity = activity;
          TF2.catalogLive.activity = true;
        });
      });
    }
    if (needs.ranks) {
      steps.push(function () {
        return TF2.loadJson("https://tempus2.xyz/api/v0/ranks/overall", 15000).then(function (overall) {
          return TF2.wait(1100).then(function () {
            return TF2.loadJson("https://tempus2.xyz/api/v0/ranks/class/3", 15000);
          }).then(function (soldier) {
            return TF2.wait(1100).then(function () {
              return TF2.loadJson("https://tempus2.xyz/api/v0/ranks/class/4", 15000);
            }).then(function (demoman) {
              var ranks = TF2.normalizeRankSet({ overall: overall, soldier: soldier, demoman: demoman });
              if (!ranks) throw new Error("ranks");
              TF2.catalog.ranks = ranks;
              TF2.catalogLive.ranks = true;
            });
          });
        });
      });
    }
    if (needs.servers) {
      steps.push(function () {
        return TF2.loadJson("https://tempus2.xyz/api/v0/servers/statusList", 15000).then(function (data) {
          var tempus = TF2.normalizeTempusServers(data);
          if (tempus.length < 10) throw new Error("short server list");
          var flags = TF2.servers.filter(function (server) {
            return server.category === "tempus" && typeof server.password === "boolean";
          }).map(function (server) {
            return { address: server.address, password: server.password };
          });
          TF2.tempusLive = true;
          TF2.tempusRetrieved = new Date().toISOString();
          replaceTempus(TF2.applyPasswordFlags(tempus, flags));
        });
      });
    }
    return steps.reduce(function (chain, step, index) {
      return chain.then(function () {
        return TF2.wait(index === 0 ? 0 : 1100).then(step);
      }).catch(function () {
        /* Keep the saved snapshot for this request. */
      });
    }, Promise.resolve());
  }
})();
