---
name: BioArc Dark
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#95d3ba'
  on-secondary: '#003829'
  secondary-container: '#0b513d'
  on-secondary-container: '#83c2a9'
  tertiary: '#bacac3'
  on-tertiary: '#25332e'
  tertiary-container: '#96a69f'
  on-tertiary-container: '#2d3c37'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#b0f0d6'
  secondary-fixed-dim: '#95d3ba'
  on-secondary-fixed: '#002117'
  on-secondary-fixed-variant: '#0b513d'
  tertiary-fixed: '#d5e6df'
  tertiary-fixed-dim: '#bacac3'
  on-tertiary-fixed: '#101e1a'
  on-tertiary-fixed-variant: '#3b4a44'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

This design system is a premium, high-fidelity framework tailored for biotechnology, environmental science, and advanced health-tech platforms. The brand personality is authoritative yet visionary, combining the precision of scientific research with the vitality of the natural world.

The visual style follows a **Modern Corporate** aesthetic with **Glassmorphism** accents. It utilizes a deep, nocturnal foundation to make high-contrast data and biological visualizations "pop." The emotional response is one of deep trust, technical sophistication, and focused clarity. By using a dark-mode-first approach, the system reduces eye strain for long-form data analysis while maintaining a luxury, cutting-edge feel.

## Colors

The palette is anchored in deep charcoals and pure blacks to establish a high-end technical environment. 

- **Primary Emerald (#10b981):** Used for primary actions and active states. While the base emerald is `#064e3b`, the UI utilizes a brighter Emerald 500 for interactive elements to ensure WCAG AA compliance against dark backgrounds.
- **Deep Emerald (#064e3b):** Reserved for subtle branding, container backgrounds, and success indicators.
- **Mint Accents (#ecfdf5):** Used sparingly for high-visibility highlights, data points, and status badges.
- **Neutrals:** The background is a true black (`#0a0a0a`) to maximize OLED efficiency and contrast, with surfaces stepping up to `#121212` and `#1a1a1a` to create depth.

## Typography

The typography system balances modern sans-serifs with a technical monospace for data-heavy contexts.

- **Headlines (Manrope):** Chosen for its balanced, modern proportions. It feels professional yet approachable.
- **Body (Inter):** The workhorse of the system, selected for its exceptional legibility in dark mode and systematic feel.
- **Data & Labels (JetBrains Mono):** Used for coordinates, scientific values, and small metadata labels to evoke a precise, laboratory-grade aesthetic.

All text should maintain a minimum contrast ratio of 4.5:1. Primary body text uses pure white, while secondary supporting text uses a light gray to establish hierarchy.

## Layout & Spacing

The layout utilizes a **Fluid Grid** system based on an 8px rhythm (with 4px half-steps for tight components).

- **Grid:** A 12-column grid for desktop, 8-column for tablet, and 4-column for mobile.
- **Gaps:** Standard gutters are set to 24px to provide ample "breathing room," reinforcing the premium feel.
- **Alignment:** Content is centered in a max-width container of 1280px.
- **Padding:** Vertical section spacing is generous (80px - 120px) to maintain a clean, uncluttered scientific presentation.

## Elevation & Depth

In this dark-themed system, depth is communicated through **Tonal Layers** and **Glassmorphism**, rather than traditional heavy shadows.

- **Surface Tiers:** Lower levels are darker (`#0a0a0a`), while elevated components like cards or modals use lighter shades of charcoal (`#1a1a1a`).
- **Glassmorphism:** Overlays and navigation bars use a semi-transparent background (e.g., `rgba(18, 18, 18, 0.7)`) with a `20px` backdrop blur to maintain context of the content underneath.
- **Outer Glows:** Instead of black shadows, active elements may use a very faint emerald glow (`rgba(16, 185, 129, 0.15)`) to indicate focus or "power-on" states.
- **Borders:** Subtle `1px` borders in `#27272a` are used to define boundaries where tonal shifts are insufficient.

## Shapes

The shape language is **Rounded**, reflecting biological organicism while maintaining structural integrity. 

- **Standard Radius:** 0.5rem (8px) for buttons and input fields.
- **Container Radius:** 1rem (16px) for cards, modals, and large sections.
- **Pill Shapes:** Used exclusively for status tags, badges, and search bars to differentiate them from actionable buttons.

## Components

- **Buttons:** Primary buttons use a solid Emerald fill with black text for maximum punch. Secondary buttons use a ghost style with an Emerald border and text.
- **Cards:** Elevated charcoal backgrounds with a subtle 1px top-border to catch the "light."
- **Inputs:** Darker than the surface they sit on, with a 1px border that turns Emerald on focus.
- **Chips/Badges:** Use the Mint accent (`#ecfdf5`) with low-opacity backgrounds for a "glowing" effect.
- **Lists:** Separated by thin, low-contrast dividers. Hover states involve a slight lightening of the background (`#222222`).
- **Data Visuals:** Charts should utilize the Emerald-to-Mint gradient for continuity. All grid lines in charts should be kept at 10% opacity white.