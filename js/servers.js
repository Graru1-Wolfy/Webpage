(function () {
  var TF2 = window.TF2;
  var tempusForm = document.getElementById("tempus-filters");
  var academyForm = document.getElementById("academy-filters");
  tempusForm.addEventListener("change", render);
  academyForm.addEventListener("change", render);

  render();
  TF2.loadTempus({ servers: true }).then(render);

  function render() {
    setStatus();
    renderOverview();
    renderGroup("tempus", tempusForm, document.getElementById("tempus-rows"), document.getElementById("tempus-count"), true);
    renderGroup("jumpacademy", academyForm, document.getElementById("academy-rows"), document.getElementById("academy-count"), false);
  }

  function setStatus() {
    var node = document.getElementById("server-status");
    if (!TF2.servers.length && !TF2.loadError) {
      node.textContent = "Loading Tempus and Jump Academy status.";
      return;
    }
    var tempus = TF2.tempusLive
      ? "Tempus status is live."
      : "Tempus status is the saved snapshot from " + TF2.formatIso(TF2.tempusRetrieved) + ".";
    var academy = "Jump Academy name, map, player counts, and password are a Steam server query from " + TF2.formatIso(TF2.academyRetrieved) + ".";
    var passwords = TF2.passwordRetrieved
      ? " Tempus password flags are from the Steam query on " + TF2.formatIso(TF2.passwordRetrieved) + "."
      : "";
    node.textContent = tempus + " " + academy + passwords;
  }

  function renderOverview() {
    var stats = document.getElementById("community-stats");
    if (!TF2.servers.length) {
      stats.innerHTML = "";
      return;
    }
    var online = TF2.servers.filter(function (server) { return server.online; });
    var players = online.reduce(function (sum, server) { return sum + (server.players || 0); }, 0);
    var tempus = TF2.servers.filter(function (server) { return server.category === "tempus" && server.online; }).length;
    var academy = TF2.servers.filter(function (server) { return server.category === "jumpacademy" && server.online; }).length;
    stats.innerHTML =
      stat("Tempus online", tempus) +
      stat("Jump Academy online", academy) +
      stat("Players online", players.toLocaleString());
  }

  function renderGroup(category, form, body, countNode, useRank) {
    var filters = Object.fromEntries(new FormData(form).entries());
    if (!useRank) filters.rank = "all";
    var group = TF2.servers.filter(function (server) { return server.category === category; });
    var visible = group.filter(function (server) {
      return TF2.matchesServer(server, filters);
    }).sort(TF2.compareServers);
    countNode.textContent = group.length ? visible.length + " of " + group.length + " servers" : "";
    if (!group.length) {
      var span = useRank ? 9 : 8;
      body.innerHTML = '<tr><td class="empty-row" colspan="' + span + '">' + TF2.escapeHtml(TF2.loadError || "Loading servers…") + "</td></tr>";
      return;
    }
    if (!visible.length) {
      var emptySpan = useRank ? 9 : 8;
      body.innerHTML = '<tr><td class="empty-row" colspan="' + emptySpan + '">No servers match these filters.</td></tr>';
      return;
    }
    body.innerHTML = visible.map(function (server) {
      var players = server.online ? (server.players || 0) + "/" + (server.maxPlayers == null ? "?" : server.maxPlayers) : "Offline";
      var address = /^steam:\/\/connect\/[A-Za-z0-9.:-]+$/.test(server.url || "")
        ? '<a href="' + TF2.escapeHtml(server.url) + '">' + TF2.escapeHtml(server.address) + "</a>"
        : TF2.escapeHtml(server.address);
      var rankCell = useRank ? '<td data-label="Rank">' + TF2.escapeHtml(server.rankLabel) + "</td>" : "";
      return "<tr>" +
        '<td data-label="Server"><strong>' + TF2.escapeHtml(server.name) + "</strong></td>" +
        '<td data-label="Region">' + TF2.escapeHtml(TF2.regionText(server)) + "</td>" +
        '<td data-label="Est. tier">' + TF2.escapeHtml(server.tier) + "</td>" +
        rankCell +
        '<td data-label="Password">' + TF2.escapeHtml(TF2.passwordText(server.password)) + "</td>" +
        '<td data-label="Map">' + TF2.escapeHtml(server.map || "—") + "</td>" +
        '<td data-label="Players">' + players + "</td>" +
        '<td data-label="Est. latency">' + (server.latency == null ? "—" : "est. " + server.latency + " ms") + "</td>" +
        '<td data-label="Address">' + address + "</td></tr>";
    }).join("");
  }

  function stat(label, value) {
    return "<article><span>" + label + "</span><strong>" + value + "</strong></article>";
  }
})();
