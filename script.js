// Chroma — dynamic color logic (vanilla JS, no dependencies)
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const paletteEl = $("palette");
  const harmonyEl = $("harmony");
  const cssVarsEl = $("cssVars");
  const toastEl = $("toast");

  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
  }

  async function copyText(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      toast(`Copied ${label || text}`);
    } catch (_e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      toast(`Copied ${label || text}`);
    }
  }

  // --- Color utils ---
  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const to = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
    return `#${to(f(0))}${to(f(8))}${to(f(4))}`.toUpperCase();
  }

  function hexToHsl(hex) {
    const n = hex.replace("#", "");
    const r = parseInt(n.slice(0, 2), 16) / 255;
    const g = parseInt(n.slice(2, 4), 16) / 255;
    const b = parseInt(n.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      else if (max === g) h = ((b - r) / d + 2) * 60;
      else h = ((r - g) / d + 4) * 60;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hexToRgb(hex) {
    const n = hex.replace("#", "");
    return {
      r: parseInt(n.slice(0, 2), 16),
      g: parseInt(n.slice(2, 4), 16),
      b: parseInt(n.slice(4, 6), 16),
    };
  }

  function luminance({ r, g, b }) {
    const f = (c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  function contrastRatio(hexA, hexB) {
    const a = luminance(hexToRgb(hexA));
    const b = luminance(hexToRgb(hexB));
    const [hi, lo] = a > b ? [a, b] : [b, a];
    return (hi + 0.05) / (lo + 0.05);
  }

  function textOn(hex) {
    return contrastRatio(hex, "#FFFFFF") >= contrastRatio(hex, "#000000") ? "#FFFFFF" : "#0F172A";
  }

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  // --- Palette state ---
  let palette = [];
  let locked = [false, false, false, false, false];

  function generatePalette() {
    const mode = harmonyEl.value;
    const baseHue = rand(0, 359);
    const next = [];
    for (let i = 0; i < 5; i++) {
      if (locked[i] && palette[i]) { next[i] = palette[i]; continue; }
      let h, s, l;
      if (mode === "analogous") { h = (baseHue + i * 24 + rand(-8, 8) + 360) % 360; s = rand(55, 90); l = rand(45, 68); }
      else if (mode === "complementary") { h = (baseHue + (i % 2) * 180 + rand(-12, 12) + 360) % 360; s = rand(55, 90); l = rand(42, 66); }
      else if (mode === "triadic") { h = (baseHue + [0, 120, 240, 30, 210][i] + rand(-10, 10) + 360) % 360; s = rand(55, 90); l = rand(45, 68); }
      else if (mode === "pastel") { h = (baseHue + i * 40 + 360) % 360; s = rand(45, 70); l = rand(72, 84); }
      else if (mode === "vivid") { h = (baseHue + i * 55 + 360) % 360; s = rand(85, 100); l = rand(48, 60); }
      else { h = rand(0, 359); s = rand(45, 95); l = rand(35, 80); }
      next[i] = hslToHex(h, s, l);
    }
    palette = next;
    renderPalette();
  }

  function renderPalette() {
    paletteEl.innerHTML = "";
    palette.forEach((hex, i) => {
      const card = document.createElement("div");
      card.className = "swatch";
      card.setAttribute("role", "listitem");
      card.setAttribute("tabindex", "0");
      card.style.background = hex;
      card.style.color = textOn(hex);
      card.setAttribute("aria-label", `Color ${hex}${locked[i] ? ", locked" : ""}. Activate to copy.`);
      card.innerHTML = `
        <button class="lock" type="button" aria-pressed="${locked[i]}" aria-label="${locked[i] ? "Unlock" : "Lock"} ${hex}" style="color:${textOn(hex)}">${locked[i] ? "🔒" : "🔓"}</button>
        <div class="hex">${hex}</div>
        <div class="name">${locked[i] ? "Locked" : "Click to copy"}</div>`;
      const doCopy = (e) => { e.stopPropagation(); copyText(hex, hex); };
      card.addEventListener("click", doCopy);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); copyText(hex, hex); }
      });
      card.querySelector(".lock").addEventListener("click", (e) => {
        e.stopPropagation();
        locked[i] = !locked[i];
        renderPalette();
      });
      paletteEl.appendChild(card);
    });

    const vars = palette.map((hex, i) => `  --color-${i + 1}: ${hex};`).join("\n");
    cssVarsEl.textContent = `:root {\n${vars}\n}`;
    document.documentElement.style.setProperty("--primary", palette[2] || "#6366f1");
    $("brandMark").style.background =
      `linear-gradient(135deg, ${palette[0] || "#6366f1"}, ${palette[2] || "#8b5cf6"} 50%, ${palette[4] || "#ec4899"})`;
  }

  // --- Playground ---
  const baseColor = $("baseColor"), hue = $("hue"), sat = $("sat"), light = $("light");

  function currentHsl() {
    return { h: +hue.value, s: +sat.value, l: +light.value };
  }

  function renderPlayground(fromPicker) {
    if (fromPicker) {
      const { h, s, l } = hexToHsl(baseColor.value.toUpperCase());
      hue.value = h; sat.value = s; light.value = l;
    }
    const { h, s, l } = currentHsl();
    const hex = hslToHex(h, s, l);
    const { r, g, b } = hexToRgb(hex);

    $("hueOut").textContent = `${h}°`;
    $("satOut").textContent = `${s}%`;
    $("lightOut").textContent = `${l}%`;
    $("hexLabel").textContent = hex;
    $("valHex").textContent = hex;
    $("valRgb").textContent = `rgb(${r}, ${g}, ${b})`;
    $("valHsl").textContent = `hsl(${h}, ${s}%, ${l}%)`;

    const sw = $("previewSwatch");
    sw.style.background = hex;
    sw.style.color = textOn(hex);
    $("previewHex").textContent = hex;

    if (!fromPicker && baseColor.value.toUpperCase() !== hex) baseColor.value = hex.toLowerCase();

    const shades = $("shades");
    shades.innerHTML = "";
    [12, 24, 36, 50, 62, 72, 82, 90, 95].forEach((li) => {
      const c = hslToHex(h, Math.max(s, 30), li);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.style.background = c;
      btn.title = `Copy ${c}`;
      btn.setAttribute("aria-label", `Copy shade ${c}`);
      btn.addEventListener("click", () => copyText(c, c));
      shades.appendChild(btn);
    });

    const onW = contrastRatio(hex, "#FFFFFF");
    const onB = contrastRatio(hex, "#000000");
    $("onWhite").textContent = `${onW.toFixed(2)}:1 ${onW >= 4.5 ? "✓ AA" : "✗"}`;
    $("onBlack").textContent = `${onB.toFixed(2)}:1 ${onB >= 4.5 ? "✓ AA" : "✗"}`;
  }

  // --- Gradients ---
  function renderGradient() {
    const a = $("gradA").value.toUpperCase();
    const b = $("gradB").value.toUpperCase();
    const ang = +$("gradAngle").value;
    $("angleOut").textContent = `${ang}°`;
    $("gradientPreview").style.background = `linear-gradient(${ang}deg, ${a}, ${b})`;
    $("gradCode").textContent = `background: linear-gradient(${ang}deg, ${a}, ${b});`;
  }

  // --- Theme ---
  const themeToggle = $("themeToggle");
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("chroma-theme", t); } catch (_e) {}
    const dark = t === "dark";
    themeToggle.setAttribute("aria-pressed", String(dark));
    themeToggle.querySelector(".theme-label").textContent = dark ? "Light" : "Dark";
  }
  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem("chroma-theme"); } catch (_e) {}
    if (saved === "dark" || saved === "light") return setTheme(saved);
    setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }

  // --- Hero word rotation ---
  const words = ["moves", "shifts", "glows", "adapts", "pops"];
  let wi = 0;
  setInterval(() => {
    wi = (wi + 1) % words.length;
    $("heroWord").textContent = words[wi];
  }, 2200);

  // --- Events ---
  $("regenerate").addEventListener("click", generatePalette);
  $("heroShuffle").addEventListener("click", generatePalette);
  $("heroSurprise").addEventListener("click", () => {
    const modes = ["analogous", "complementary", "triadic", "pastel", "vivid", "random"];
    harmonyEl.value = modes[rand(0, modes.length - 1)];
    locked = [false, false, false, false, false];
    generatePalette();
    document.getElementById("palettes").scrollIntoView({ behavior: "smooth" });
  });
  harmonyEl.addEventListener("change", generatePalette);
  $("copyVars").addEventListener("click", () => copyText(cssVarsEl.textContent, "CSS variables"));
  $("copyGrad").addEventListener("click", () => copyText($("gradCode").textContent, "gradient CSS"));

  baseColor.addEventListener("input", () => renderPlayground(true));
  [hue, sat, light].forEach((el) => el.addEventListener("input", () => renderPlayground(false)));

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const key = chip.dataset.copy;
      const text = key === "hex" ? $("valHex").textContent : key === "rgb" ? $("valRgb").textContent : $("valHsl").textContent;
      copyText(text, text);
    });
  });

  ["gradA", "gradB", "gradAngle"].forEach((id) => $(id).addEventListener("input", renderGradient));
  $("swapGrad").addEventListener("click", () => {
    const a = $("gradA").value;
    $("gradA").value = $("gradB").value;
    $("gradB").value = a;
    renderGradient();
  });

  themeToggle.addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) {
      e.preventDefault();
      generatePalette();
    }
  });

  // --- Init ---
  initTheme();
  generatePalette();
  renderPlayground(false);
  renderGradient();
})();
