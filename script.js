(() => {
  const root = document.documentElement;
  const slider = document.getElementById("hue-slider");
  const hueValue = document.getElementById("hue-value");
  const randomBtn = document.getElementById("random-btn");
  const cycleBtn = document.getElementById("cycle-btn");
  const themeToggle = document.getElementById("theme-toggle");
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  const swatchesEl = document.getElementById("swatches");
  const toast = document.getElementById("toast");
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  const STORAGE_HUE = "dc-hue";
  const STORAGE_THEME = "dc-theme";

  const palette = [
    { name: "Primary", offset: 0, s: 85, l: 60 },
    { name: "Light", offset: 0, s: 90, l: 85 },
    { name: "Deep", offset: 0, s: 70, l: 35 },
    { name: "Analogous +", offset: 40, s: 85, l: 60 },
    { name: "Analogous −", offset: -40, s: 85, l: 60 },
    { name: "Complement", offset: 180, s: 75, l: 55 },
  ];

  let cycleTimer = null;
  let toastTimer = null;

  function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return (
      "#" +
      [f(0), f(8), f(4)]
        .map((x) => Math.round(x * 255).toString(16).padStart(2, "0"))
        .join("")
    );
  }

  const normalize = (h) => ((Math.round(h) % 360) + 360) % 360;

  function renderSwatches(hue) {
    swatchesEl.innerHTML = "";
    palette.forEach(({ name, offset, s, l }) => {
      const h = normalize(hue + offset);
      const hex = hslToHex(h, s, l);
      const btn = document.createElement("button");
      btn.className = "swatch";
      btn.type = "button";
      btn.style.backgroundColor = hex;
      btn.style.color = l > 65 ? "#111" : "#fff";
      btn.setAttribute("aria-label", `${name} ${hex}, click to copy`);
      btn.innerHTML = `<span class="swatch-name">${name}</span><span class="swatch-hex">${hex}</span>`;
      btn.addEventListener("click", () => copy(hex));
      swatchesEl.appendChild(btn);
    });
  }

  function setHue(hue, { save = true } = {}) {
    const h = normalize(hue);
    root.style.setProperty("--hue", h);
    slider.value = h;
    hueValue.textContent = h;
    themeMeta.setAttribute("content", hslToHex(h, 85, 60));
    renderSwatches(h);
    if (save) localStorage.setItem(STORAGE_HUE, h);
  }

  function setTheme(theme, { save = true } = {}) {
    root.setAttribute("data-theme", theme);
    themeToggle.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    );
    if (save) localStorage.setItem(STORAGE_THEME, theme);
  }

  function stopCycle() {
    clearInterval(cycleTimer);
    cycleTimer = null;
    cycleBtn.setAttribute("aria-pressed", "false");
    cycleBtn.textContent = "Auto cycle";
  }

  function startCycle() {
    cycleBtn.setAttribute("aria-pressed", "true");
    cycleBtn.textContent = "Stop cycle";
    cycleTimer = setInterval(() => {
      setHue(Number(slider.value) + 1, { save: false });
    }, 60);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Copied ${text}`);
    } catch {
      showToast(text);
    }
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  slider.addEventListener("input", (e) => {
    stopCycle();
    setHue(Number(e.target.value));
  });

  randomBtn.addEventListener("click", () => {
    stopCycle();
    setHue(Math.random() * 360);
  });

  cycleBtn.addEventListener("click", () => {
    if (cycleTimer) {
      stopCycle();
      localStorage.setItem(STORAGE_HUE, slider.value);
    } else {
      startCycle();
    }
  });

  themeToggle.addEventListener("click", () => {
    setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  navToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  nav.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      nav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });

  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  const savedTheme = localStorage.getItem(STORAGE_THEME);
  setTheme(savedTheme || (systemDark.matches ? "dark" : "light"), { save: false });
  systemDark.addEventListener("change", (e) => {
    if (!localStorage.getItem(STORAGE_THEME)) {
      setTheme(e.matches ? "dark" : "light", { save: false });
    }
  });

  const savedHue = localStorage.getItem(STORAGE_HUE);
  setHue(savedHue !== null ? Number(savedHue) : Number(slider.value), { save: false });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
