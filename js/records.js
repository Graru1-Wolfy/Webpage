(function () {
  var TF2 = window.TF2;
  var jumpActivity = "map_wrs";
  var bar = document.getElementById("jump-activity");
  var rows = document.getElementById("jump-activity-rows");
  var count = document.getElementById("jump-activity-count");
  bar.addEventListener("click", function (event) {
    var button = event.target.closest("[data-activity]");
    if (!button) return;
    jumpActivity = button.getAttribute("data-activity");
    render();
  });
  render();
  TF2.loadTempus({ activity: true }).then(render);

  function render() {
    Array.prototype.forEach.call(bar.querySelectorAll("[data-activity]"), function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-activity") === jumpActivity ? "true" : "false");
    });
    var status = document.getElementById("jump-status");
    var runs = TF2.catalog.activity && TF2.catalog.activity[jumpActivity];
    status.textContent = !TF2.catalog.activity
      ? "Loading recent records."
      : TF2.catalogLive.activity
        ? "Records are live from the Tempus activity feed."
        : "Records are the saved snapshot from " + TF2.formatIso(TF2.catalogRetrieved) + ".";
    if (!runs) {
      count.textContent = "";
      rows.innerHTML = '<tr><td class="empty-row" colspan="7">' +
        (TF2.catalogRetrieved ? "Recent records could not be read." : "Loading recent records…") + "</td></tr>";
      return;
    }
    var labels = {
      map_wrs: "map records",
      course_wrs: "course records",
      bonus_wrs: "bonus records",
      trick_wrs: "trick records",
      map_tops: "top times"
    };
    count.textContent = runs.length + " " + labels[jumpActivity];
    rows.innerHTML = runs.map(function (run) {
      var player = run.playerId
        ? '<a href="https://tempus2.xyz/players/' + run.playerId + '">' + TF2.escapeHtml(run.player) + "</a>"
        : TF2.escapeHtml(run.player);
      var map = TF2.mapPageUrl(run.map)
        ? '<a href="' + TF2.mapPageUrl(run.map) + '">' + TF2.escapeHtml(run.map) + "</a>"
        : "—";
      return "<tr><td data-label=\"Place\">" + TF2.escapeHtml(run.place === 1 ? "WR" : "#" + run.place) +
        "</td><td data-label=\"Player\">" + player +
        "</td><td data-label=\"Map\">" + map +
        "</td><td data-label=\"Zone\">" + TF2.escapeHtml(TF2.zoneLabel(run)) +
        "</td><td data-label=\"Class\">" + TF2.escapeHtml(TF2.className(run.class)) +
        "</td><td data-label=\"Time\">" + TF2.escapeHtml(TF2.formatDuration(run.time)) +
        "</td><td data-label=\"Date\">" + TF2.escapeHtml(TF2.formatStamp(run.date)) + "</td></tr>";
    }).join("");
  }
})();
