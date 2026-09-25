/**
 * ChromaFlow &mdash; Dynamic Colors Webpage Logic
 * Pure vanilla JavaScript &mdash; zero external build dependencies
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. Color Math & Conversion Utilities
  // =========================================================================

  function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function rgbToHex(r, g, b) {
    const toHex = (n) => {
      const clamped = Math.max(0, Math.min(255, Math.round(n)));
      const hex = clamped.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  function hslToRgb(h, s, l) {
    h = (h % 360 + 360) % 360 / 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;

    let r, g, b;
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  function hslToHex(h, s, l) {
    const { r, g, b } = hslToRgb(h, s, l);
    return rgbToHex(r, g, b);
  }

  function hexToHsl(hex) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsl(r, g, b);
  }

  // WCAG Relative Luminance
  function getLuminance(r, g, b) {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  // WCAG Contrast Ratio
  function getContrastRatio(hex1, hex2) {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);
    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return ((brightest + 0.05) / (darkest + 0.05));
  }

  function getReadableTextColor(bgHex) {
    const ratioToWhite = getContrastRatio(bgHex, '#ffffff');
    const ratioToDark = getContrastRatio(bgHex, '#090d16');
    return ratioToWhite >= ratioToDark ? '#ffffff' : '#090d16';
  }

  function mixColors(hex1, hex2, weight) {
    // weight is 0 to 1 (0 = all hex1, 1 = all hex2)
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);
    const w = Math.max(0, Math.min(1, weight));
    const r = Math.round(rgb1.r * (1 - w) + rgb2.r * w);
    const g = Math.round(rgb1.g * (1 - w) + rgb2.g * w);
    const b = Math.round(rgb1.b * (1 - w) + rgb2.b * w);
    return rgbToHex(r, g, b);
  }

  // =========================================================================
  // 2. Curated Presets Definition
  // =========================================================================

  const PRESETS = [
    {
      name: 'Cyberpunk Neon',
      tag: 'Vibrant Futuristic',
      colors: ['#00f0ff', '#7928ca', '#ff007f', '#ffe600', '#050505'],
      harmony: 'triadic'
    },
    {
      name: 'Nordic Glacier',
      tag: 'Crisp Oceanic',
      colors: ['#0284c7', '#0d9488', '#38bdf8', '#64748b', '#0369a1'],
      harmony: 'analogous'
    },
    {
      name: 'Sunset Horizon',
      tag: 'Warm Amber Dusk',
      colors: ['#ea580c', '#db2777', '#f59e0b', '#9333ea', '#fb7185'],
      harmony: 'analogous'
    },
    {
      name: 'Emerald Forest',
      tag: 'Botanical Natural',
      colors: ['#059669', '#10b981', '#34d399', '#047857', '#0f766e'],
      harmony: 'monochromatic'
    },
    {
      name: 'Royal Velvet',
      tag: 'Deep Violet Luxury',
      colors: ['#7c3aed', '#6366f1', '#c084fc', '#4338ca', '#ec4899'],
      harmony: 'analogous'
    },
    {
      name: 'Tokyo Midnight',
      tag: 'Synthwave Night',
      colors: ['#6366f1', '#ec4899', '#38bdf8', '#818cf8', '#a855f7'],
      harmony: 'triadic'
    },
    {
      name: 'Warm Terracotta',
      tag: 'Earthy Modern',
      colors: ['#c2410c', '#d97706', '#b45309', '#f59e0b', '#9a3412'],
      harmony: 'analogous'
    },
    {
      name: 'Electric Berry',
      tag: 'High Energy Punch',
      colors: ['#d946ef', '#8b5cf6', '#f43f5e', '#a855f7', '#06b6d4'],
      harmony: 'tetradic'
    }
  ];

  const COLOR_ROLES = [
    { label: 'Primary Brand', varName: '--primary' },
    { label: 'Secondary Tone', varName: '--secondary' },
    { label: 'Vibrant Accent', varName: '--accent' },
    { label: 'Surface Neutral', varName: '--color-4' },
    { label: 'Highlight Glow', varName: '--color-5' }
  ];

  // =========================================================================
  // 3. Application State
  // =========================================================================

  const state = {
    // 5 color objects: { hex: '#...', locked: false }
    palette: [
      { hex: '#3b82f6', locked: false },
      { hex: '#8b5cf6', locked: false },
      { hex: '#ec4899', locked: false },
      { hex: '#06b6d4', locked: false },
      { hex: '#10b981', locked: false }
    ],
    harmony: 'analogous',
    theme: 'dark', // 'dark' | 'light'
    activeExportTab: 'css'
  };

  // =========================================================================
  // 4. Harmonic Palette Generation Engine
  // =========================================================================

  function generateHarmonicPalette(harmonyMode) {
    // If color[0] is locked, use its hue, otherwise pick a random base hue
    let baseHsl = state.palette[0].locked
      ? hexToHsl(state.palette[0].hex)
      : {
          h: Math.floor(Math.random() * 360),
          s: Math.floor(65 + Math.random() * 25), // 65-90% vibrant
          l: Math.floor(45 + Math.random() * 15)  // 45-60% balanced
        };

    const h = baseHsl.h;
    const s = baseHsl.s;
    const l = baseHsl.l;

    let targetHsls = [];

    switch (harmonyMode) {
      case 'complementary':
        targetHsls = [
          { h: h, s: s, l: l },
          { h: (h + 180) % 360, s: Math.min(100, s + 5), l: l },
          { h: (h + 30) % 360, s: Math.max(30, s - 10), l: Math.min(85, l + 15) },
          { h: (h + 180 - 30 + 360) % 360, s: s, l: Math.max(25, l - 15) },
          { h: (h + 180 + 30) % 360, s: Math.min(100, s + 10), l: l }
        ];
        break;

      case 'triadic':
        targetHsls = [
          { h: h, s: s, l: l },
          { h: (h + 120) % 360, s: s, l: l },
          { h: (h + 240) % 360, s: Math.min(100, s + 10), l: Math.min(75, l + 5) },
          { h: (h + 60) % 360, s: Math.max(40, s - 20), l: Math.max(30, l - 10) },
          { h: (h + 180) % 360, s: Math.max(50, s - 10), l: Math.min(80, l + 10) }
        ];
        break;

      case 'tetradic':
        targetHsls = [
          { h: h, s: s, l: l },
          { h: (h + 90) % 360, s: s, l: l },
          { h: (h + 180) % 360, s: Math.min(100, s + 5), l: l },
          { h: (h + 270) % 360, s: Math.max(40, s - 10), l: Math.min(75, l + 10) },
          { h: (h + 45) % 360, s: Math.min(100, s + 10), l: Math.max(35, l - 10) }
        ];
        break;

      case 'split':
        targetHsls = [
          { h: h, s: s, l: l },
          { h: (h + 150) % 360, s: s, l: l },
          { h: (h + 210) % 360, s: Math.min(100, s + 10), l: l },
          { h: (h + 30) % 360, s: Math.max(30, s - 20), l: Math.max(30, l - 15) },
          { h: (h + 180) % 360, s: Math.max(40, s - 15), l: Math.min(80, l + 15) }
        ];
        break;

      case 'monochromatic':
        targetHsls = [
          { h: h, s: s, l: l },
          { h: h, s: Math.min(100, s + 15), l: Math.max(25, l - 20) },
          { h: h, s: Math.max(30, s - 25), l: Math.min(85, l + 25) },
          { h: h, s: s, l: Math.max(35, l - 10) },
          { h: h, s: Math.min(100, s + 5), l: Math.min(75, l + 15) }
        ];
        break;

      case 'random':
        targetHsls = [
          { h: h, s: s, l: l },
          { h: Math.floor(Math.random() * 360), s: Math.floor(60 + Math.random() * 35), l: Math.floor(40 + Math.random() * 25) },
          { h: Math.floor(Math.random() * 360), s: Math.floor(60 + Math.random() * 35), l: Math.floor(40 + Math.random() * 25) },
          { h: Math.floor(Math.random() * 360), s: Math.floor(40 + Math.random() * 30), l: Math.floor(35 + Math.random() * 30) },
          { h: Math.floor(Math.random() * 360), s: Math.floor(60 + Math.random() * 35), l: Math.floor(45 + Math.random() * 25) }
        ];
        break;

      case 'analogous':
      default:
        targetHsls = [
          { h: h, s: s, l: l },
          { h: (h + 30) % 360, s: Math.min(100, s + 5), l: l },
          { h: (h + 60) % 360, s: Math.max(30, s - 5), l: Math.min(75, l + 5) },
          { h: (h - 30 + 360) % 360, s: s, l: Math.max(30, l - 10) },
          { h: (h - 60 + 360) % 360, s: Math.min(100, s + 10), l: Math.min(80, l + 10) }
        ];
        break;
    }

    // Apply only to unlocked colors
    targetHsls.forEach((hsl, idx) => {
      if (!state.palette[idx].locked) {
        state.palette[idx].hex = hslToHex(hsl.h, hsl.s, hsl.l);
      }
    });

    updateAll();
  }

  // =========================================================================
  // 5. Apply Dynamic Colors to CSS Custom Properties
  // =========================================================================

  function applyColorsToCssVariables() {
    const root = document.documentElement;
    const [c1, c2, c3, c4, c5] = state.palette.map(p => p.hex);

    // Primary
    root.style.setProperty('--primary', c1);
    root.style.setProperty('--primary-light', hexToRgbaString(c1, 0.15));
    root.style.setProperty('--primary-dark', mixColors(c1, '#000000', 0.25));
    root.style.setProperty('--primary-text', getReadableTextColor(c1));

    // Secondary
    root.style.setProperty('--secondary', c2);
    root.style.setProperty('--secondary-light', hexToRgbaString(c2, 0.15));
    root.style.setProperty('--secondary-dark', mixColors(c2, '#000000', 0.25));
    root.style.setProperty('--secondary-text', getReadableTextColor(c2));

    // Accent
    root.style.setProperty('--accent', c3);
    root.style.setProperty('--accent-light', hexToRgbaString(c3, 0.15));
    root.style.setProperty('--accent-dark', mixColors(c3, '#000000', 0.25));
    root.style.setProperty('--accent-text', getReadableTextColor(c3));

    // Color 4 & 5
    root.style.setProperty('--color-4', c4);
    root.style.setProperty('--color-4-light', hexToRgbaString(c4, 0.15));
    root.style.setProperty('--color-4-text', getReadableTextColor(c4));

    root.style.setProperty('--color-5', c5);
    root.style.setProperty('--color-5-light', hexToRgbaString(c5, 0.15));
    root.style.setProperty('--color-5-text', getReadableTextColor(c5));

    // Dynamic Glows
    root.style.setProperty('--glow-primary', `0 10px 30px -10px ${hexToRgbaString(c1, 0.45)}`);
    root.style.setProperty('--glow-accent', `0 10px 30px -10px ${hexToRgbaString(c3, 0.4)}`);
  }

  function hexToRgbaString(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // =========================================================================
  // 6. UI Renderers
  // =========================================================================

  function renderPaletteGrid() {
    const grid = document.getElementById('paletteGrid');
    if (!grid) return;

    grid.innerHTML = '';

    state.palette.forEach((colorObj, index) => {
      const role = COLOR_ROLES[index];
      const hex = colorObj.hex;
      const isLocked = colorObj.locked;
      const rgb = hexToRgb(hex);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      const contrastWithDark = getContrastRatio(hex, '#090d16');
      const contrastScoreFormatted = contrastWithDark.toFixed(1) + ':1';
      const contrastPass = contrastWithDark >= 4.5;

      const card = document.createElement('div');
      card.className = `palette-card ${isLocked ? 'is-locked' : ''}`;
      card.innerHTML = `
        <div class="palette-swatch" style="background-color: ${hex};" title="Click to pick a custom color">
          <input type="color" class="native-color-picker" value="${hex}" data-index="${index}" aria-label="Choose color for ${role.label}">
          <div class="swatch-top-actions">
            <span class="swatch-role-tag">${role.label}</span>
            <button class="swatch-lock-btn" data-action="toggle-lock" data-index="${index}" title="${isLocked ? 'Unlock color' : 'Lock color'}">
              ${isLocked
                ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
                : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`
              }
            </button>
          </div>
          <span class="swatch-click-hint">Click to edit</span>
        </div>

        <div class="palette-details">
          <div class="palette-hex-row">
            <button class="palette-hex-btn" data-action="copy-hex" data-hex="${hex}" title="Click to copy HEX">
              <span>${hex.toUpperCase()}</span>
            </button>
            <button class="palette-copy-btn" data-action="copy-hex" data-hex="${hex}" aria-label="Copy ${hex}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>

          <div class="palette-meta-row">
            <span>HSL: ${hsl.h}&deg;, ${hsl.s}%, ${hsl.l}%</span>
            <span class="contrast-badge-pill ${contrastPass ? 'pass' : 'subtle'}" title="Contrast ratio against dark background">
              ${contrastPass ? '&check; ' : ''}${contrastScoreFormatted}
            </span>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    // Attach listeners
    grid.querySelectorAll('.native-color-picker').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        state.palette[idx].hex = e.target.value;
        updateAll();
      });
    });

    grid.querySelectorAll('[data-action="toggle-lock"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        state.palette[idx].locked = !state.palette[idx].locked;
        renderPaletteGrid();
        showToast(state.palette[idx].locked ? `Locked color ${idx + 1}` : `Unlocked color ${idx + 1}`);
      });
    });

    grid.querySelectorAll('[data-action="copy-hex"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(btn.dataset.hex, `Copied ${btn.dataset.hex.toUpperCase()} to clipboard!`);
      });
    });
  }

  function renderHeroStats() {
    const primaryHex = state.palette[0].hex;
    const hsl = hexToHsl(primaryHex);
    const contrastRatio = getContrastRatio(primaryHex, '#090d16');

    const heroHueEl = document.getElementById('heroStatHue');
    if (heroHueEl) heroHueEl.innerHTML = `${hsl.h}&deg;`;

    const heroContrastEl = document.getElementById('heroStatContrast');
    if (heroContrastEl) heroContrastEl.textContent = `${contrastRatio.toFixed(1)} : 1`;

    const heroHarmonyEl = document.getElementById('heroStatHarmony');
    if (heroHarmonyEl) {
      heroHarmonyEl.textContent = state.harmony.charAt(0).toUpperCase() + state.harmony.slice(1);
    }

    // Mini metric card inside UI showcase
    const rgb = hexToRgb(primaryHex);
    const lum = getLuminance(rgb.r, rgb.g, rgb.b);
    const lumValEl = document.getElementById('metricLumVal');
    if (lumValEl) lumValEl.textContent = lum.toFixed(2);

    const satValEl = document.getElementById('metricSatVal');
    if (satValEl) satValEl.textContent = `${hsl.s}%`;

    const deltaValEl = document.getElementById('metricDeltaVal');
    if (deltaValEl) {
      const secHsl = hexToHsl(state.palette[1].hex);
      const diff = Math.abs(hsl.h - secHsl.h);
      deltaValEl.innerHTML = `${Math.min(diff, 360 - diff)}&deg;`;
    }
  }

  function renderShadesScale() {
    const container = document.getElementById('shadesContainer');
    if (!container) return;

    container.innerHTML = '';
    const baseColor = state.palette[0].hex;

    // Standard 10 shades: 50, 100, 200, 300, 400, 500 (base), 600, 700, 800, 900
    // 50-400 are tints mixed with white; 600-900 are shades mixed with black
    const steps = [
      { num: 50,  weight: 0.85, type: 'tint' },
      { num: 100, weight: 0.70, type: 'tint' },
      { num: 200, weight: 0.50, type: 'tint' },
      { num: 300, weight: 0.30, type: 'tint' },
      { num: 400, weight: 0.15, type: 'tint' },
      { num: 500, weight: 0.00, type: 'base' },
      { num: 600, weight: 0.15, type: 'shade' },
      { num: 700, weight: 0.30, type: 'shade' },
      { num: 800, weight: 0.50, type: 'shade' },
      { num: 900, weight: 0.70, type: 'shade' }
    ];

    steps.forEach(step => {
      let color;
      if (step.type === 'tint') {
        color = mixColors(baseColor, '#ffffff', step.weight);
      } else if (step.type === 'shade') {
        color = mixColors(baseColor, '#000000', step.weight);
      } else {
        color = baseColor;
      }

      const card = document.createElement('div');
      card.className = 'shade-step-card';
      card.title = `Click to copy ${step.num} (${color.toUpperCase()})`;
      card.innerHTML = `
        <div class="shade-swatch" style="background-color: ${color};">
          <span class="shade-step-label">${step.num}</span>
        </div>
        <div class="shade-info">
          <div class="shade-number">${step.num}</div>
          <div class="shade-hex">${color.toUpperCase()}</div>
        </div>
      `;
      card.addEventListener('click', () => {
        copyToClipboard(color, `Copied Shade ${step.num} (${color.toUpperCase()})!`);
      });
      container.appendChild(card);
    });
  }

  function renderPresetsGrid() {
    const grid = document.getElementById('presetsGrid');
    if (!grid) return;

    grid.innerHTML = '';
    PRESETS.forEach(preset => {
      const card = document.createElement('div');
      card.className = 'preset-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Apply ${preset.name} theme preset`);

      card.innerHTML = `
        <div class="preset-swatches-row">
          ${preset.colors.map(c => `<div class="preset-color-slice" style="background-color: ${c};"></div>`).join('')}
        </div>
        <div class="preset-card-footer">
          <div>
            <div class="preset-name">${preset.name}</div>
            <div class="preset-tag">${preset.tag}</div>
          </div>
          <button class="btn btn-sm btn-outline">Apply</button>
        </div>
      `;

      const applyPreset = () => {
        state.palette = preset.colors.map(c => ({ hex: c, locked: false }));
        state.harmony = preset.harmony;
        const select = document.getElementById('harmonySelect');
        if (select) select.value = preset.harmony;
        updateAll();
        showToast(`Applied preset: ${preset.name}`);
      };

      card.addEventListener('click', applyPreset);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          applyPreset();
        }
      });

      grid.appendChild(card);
    });
  }

  function renderContrastMatrix() {
    const primary = state.palette[0].hex;
    const accent = state.palette[2].hex;
    const surfaceDark = '#141c2e';
    const bgDark = '#090d16';

    // Pair 1: Primary on Surface
    const ratio1 = getContrastRatio(primary, surfaceDark);
    const score1El = document.getElementById('contrastScore1');
    if (score1El) score1El.textContent = `${ratio1.toFixed(1)} : 1`;

    const preview1 = document.getElementById('contrastPreview1');
    if (preview1) {
      preview1.style.backgroundColor = surfaceDark;
      preview1.style.color = primary;
    }

    const rating1AA = document.getElementById('rating1AA');
    if (rating1AA) {
      const pass = ratio1 >= 4.5;
      rating1AA.innerHTML = `AA Normal: <strong class="${pass ? 'text-success' : 'text-muted'}">${pass ? '&check; Pass' : '&cross; Fail'}</strong>`;
    }
    const rating1AAA = document.getElementById('rating1AAA');
    if (rating1AAA) {
      const pass = ratio1 >= 7.0;
      rating1AAA.innerHTML = `AAA Large: <strong class="${pass ? 'text-success' : 'text-muted'}">${pass ? '&check; Pass' : '&cross; Fail'}</strong>`;
    }

    // Pair 2: White/Dark text on Primary button
    const textColor = getReadableTextColor(primary);
    const ratio2 = getContrastRatio(textColor, primary);
    const score2El = document.getElementById('contrastScore2');
    if (score2El) score2El.textContent = `${ratio2.toFixed(1)} : 1`;

    const rating2AA = document.getElementById('rating2AA');
    if (rating2AA) {
      const pass = ratio2 >= 4.5;
      rating2AA.innerHTML = `AA Normal: <strong class="${pass ? 'text-success' : 'text-muted'}">${pass ? '&check; Pass' : '&cross; Fail'}</strong>`;
    }
    const rating2AAA = document.getElementById('rating2AAA');
    if (rating2AAA) {
      const pass = ratio2 >= 7.0;
      rating2AAA.innerHTML = `AAA Normal: <strong class="${pass ? 'text-success' : 'text-muted'}">${pass ? '&check; Pass' : '&cross; Fail'}</strong>`;
    }

    // Pair 3: Accent on Background
    const ratio3 = getContrastRatio(accent, bgDark);
    const score3El = document.getElementById('contrastScore3');
    if (score3El) score3El.textContent = `${ratio3.toFixed(1)} : 1`;

    const preview3 = document.getElementById('contrastPreview3');
    if (preview3) {
      preview3.style.backgroundColor = bgDark;
    }

    const rating3AA = document.getElementById('rating3AA');
    if (rating3AA) {
      const pass = ratio3 >= 4.5;
      rating3AA.innerHTML = `AA Normal: <strong class="${pass ? 'text-success' : 'text-muted'}">${pass ? '&check; Pass' : '&cross; Fail'}</strong>`;
    }
    const rating3AAA = document.getElementById('rating3AAA');
    if (rating3AAA) {
      const pass = ratio3 >= 7.0;
      rating3AAA.innerHTML = `AAA Large: <strong class="${pass ? 'text-success' : 'text-muted'}">${pass ? '&check; Pass' : '&cross; Fail'}</strong>`;
    }
  }

  // =========================================================================
  // 7. Export Code Generator
  // =========================================================================

  function generateExportSnippet(type) {
    const [c1, c2, c3, c4, c5] = state.palette.map(p => p.hex.toUpperCase());

    switch (type) {
      case 'tailwind':
        return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n        brand: {\n          primary: '${c1}',\n          secondary: '${c2}',\n          accent: '${c3}',\n          neutral: '${c4}',\n          highlight: '${c5}',\n        }\n      }\n    }\n  }\n};`;

      case 'json':
        return JSON.stringify({
          name: "ChromaFlow Dynamic Palette",
          harmony: state.harmony,
          colors: {
            primary: c1,
            secondary: c2,
            accent: c3,
            color4: c4,
            color5: c5
          },
          tokens: state.palette.map((c, i) => ({
            role: COLOR_ROLES[i].label,
            hex: c.hex.toUpperCase(),
            hsl: hexToHsl(c.hex)
          }))
        }, null, 2);

      case 'url':
        const cleanColors = state.palette.map(p => p.hex.replace('#', '')).join('-');
        return `${window.location.origin}${window.location.pathname}#colors=${cleanColors}&harmony=${state.harmony}`;

      case 'css':
      default:
        return `:root {\n  --primary: ${c1};\n  --secondary: ${c2};\n  --accent: ${c3};\n  --color-4: ${c4};\n  --color-5: ${c5};\n\n  /* Tints & readable text tokens */\n  --primary-light: ${hexToRgbaString(c1, 0.15)};\n  --primary-text: ${getReadableTextColor(c1)};\n  --secondary-light: ${hexToRgbaString(c2, 0.15)};\n  --secondary-text: ${getReadableTextColor(c2)};\n  --accent-light: ${hexToRgbaString(c3, 0.15)};\n  --accent-text: ${getReadableTextColor(c3)};\n}`;
    }
  }

  function updateExportModalCode() {
    const codeBlock = document.getElementById('exportCodeBlock');
    if (codeBlock) {
      codeBlock.textContent = generateExportSnippet(state.activeExportTab);
    }
  }

  // =========================================================================
  // 8. General Helpers: Clipboard, Toasts, URL Hash
  // =========================================================================

  function copyToClipboard(text, successMessage) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMessage || 'Copied to clipboard!');
      }).catch(() => {
        fallbackCopy(text, successMessage);
      });
    } else {
      fallbackCopy(text, successMessage);
    }
  }

  function fallbackCopy(text, successMessage) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast(successMessage || 'Copied to clipboard!');
    } catch (err) {
      showToast('Press Ctrl+C to copy');
    }
    document.body.removeChild(textarea);
  }

  function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  function parseUrlHash() {
    if (!window.location.hash) return false;
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const colorsParam = params.get('colors');
    const harmonyParam = params.get('harmony');

    if (colorsParam) {
      const hexList = colorsParam.split('-');
      if (hexList.length === 5) {
        state.palette = hexList.map(h => ({ hex: '#' + h, locked: false }));
        if (harmonyParam) state.harmony = harmonyParam;
        return true;
      }
    }
    return false;
  }

  // =========================================================================
  // 9. Master Update Routine
  // =========================================================================

  function updateAll() {
    applyColorsToCssVariables();
    renderPaletteGrid();
    renderHeroStats();
    renderShadesScale();
    renderContrastMatrix();
    updateExportModalCode();
  }

  // =========================================================================
  // 10. Event Listeners & Initialization
  // =========================================================================

  document.addEventListener('DOMContentLoaded', () => {
    // Check if initial palette in URL hash
    parseUrlHash();

    // Initial render
    updateAll();
    renderPresetsGrid();

    // 1. Harmony selector
    const harmonySelect = document.getElementById('harmonySelect');
    if (harmonySelect) {
      harmonySelect.value = state.harmony;
      harmonySelect.addEventListener('change', (e) => {
        state.harmony = e.target.value;
        generateHarmonicPalette(state.harmony);
      });
    }

    // 2. Randomize / Generate buttons
    const handleGenerate = () => generateHarmonicPalette(state.harmony);

    const shuffleAllBtn = document.getElementById('shuffleAllBtn');
    if (shuffleAllBtn) shuffleAllBtn.addEventListener('click', handleGenerate);

    const quickGenerateBtn = document.getElementById('quickGenerateBtn');
    if (quickGenerateBtn) quickGenerateBtn.addEventListener('click', handleGenerate);

    const heroGenerateBtn = document.getElementById('heroGenerateBtn');
    if (heroGenerateBtn) heroGenerateBtn.addEventListener('click', handleGenerate);

    // 3. Lock All Toggle
    const lockAllBtn = document.getElementById('lockAllBtn');
    if (lockAllBtn) {
      lockAllBtn.addEventListener('click', () => {
        const anyUnlocked = state.palette.some(p => !p.locked);
        state.palette.forEach(p => { p.locked = anyUnlocked; });
        renderPaletteGrid();
        const textSpan = lockAllBtn.querySelector('.btn-text');
        if (textSpan) textSpan.textContent = anyUnlocked ? 'Unlock All' : 'Lock All';
        showToast(anyUnlocked ? 'Locked all colors' : 'Unlocked all colors');
      });
    }

    // 4. Copy CSS buttons
    const handleCopyCss = () => {
      const snippet = generateExportSnippet('css');
      copyToClipboard(snippet, 'Copied CSS Variables to clipboard!');
    };
    const copyCssBtn = document.getElementById('copyCssBtn');
    if (copyCssBtn) copyCssBtn.addEventListener('click', handleCopyCss);

    const copyShadesCssBtn = document.getElementById('copyShadesCssBtn');
    if (copyShadesCssBtn) {
      copyShadesCssBtn.addEventListener('click', () => {
        const base = state.palette[0].hex;
        let snippet = `/* 10-step scale for ${base.toUpperCase()} */\n:root {\n`;
        const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
        document.querySelectorAll('.shade-step-card').forEach((card, idx) => {
          const hex = card.querySelector('.shade-hex').textContent;
          snippet += `  --primary-${steps[idx]}: ${hex};\n`;
        });
        snippet += `}`;
        copyToClipboard(snippet, 'Copied 10-step shades scale CSS!');
      });
    }

    // 5. Export Modal Controls
    const exportModal = document.getElementById('exportModal');
    const openExportModal = () => {
      updateExportModalCode();
      if (exportModal) exportModal.setAttribute('open', '');
    };
    const closeExportModal = () => {
      if (exportModal) exportModal.removeAttribute('open');
    };

    const openExportBtn = document.getElementById('openExportBtn');
    if (openExportBtn) openExportBtn.addEventListener('click', openExportModal);

    const heroExportBtn = document.getElementById('heroExportBtn');
    if (heroExportBtn) heroExportBtn.addEventListener('click', openExportModal);

    const footerExportBtn = document.getElementById('footerExportBtn');
    if (footerExportBtn) footerExportBtn.addEventListener('click', openExportModal);

    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeExportModal);

    const closeModalBtn2 = document.getElementById('closeModalBtn2');
    if (closeModalBtn2) closeModalBtn2.addEventListener('click', closeExportModal);

    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeExportModal);

    // Modal Tabs
    document.querySelectorAll('.modal-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeExportTab = btn.dataset.tab;
        updateExportModalCode();
      });
    });

    const copyExportCodeBtn = document.getElementById('copyExportCodeBtn');
    if (copyExportCodeBtn) {
      copyExportCodeBtn.addEventListener('click', () => {
        const snippet = generateExportSnippet(state.activeExportTab);
        copyToClipboard(snippet, `Copied ${state.activeExportTab.toUpperCase()} snippet!`);
      });
    }

    // 6. Theme Toggle (Dark / Light)
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', state.theme);
        renderContrastMatrix();
        showToast(`Switched to ${state.theme} theme`);
      });
    }

    // 7. Mobile Navigation Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.getElementById('navMenu');
    if (mobileMenuBtn && navMenu) {
      mobileMenuBtn.addEventListener('click', () => {
        navMenu.classList.toggle('is-open');
      });
    }

    // Close mobile nav on click of any nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (navMenu) navMenu.classList.remove('is-open');
      });
    });

    // 8. Showcase View Segmented Control
    document.querySelectorAll('.segmented-control .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.segmented-control .seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.previewMode;
        const showcaseGrid = document.querySelector('.showcase-grid');
        if (!showcaseGrid) return;

        if (mode === 'glass') {
          showcaseGrid.querySelectorAll('.component-card').forEach(c => {
            c.style.backdropFilter = 'blur(16px)';
            c.style.background = 'rgba(255, 255, 255, 0.05)';
          });
        } else if (mode === 'contrast') {
          showcaseGrid.querySelectorAll('.component-card').forEach(c => {
            c.style.backdropFilter = 'none';
            c.style.background = '#000000';
            c.style.borderColor = 'var(--primary)';
          });
        } else {
          showcaseGrid.querySelectorAll('.component-card').forEach(c => {
            c.style.backdropFilter = '';
            c.style.background = '';
            c.style.borderColor = '';
          });
        }
      });
    });

    // 9. Pricing CTA Demo
    const pricingDemoBtn = document.getElementById('pricingDemoBtn');
    if (pricingDemoBtn) {
      pricingDemoBtn.addEventListener('click', () => {
        showToast('Repository is ready to deploy on GitHub Pages!');
      });
    }

    // 10. Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Ignore if user is typing into an input, select, textarea
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleGenerate();
        showToast('Generated new palette (Space)');
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        const anyUnlocked = state.palette.some(p => !p.locked);
        state.palette.forEach(p => { p.locked = anyUnlocked; });
        renderPaletteGrid();
        showToast(anyUnlocked ? 'Locked all colors (L)' : 'Unlocked all colors (L)');
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleCopyCss();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', state.theme);
        renderContrastMatrix();
        showToast(`Theme: ${state.theme} (T)`);
      } else if (e.key === 'Escape') {
        closeExportModal();
      }
    });
  });
})();
