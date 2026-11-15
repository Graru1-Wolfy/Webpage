(function () {
  var TF2 = window.TF2;
  var jumpRank = "overall";
  var bar = document.getElementById("jump-ranks");
  var rows = document.getElementById("jump-rank-rows");
  var count = document.getElementById("jump-rank-count");
  bar.addEventListener("click", function (event) {
    var button = event.target.closest("[data-rank]");
    if (!button) return;
    jumpRank = button.getAttribute("data-rank");
    render();
  });
  render();
  TF2.loadTempus({ ranks: true }).then(render);

  function render() {
    Array.prototype.forEach.call(bar.querySelectorAll("[data-rank]"), function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-rank") === jumpRank ? "true" : "false");
    });
    var status = document.getElementById("jump-status");
    var list = TF2.catalog.ranks && TF2.catalog.ranks[jumpRank];
    status.textContent = !TF2.catalog.ranks
      ? "Loading Tempus ranks."
      : TF2.catalogLive.ranks
        ? "Ranks are live from Tempus."
        : "Ranks are the saved snapshot from " + TF2.formatIso(TF2.catalogRetrieved) + ".";
    if (!list) {
      count.textContent = "";
      rows.innerHTML = '<tr><td class="empty-row" colspan="3">' +
        (TF2.catalogRetrieved ? "Ranks could not be read." : "Loading ranks…") + "</td></tr>";
      return;
    }
    count.textContent = "Top " + list.players.length + " of " + Number(list.count).toLocaleString() + " players";
    rows.innerHTML = list.players.map(function (player) {
      return "<tr><td data-label=\"Rank\">" + TF2.escapeHtml(player.rank) +
        '</td><td data-label="Player"><a href="https://tempus2.xyz/players/' + player.id + '">' + TF2.escapeHtml(player.name) +
        "</a></td><td data-label=\"Points\">" + Number(player.points).toLocaleString(undefined, { maximumFractionDigits: 0 }) + "</td></tr>";
    }).join("");
  }
})();
