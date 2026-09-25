(function (root, factory) {
  root.DynamicColor = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var HARMONY_MODES = ["analogous", "complementary", "triadic", "monochrome"];

  var HARMONY_OFFSETS = {
    analogous: [0, 28, -32],
    complementary: [0, 180, 208],
    triadic: [0, 120, 240],
    monochrome: [0, 0, 0]
  };

  var SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
  var SCALE_LIGHTNESS = [97, 92, 84, 73, 62, 50, 41, 33, 24, 16];
  var SCALE_SATURATION = [32, 42, 50, 58, 64, 70, 72, 68, 60, 52];

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeHue(hue) {
    return ((hue % 360) + 360) % 360;
  }

  function normalizeHex(hex) {
    var value = String(hex || "").trim().replace("#", "");
    if (value.length === 3) {
      value = value.split("").map(function (char) {
        return char + char;
      }).join("");
    }
    if (!/^[0-9a-fA-F]{6}$/.test(value)) {
      return "#6E56CF";
    }
    return "#" + value.toUpperCase();
  }

  function hexToRgb(hex) {
    var value = normalizeHex(hex).slice(1);
    var int = parseInt(value, 16);
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255
    };
  }

  function rgbToHex(r, g, b) {
    function byte(channel) {
      return clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0");
    }
    return ("#" + byte(r) + byte(g) + byte(b)).toUpperCase();
  }

  function rgbToHsl(r, g, b) {
    var red = r / 255;
    var green = g / 255;
    var blue = b / 255;
    var max = Math.max(red, green, blue);
    var min = Math.min(red, green, blue);
    var hue = 0;
    var saturation = 0;
    var lightness = (max + min) / 2;
    var delta = max - min;

    if (delta !== 0) {
      saturation = lightness > 0.5
        ? delta / (2 - max - min)
        : delta / (max + min);
      switch (max) {
        case red:
          hue = (green - blue) / delta + (green < blue ? 6 : 0);
          break;
        case green:
          hue = (blue - red) / delta + 2;
          break;
        default:
          hue = (red - green) / delta + 4;
      }
      hue *= 60;
    }

    return {
      h: normalizeHue(hue),
      s: saturation * 100,
      l: lightness * 100
    };
  }

  function hexToHsl(hex) {
    var rgb = hexToRgb(hex);
    return rgbToHsl(rgb.r, rgb.g, rgb.b);
  }

  function hslToRgb(h, s, l) {
    var hue = normalizeHue(h);
    var saturation = clamp(s, 0, 100) / 100;
    var lightness = clamp(l, 0, 100) / 100;
    var chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    var x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
    var m = lightness - chroma / 2;
    var red = 0;
    var green = 0;
    var blue = 0;

    if (hue < 60) {
      red = chroma;
      green = x;
    } else if (hue < 120) {
      red = x;
      green = chroma;
    } else if (hue < 180) {
      green = chroma;
      blue = x;
    } else if (hue < 240) {
      green = x;
      blue = chroma;
    } else if (hue < 300) {
      red = x;
      blue = chroma;
    } else {
      red = chroma;
      blue = x;
    }

    return {
      r: (red + m) * 255,
      g: (green + m) * 255,
      b: (blue + m) * 255
    };
  }

  function hslToHex(h, s, l) {
    var rgb = hslToRgb(h, s, l);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  }

  function channelLuminance(channel) {
    var value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  }

  function relativeLuminance(hex) {
    var rgb = hexToRgb(hex);
    return 0.2126 * channelLuminance(rgb.r)
      + 0.7152 * channelLuminance(rgb.g)
      + 0.0722 * channelLuminance(rgb.b);
  }

  function contrastRatio(foreground, background) {
    var first = relativeLuminance(foreground);
    var second = relativeLuminance(background);
    var lighter = Math.max(first, second);
    var darker = Math.min(first, second);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function contrastingInk(hex) {
    var dark = "#161417";
    var light = "#F7F6F3";
    return contrastRatio(dark, hex) >= contrastRatio(light, hex) ? dark : light;
  }

  function gradeContrast(ratio) {
    if (ratio >= 7) return "AAA";
    if (ratio >= 4.5) return "AA";
    if (ratio >= 3) return "AA Large";
    return "Fail";
  }

  function roleHex(hue, offset, saturation, lightness) {
    return hslToHex(hue + offset, saturation, lightness);
  }

  function buildScale(hue) {
    return SCALE_STEPS.map(function (step, index) {
      return {
        step: step,
        hex: hslToHex(hue, SCALE_SATURATION[index], SCALE_LIGHTNESS[index])
      };
    });
  }

  function buildSystem(seed, mode, theme) {
    var harmony = HARMONY_OFFSETS[mode] ? mode : "analogous";
    var appearance = theme === "dark" ? "dark" : "light";
    var primary = normalizeHex(seed);
    var hsl = hexToHsl(primary);
    var offsets = HARMONY_OFFSETS[harmony];
    var dark = appearance === "dark";
    var secondary;
    var tertiary;

    if (harmony === "monochrome") {
      secondary = hslToHex(hsl.h, clamp(hsl.s * 0.45, 14, 42), dark ? 74 : 34);
      tertiary = hslToHex(hsl.h, clamp(hsl.s * 0.28, 10, 32), dark ? 62 : 46);
    } else {
      secondary = roleHex(
        hsl.h,
        offsets[1],
        clamp(Math.max(hsl.s, 48), 46, 78),
        dark ? 68 : 42
      );
      tertiary = roleHex(
        hsl.h,
        offsets[2],
        clamp(Math.max(hsl.s * 0.92, 42), 40, 74),
        dark ? 74 : 48
      );
    }

    var colors = {
      primary: primary,
      onPrimary: contrastingInk(primary),
      secondary: secondary,
      onSecondary: contrastingInk(secondary),
      tertiary: tertiary,
      onTertiary: contrastingInk(tertiary),
      background: hslToHex(hsl.h, dark ? 18 : 34, dark ? 8 : 97),
      surface: hslToHex(hsl.h, dark ? 16 : 30, dark ? 12 : 94),
      surfaceRaised: hslToHex(hsl.h, dark ? 14 : 24, dark ? 17 : 100),
      text: hslToHex(hsl.h, dark ? 14 : 22, dark ? 96 : 14),
      muted: hslToHex(hsl.h, dark ? 10 : 12, dark ? 74 : 36),
      border: hslToHex(hsl.h, dark ? 12 : 16, dark ? 28 : 86),
      primarySoft: hslToHex(hsl.h, dark ? 28 : 40, dark ? 22 : 91),
      secondarySoft: hslToHex(
        hsl.h + offsets[1],
        dark ? 22 : 36,
        dark ? 24 : 90
      )
    };

    return {
      seed: primary,
      mode: harmony,
      theme: appearance,
      hue: hsl.h,
      colors: colors,
      scale: buildScale(hsl.h),
      textContrast: contrastRatio(colors.text, colors.background),
      buttonContrast: contrastRatio(colors.onPrimary, colors.primary)
    };
  }

  function randomSeed() {
    var hue = Math.floor(Math.random() * 360);
    var saturation = 55 + Math.floor(Math.random() * 28);
    var lightness = 42 + Math.floor(Math.random() * 16);
    return hslToHex(hue, saturation, lightness);
  }

  return {
    HARMONY_MODES: HARMONY_MODES,
    normalizeHex: normalizeHex,
    buildSystem: buildSystem,
    contrastRatio: contrastRatio,
    contrastingInk: contrastingInk,
    gradeContrast: gradeContrast,
    randomSeed: randomSeed
  };
});
