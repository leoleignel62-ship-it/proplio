# Locavio — Kit Logo

Version 2.0 · Wordmark typographique mis à jour
Date : Mai 2026

## Contenu

### 01-wordmark/
Le wordmark seul, en sans-serif moderne (Plus Jakarta Sans 600, italic supprimé).
- `wordmark-ink.svg` — Texte #1a0533 · fond transparent · pour fonds clairs
- `wordmark-blanc.svg` — Texte #ffffff · fond transparent · pour fonds sombres

### 02-logomarks/
Le mark géométrique violet seul, dans ses 5 traitements.
- `logomark-couleur.svg` — Couleur · fond transparent · contour blanc
- `logomark-fond-sombre.svg` — Couleur sur fond #0B0A14
- `logomark-fond-blanc.svg` — Couleur sur fond blanc · contour #1C1438
- `logomark-blanc.svg` — Monochrome blanc · pour fonds sombres
- `logomark-noir.svg` — Monochrome #1C1438 · pour fonds clairs

### 03-lockups/
Mark + wordmark combinés. Texte en Plus Jakarta Sans 600.
- `lockup-horizontal-sombre.svg` — pour fonds sombres
- `lockup-horizontal-clair.svg` — pour fonds clairs
- `lockup-vertical-sombre.svg` — empilé, fonds sombres
- `lockup-vertical-clair.svg` — empilé, fonds clairs

### 04-favicon/
- `favicon.svg` — 32×32, mark seul, fond transparent
- `app-icon.svg` — 512×512, mark sur carré violet arrondi (iOS / Android / PWA)

### 05-tokens/
- `locavio-tokens.css` — Variables CSS (couleurs + typo)

---

## Typographie

Le wordmark utilise **Plus Jakarta Sans 600** (semi-bold), letter-spacing -0.022em.
Téléchargement : https://fonts.google.com/specimen/Plus+Jakarta+Sans

Fallbacks : Inter, system-ui, sans-serif.

> ⚠️ Les fichiers SVG du wordmark contiennent le texte en tant qu'élément `<text>`.
> Pour un usage hors-navigateur (print, app native), vectoriser le texte dans
> Figma/Illustrator (Type → Create Outlines) après installation de la police.

## Couleurs principales

| Token                       | Hex       | Usage                            |
|-----------------------------|-----------|----------------------------------|
| --locavio-encre             | #0B0A14   | Fond le plus sombre              |
| --locavio-nuit              | #1C1438   | Moitié sombre du mark            |
| --locavio-wordmark-ink      | #1a0533   | Texte wordmark sur fond clair    |
| --locavio-principal         | #7C5CBF   | Violet principal SaaS            |
| --locavio-fracture          | #C4A0FF   | Ligne médiane du mark            |
| --locavio-fond-clair        | #F0EBF9   | Fond clair lavé                  |

## Intégration HTML rapide

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&display=swap" rel="stylesheet">
```
