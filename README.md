# ChromaFlow &mdash; Dynamic Colors Webpage

A modern, responsive webpage built with standard HTML5, CSS3 Custom Properties, and vanilla JavaScript. ChromaFlow demonstrates dynamic living colors, algorithmic color harmonies, real-time theme tokens, and accessible UI component styling &mdash; optimized for immediate deployment on **GitHub Pages** with **zero build dependencies**.

![ChromaFlow Demo](https://img.shields.io/badge/Status-Live%20Ready-success?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![Dependencies](https://img.shields.io/badge/Dependencies-0%20(Pure%20Vanilla)-brightgreen?style=flat-square)
![WCAG](https://img.shields.io/badge/WCAG-2.1%20Compliant-purple?style=flat-square)

---

## ✨ Features

- 🎨 **Dynamic Color Engine**: Changes cascade in real-time across the entire webpage via CSS variables (`--primary`, `--secondary`, `--accent`, `--color-4`, `--color-5`).
- 📐 **Harmonic Algorithms**: Generates mathematically harmonious palettes including:
  - **Analogous**
  - **Complementary**
  - **Triadic**
  - **Tetradic**
  - **Split-Complementary**
  - **Monochromatic**
  - **Random Aesthetic**
- 🔒 **Individual & Global Color Locking**: Freeze individual favorite colors or lock/unlock all colors with a single keypress.
- 🎯 **Interactive Color Picker**: Tweak any swatch using the native color picker or directly copy HEX / HSL / RGB values.
- 🌓 **Dark & Light Mode**: Seamless theme toggle with contrast preservation across all surfaces and widgets.
- 🎛️ **Live UI Design System Showcase**:
  - Interactive hero widget & progress bar
  - Form inputs, selects, and animated toggle switches
  - Metrics and dynamic CSS chart bars
  - Alert and status notification banners
  - Interactive user profile card
  - Responsive pricing tier card
- 📊 **Tonal Shades & Tints Scale**: Automatically calculates a 10-step tonal scale (`50` through `900`) from the active primary color.
- ♿ **WCAG 2.1 Contrast Matrix**: Real-time relative luminance and contrast ratio calculation with AA / AAA pass/fail rating.
- 📦 **Export Formats**:
  - CSS Custom Properties (`:root { ... }`)
  - Tailwind CSS configuration (`tailwind.config.js`)
  - JSON token schema
  - Shareable URL with color parameters in hash
- ⌨️ **Keyboard Shortcuts**: Quick workflow navigation using `Space`, `L`, `C`, and `T`.

---

## 🚀 Live Demo & GitHub Pages Deployment

ChromaFlow is built to run directly on GitHub Pages without any compilation or build steps.

### Enabling GitHub Pages for this Repository

1. Push this repository to GitHub.
2. In your GitHub repository, navigate to **Settings** &rarr; **Pages**.
3. Under **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: Select `main` (or your preferred branch), and select `/ (root)` folder.
4. Click **Save**.
5. Within 1&ndash;2 minutes, your website will be live at:
   ```
   https://<your-username>.github.io/<repository-name>/
   ```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| <kbd>Space</kbd> | Generate a new harmonic color palette |
| <kbd>L</kbd> | Toggle lock / unlock on all colors |
| <kbd>C</kbd> | Copy CSS Custom Properties to clipboard |
| <kbd>T</kbd> | Toggle Dark / Light theme |
| <kbd>Esc</kbd> | Close export modal dialog |

---

## 📁 Project Structure

```
.
├── index.html         # Modern semantic HTML5 webpage structure
├── css/
│   └── style.css      # Modern responsive layout & dynamic CSS custom properties
├── js/
│   └── app.js         # Color algorithms, harmonies, WCAG math & UI interactions
└── README.md          # Project documentation and deployment guide
```

---

## 🧪 Local Development

You can run ChromaFlow with any standard HTTP server or open `index.html` directly in your browser:

```bash
# Using Python 3 built-in HTTP server:
python3 -m http.server 8080

# Using Node.js http-server or npx serve:
npx serve .
```

Open `http://localhost:8080` in your web browser.

---

## 📄 License

Open source under the [MIT License](LICENSE).
