# Webpage
Webpage 101

A basic, responsive "Dynamic Colors" webpage built with plain HTML, CSS and JavaScript.

## Features

- Standard modern layout: sticky header with navigation, hero, feature cards, palette section, about banner and footer
- Entire theme derived from a single hue (CSS custom properties + HSL)
- Hue slider, random color button and auto-cycle mode
- Generated palette with click-to-copy hex codes
- Light/dark mode that follows the system preference, with a manual toggle
- Hue and theme choices saved in `localStorage`
- Mobile navigation menu and `prefers-reduced-motion` support

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Publish with GitHub Pages

1. Go to **Settings → Pages** in this repository.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the `main` branch and the `/ (root)` folder, then save.

The site will be available at `https://<username>.github.io/Webpage/`.
