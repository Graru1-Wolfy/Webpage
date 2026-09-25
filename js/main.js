const COLOR_NAMES = ["Primary", "Secondary", "Accent", "Highlight", "Surface"];

const state = {
  colors: [],
  locked: new Set(),
  autoRotate: false,
  rotateTimer: null,
};

const elements = {
  root: document.documentElement,
  paletteGrid: document.getElementById("palette-grid"),
  heroPreview: document.getElementById("hero-preview"),
  generateBtn: document.getElementById("generate-btn"),
  autoToggle: document.getElementById("auto-toggle"),
  themeToggle: document.getElementById("theme-toggle"),
  toast: document.getElementById("toast"),
};

function randomHue() {
  return Math.floor(Math.random() * 360);
}

function hslToHex(h, s, l) {
  const saturation = s / 100;
  const lightness = l / 100;

  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = h / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));

  let r = 0;
  let g = 0;
  let b = 0;

  if (huePrime >= 0 && huePrime < 1) [r, g, b] = [chroma, x, 0];
  else if (huePrime < 2) [r, g, b] = [x, chroma, 0];
  else if (huePrime < 3) [r, g, b] = [0, chroma, x];
  else if (huePrime < 4) [r, g, b] = [0, x, chroma];
  else if (huePrime < 5) [r, g, b] = [x, 0, chroma];
  else [r, g, b] = [chroma, 0, x];

  const m = lightness - chroma / 2;
  const toHex = (value) => Math.round((value + m) * 255).toString(16).padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function createColor(name, hue, saturation, lightness) {
  return {
    name,
    hue,
    saturation,
    lightness,
    hex: hslToHex(hue, saturation, lightness),
    hsl: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
  };
}

function generatePalette() {
  const baseHue = randomHue();
  const configs = [
    { name: "Primary", hueOffset: 0, saturation: 62, lightness: 45 },
    { name: "Secondary", hueOffset: 42, saturation: 58, lightness: 52 },
    { name: "Accent", hueOffset: 180, saturation: 55, lightness: 48 },
    { name: "Highlight", hueOffset: 300, saturation: 64, lightness: 58 },
    { name: "Surface", hueOffset: 24, saturation: 18, lightness: 22 },
  ];

  state.colors = configs.map((config, index) => {
    if (state.locked.has(index) && state.colors[index]) {
      return state.colors[index];
    }

    return createColor(
      config.name,
      (baseHue + config.hueOffset) % 360,
      config.saturation,
      config.lightness
    );
  });
}

function applyThemeColors() {
  const [primary, secondary, accent] = state.colors;

  if (!primary) return;

  elements.root.style.setProperty("--accent-primary", primary.hex);
  elements.root.style.setProperty("--accent-secondary", secondary?.hex ?? primary.hex);
  elements.root.style.setProperty("--accent-tertiary", accent?.hex ?? primary.hex);

  elements.heroPreview.style.background = `linear-gradient(135deg, ${primary.hex}, ${secondary?.hex ?? primary.hex} 55%, ${accent?.hex ?? primary.hex})`;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");

  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 1800);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`Copied ${text}`);
  } catch {
    showToast("Copy failed");
  }
}

function renderPalette() {
  elements.paletteGrid.innerHTML = state.colors
    .map((color, index) => {
      const locked = state.locked.has(index);

      return `
        <article class="color-card" role="listitem">
          <div class="color-swatch" style="background-color: ${color.hex}"></div>
          <div class="color-meta">
            <div class="color-meta-top">
              <h3 class="color-name">${color.name}</h3>
              <button
                type="button"
                class="lock-btn${locked ? " is-locked" : ""}"
                data-lock-index="${index}"
                aria-label="${locked ? "Unlock" : "Lock"} ${color.name}"
                aria-pressed="${locked}"
              >
                ${locked ? "🔒" : "🔓"}
              </button>
            </div>
            <div class="color-values">
              <button type="button" class="color-value" data-copy="${color.hex}">
                <span class="color-value-label">Hex</span>
                <span class="color-value-text">${color.hex}</span>
              </button>
              <button type="button" class="color-value" data-copy="${color.hsl}">
                <span class="color-value-label">HSL</span>
                <span class="color-value-text">${color.hsl}</span>
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function refreshPalette() {
  generatePalette();
  applyThemeColors();
  renderPalette();
}

function setAutoRotate(enabled) {
  state.autoRotate = enabled;
  elements.autoToggle.textContent = `Auto rotate: ${enabled ? "On" : "Off"}`;
  elements.autoToggle.classList.toggle("is-active", enabled);

  window.clearInterval(state.rotateTimer);

  if (enabled) {
    state.rotateTimer = window.setInterval(refreshPalette, 3200);
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem("dynamic-colors-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = savedTheme || (prefersDark ? "dark" : "light");

  elements.root.setAttribute("data-theme", theme);
}

function toggleTheme() {
  const nextTheme = elements.root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  elements.root.setAttribute("data-theme", nextTheme);
  localStorage.setItem("dynamic-colors-theme", nextTheme);
}

elements.generateBtn.addEventListener("click", refreshPalette);

elements.autoToggle.addEventListener("click", () => {
  setAutoRotate(!state.autoRotate);
});

elements.themeToggle.addEventListener("click", toggleTheme);

elements.paletteGrid.addEventListener("click", (event) => {
  const lockButton = event.target.closest("[data-lock-index]");
  if (lockButton) {
    const index = Number(lockButton.dataset.lockIndex);
    if (state.locked.has(index)) {
      state.locked.delete(index);
    } else {
      state.locked.add(index);
    }
    renderPalette();
    return;
  }

  const copyButton = event.target.closest("[data-copy]");
  if (copyButton) {
    copyText(copyButton.dataset.copy);
  }
});

initTheme();
refreshPalette();
