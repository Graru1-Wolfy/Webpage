(function () {
  var root = window.TF2 = window.TF2 || {};

  root.applyTheme = function (theme, persist) {
    document.documentElement.dataset.theme = theme;
    var color = document.getElementById("theme-color");
    if (color) color.setAttribute("content", theme === "dark" ? "#14121c" : "#F4F2FA");
    var toggle = document.getElementById("theme-toggle");
    if (toggle) {
      toggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      toggle.textContent = "Dark theme";
    }
    if (persist) {
      try {
        localStorage.setItem("tf2-theme", theme);
      } catch (error) {
        /* The toggle still updates the page when storage is blocked. */
      }
    }
  };

  root.loadJson = function (url, timeout) {
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
  };

  root.wait = function (ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  };

  root.focusedValue = function (bar, attr) {
    var active = document.activeElement;
    if (!bar || !active || !bar.contains(active)) return "";
    return active.getAttribute(attr) || "";
  };

  root.focusButton = function (bar, attr, value) {
    if (!bar || !value) return;
    var buttons = bar.querySelectorAll("[" + attr + "]");
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute(attr) === value) {
        buttons[i].focus();
        return;
      }
    }
  };

  var toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      root.applyTheme(next, true);
    });
  }
  root.applyTheme(document.documentElement.dataset.theme || "dark", false);
})();
