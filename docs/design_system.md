# TerraScope Design System & Accessibility Guidelines

## 1. Design Philosophy
TerraScope's design aesthetic is inspired by earthy, organic geological tones reflecting environmental stewardship and scientific clarity. The UI balances clarity for non-specialists with high data density for scientific inquiry.

## 2. Color Palette & Tokens

| Token Name | Hex Code | Semantic Role | WCAG AA Contrast Check |
|---|---|---|---|
| `--bg-base` | `#FAF6EC` | Main canvas / page background | Dark olive text passes (>10:1) |
| `--bg-card` | `#EFE6D2` | Surfaces, control cards, metrics panels | Dark olive text passes (>8:1) |
| `--primary` | `#2F5D3A` | Brand green, primary buttons, active state | Background white/ivory text passes |
| `--secondary` | `#9CAF88` | Sage green, outlines, secondary controls | Interactive borders, badge backgrounds |
| `--accent` | `#C8643B` | Terracotta, highlighted trend callouts | White or deep ivory text passes |
| `--text-main` | `#3B3F1F` | Dark olive body copy and titles | High contrast against ivory |
| `--text-muted` | `#6B7052` | Subtitles, footnotes, chart gridlines | Passable on ivory background |

## 3. Direction of Change Legend Palette

To ensure full accessibility for deuteranopia and protanopia (red-green color vision deficiency), color is never used as the sole indicator:

| Classification | Color Name | Hex Code | Icon Symbol | SVG Pattern / Hatching |
|---|---|---|---|---|
| Strong Increase | Deep Terracotta | `#A8461F` | ▲▲ | Solid heavy accent |
| Slight Increase | Light Terracotta | `#E3A27F` | ▲ | Light accent fill |
| No Clear Change | Warm Neutral Gray | `#D9D2BF` | = | Solid neutral |
| Slight Decrease | Light Sage | `#B7C7A3` | ▼ | Light sage fill |
| Strong Decrease | Forest Green | `#2F5D3A` | ▼▼ | Solid deep green |
| No Data | Hatched Ivory | `#FAF6EC` | n/a | 45-degree crosshatch lines |

## 4. Typography
- **Primary Body Font**: System stack (`system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`) for performance and instant rendering.
- **Data & Numbers**: Monospace tabular font (`ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace`) for numerical alignment in charts and summaries.

## 5. Plain-Language Card Structure
1. **Headline Metric**: Rate of change per decade with direction arrow.
2. **Confidence Badge**: "Statistically Significant ($p < 0.05$)" or "Normal Variation ($p \ge 0.05$)".
3. **Plain Text Sentence**: Contextual sentence stating observed trend, starting year, ending year, and practical meaning.
4. **Expandable Science Drawer**: Raw p-value, Sen's slope, $N$ observations, data limitations, and research hypotheses.
