# Asset bandwidth optimization — pagina-web-genus

## Root cause
- Six category PNGs at ~2.0–2.6 MB each (~14.4 MB total)
- Home loaded all six eagerly → ~17 MB page weight in practice
- Favicon `favicon grande.png` oversized; `favicon.png` 404
- Base64 logos embedded in `desarrolla-tu-producto.html`

Genus OS / `appgenus.vercel.app` were **not** modified.

## Before → After (individual)

| Asset | Before | After (primary) |
|-------|--------|-----------------|
| serums.png | 2607 KB | 22.9 KB AVIF (1024w) |
| facial.png | 2555 KB | 18.9 KB AVIF |
| cremas.png | 2531 KB | 12.4 KB AVIF |
| capilar.png | 2479 KB | 15.8 KB AVIF |
| corporal.png | 2353 KB | 13.2 KB AVIF |
| geles.png | 2044 KB | 30.6 KB AVIF |
| hero-lab.jpg | 59 KB | 20.4 KB AVIF / 29 KB WebP |
| logo-genus.png | 11.5 KB | 3.6 KB PNG |
| favicon grande.png | 94 KB | 3.1 KB (64px) |
| favicon.png | missing (404) | 1.2 KB (32px) |

## Totals
- **Before (listed images):** 14.39 MB
- **After (all image assets on disk incl. responsive variants):** 1.27 MB
- **Reduction on disk:** **91.1%**
- **Home mobile initial (logo + hero + favicon, categories lazy):** ~25 KB images
- **Home worst-case (all 6 categories AVIF 1024 + hero + logo + fav):** ~139 KB

## Transfer estimate × 8,000 visits
| Scenario | Before | After |
|----------|--------|-------|
| Full category dump per visit | ~112.4 GB | ~1.06 GB |
| Reduction | — | **~99%** |

## Implementation
- `assets/opt/*` AVIF + WebP + JPEG at 480 / 768 / 1024
- `<picture>` + `srcset`/`sizes` + `loading="lazy"` + `decoding="async"`
- Original heavy PNGs removed from repo
- Long-cache headers for `/assets/opt/*`
- Base64 logos replaced with `assets/logo-genus.png`
