(function () {
  var DynamicColor = globalThis.DynamicColor;
  var STORAGE_KEY = "dynamic-colors";
  var DEFAULTS = {
    seed: "#6E56CF",
    mode: "analogous",
    theme: "light"
  };

  var state = loadState();
  var toastTimer = 0;

  var seedInput = document.getElementById("seed");
  var seedHex = document.getElementById("seed-hex");
  var themeToggle = document.getElementById("theme-toggle");
  var randomizeButton = document.getElementById("randomize");
  var modeGroup = document.getElementById("modes");
  var specimen = document.getElementById("specimen");
  var scale = document.getElementById("scale");
  var tokenCode = document.getElementById("token-code");
  var copyTokens = document.getElementById("copy-tokens");
  var contrastReadout = document.getElementById("contrast");
  var toast = document.getElementById("toast");
  var copyStatus = document.getElementById("copy-status");
  var themeColor = document.getElementById("theme-color");

  seedInput.addEventListener("input", function () {
    state.seed = DynamicColor.normalizeHex(seedInput.value);
    render();
    saveState();
  });

  themeToggle.addEventListener("click", function () {
    state.theme = state.theme === "dark" ? "light" : "dark";
    render();
    saveState();
  });

  randomizeButton.addEventListener("click", function () {
    state.seed = DynamicColor.randomSeed();
    render();
    saveState();
  });

  modeGroup.addEventListener("click", function (event) {
    var button = event.target.closest("[data-mode]");
    if (!button) return;
    state.mode = button.getAttribute("data-mode");
    render();
    saveState();
  });

  specimen.addEventListener("click", onCopyClick);
  scale.addEventListener("click", onCopyClick);
  copyTokens.addEventListener("click", function () {
    copyText(tokenCode.textContent, "Copied CSS variables");
  });

  render();

  function render() {
    var system = DynamicColor.buildSystem(state.seed, state.mode, state.theme);
    var colors = system.colors;
    var root = document.documentElement;

    root.dataset.theme = system.theme;
    root.style.setProperty("--bg", colors.background);
    root.style.setProperty("--surface", colors.surface);
    root.style.setProperty("--surface-raised", colors.surfaceRaised);
    root.style.setProperty("--text", colors.text);
    root.style.setProperty("--muted", colors.muted);
    root.style.setProperty("--border", colors.border);
    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--on-primary", colors.onPrimary);
    root.style.setProperty("--secondary", colors.secondary);
    root.style.setProperty("--on-secondary", colors.onSecondary);
    root.style.setProperty("--tertiary", colors.tertiary);
    root.style.setProperty("--on-tertiary", colors.onTertiary);
    root.style.setProperty("--primary-soft", colors.primarySoft);
    root.style.setProperty("--secondary-soft", colors.secondarySoft);
    root.style.setProperty("--shadow", hexShadow(colors.primary, system.theme === "dark" ? 0.35 : 0.16));

    seedInput.value = system.seed.toLowerCase();
    seedHex.textContent = system.seed;
    themeColor.setAttribute("content", colors.background);
    themeToggle.setAttribute("aria-pressed", system.theme === "dark" ? "true" : "false");
    themeToggle.textContent = system.theme === "dark" ? "Light mode" : "Dark mode";

    Array.prototype.forEach.call(modeGroup.querySelectorAll("[data-mode]"), function (button) {
      var active = button.getAttribute("data-mode") === system.mode;
      button.setAttribute("aria-checked", active ? "true" : "false");
    });

    paintSwatch("primary", "Primary", colors.primary, colors.onPrimary);
    paintSwatch("secondary", "Secondary", colors.secondary, colors.onSecondary);
    paintSwatch("tertiary", "Tertiary", colors.tertiary, colors.onTertiary);
    paintSwatch("surface", "Surface", colors.surface, colors.text);
    paintSwatch("background", "Background", colors.background, colors.text);
    paintSwatch("ink", "Text", colors.text, colors.background);

    scale.innerHTML = system.scale.map(function (item) {
      var ink = DynamicColor.contrastingInk(item.hex);
      return (
        '<button type="button" class="step" data-copy="' + item.hex + '" style="background:' + item.hex + ';color:' + ink + '">' +
          '<span class="step-name">' + item.step + '</span>' +
          '<span class="step-hex">' + item.hex + '</span>' +
        '</button>'
      );
    }).join("");

    contrastReadout.innerHTML =
      stat("Text", system.textContrast) + stat("Button", system.buttonContrast);

    tokenCode.textContent = toCss(colors);
  }

  function paintSwatch(key, label, hex, ink) {
    var node = specimen.querySelector('[data-role="' + key + '"]');
    node.style.background = hex;
    node.style.color = ink;
    node.setAttribute("data-copy", hex);
    node.querySelector(".role-name").textContent = label;
    node.querySelector(".role-hex").textContent = hex;
  }

  function stat(label, ratio) {
    var grade = DynamicColor.gradeContrast(ratio);
    return (
      '<span class="stat"><span class="stat-label">' + label + '</span> ' +
      ratio.toFixed(2) + ':1 <span class="grade">' + grade + '</span></span>'
    );
  }

  function toCss(colors) {
    var lines = [
      ["--color-background", colors.background],
      ["--color-surface", colors.surface],
      ["--color-surface-raised", colors.surfaceRaised],
      ["--color-text", colors.text],
      ["--color-muted", colors.muted],
      ["--color-border", colors.border],
      ["--color-primary", colors.primary],
      ["--color-on-primary", colors.onPrimary],
      ["--color-secondary", colors.secondary],
      ["--color-on-secondary", colors.onSecondary],
      ["--color-tertiary", colors.tertiary],
      ["--color-on-tertiary", colors.onTertiary]
    ];
    return ":root {\n" + lines.map(function (line) {
      return "  " + line[0] + ": " + line[1] + ";";
    }).join("\n") + "\n}";
  }

  function onCopyClick(event) {
    var target = event.target.closest("[data-copy]");
    if (!target) return;
    copyText(target.getAttribute("data-copy"), "Copied " + target.getAttribute("data-copy"));
  }

  function copyText(value, message) {
    showToast(message);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).catch(function () {
        fallbackCopy(value);
      });
      return;
    }
    fallbackCopy(value);
  }

  function fallbackCopy(value) {
    var area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
  }

  function showToast(message) {
    copyStatus.textContent = message;
    toast.textContent = message;
    toast.classList.add("is-visible");
    toast.style.opacity = "1";
    toast.style.transform = "translate(-50%, 0)";
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
      toast.style.opacity = "0";
      toast.style.transform = "translate(-50%, 16px)";
    }, 2200);
  }

  function hexShadow(hex, alpha) {
    var rgb = hexToRgb(hex);
    return "0 18px 50px rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", " + alpha + ")";
  }

  function hexToRgb(hex) {
    var value = hex.slice(1);
    var int = parseInt(value, 16);
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, DEFAULTS);
      var saved = JSON.parse(raw);
      return {
        seed: DynamicColor.normalizeHex(saved.seed || DEFAULTS.seed),
        mode: DynamicColor.HARMONY_MODES.indexOf(saved.mode) >= 0 ? saved.mode : DEFAULTS.mode,
        theme: saved.theme === "dark" ? "dark" : "light"
      };
    } catch (error) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      /* Storage can be unavailable in private browsing. The page still updates. */
    }
  }
})();
