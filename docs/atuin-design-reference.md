<!-- User-supplied replacement reference, 29 October 2026. It informs the
component library visual language; homepage content, assets and navigation do
not replace Call Coach product requirements. See component-review.md. -->

# Atuin Media — Design Reference

Source: [atuin.media English homepage](https://www.atuin.media/en/)  
Inspected: 29 October 2026  
Scope: homepage, its content sections, footer, and expanded main navigation.

This document describes the live site's visual system and provides practical guidance for creating a related design. Computed CSS values were inspected at a **680 × 908 CSS-pixel viewport**. Measurements below are samples at that width, not universal desktop values. Colors and the font family are verified from computed styles. Layout and material descriptions come from visual inspection. Suggested implementation choices are explicitly marked.

## 1. Design direction

The site presents a creative software studio through large, regular-weight typography, abundant empty space, expressive blue 3D artwork, and a small set of bold geometric treatments. Its personality is technical, playful, confident, and approachable.

The strongest identifying features are:

- A nearly white canvas with deep, subtly violet-black text.
- A large glossy blue ribbon/loop dominating the opening viewport.
- Oversized headings with a selected word enclosed in a thin rounded outline.
- Broad blue and dark panels with unusually large rounded corners.
- Bright green circular plus signs on image links.
- Flat editorial image-and-text layouts, with little conventional card chrome.
- A bright green technology mosaic followed by a deep dark contact footer.

Typography, geometry, and artwork establish the hierarchy. Shadows and decorative borders play little part in the overall appearance.

## 2. Color system

| Role | Verified CSS color | Application |
| --- | --- | --- |
| Paper | `#FEFEFE` | Main background; light text on blue/dark panels; fact capsules |
| Ink | `#120E20` | Default text, service panel, footer background |
| Blue | `#004DCE` | Facts and team panels; outlined action links |
| Green | `#4EF992` | Technology section, footer contact actions, image-link accents |
| Mist | `#E6E6EC` | Work section background, date tags, navigation overlay, testimonial cards |
| Muted ink | `#69647C` | Supporting descriptions and small group labels |

The hero artwork contains a broader blue range: luminous electric-blue edges, cobalt surfaces, and deep navy shaded areas. These are material and lighting effects rather than a single flat background token.

**Usage guidance:** use large uninterrupted color fields. Keep most reading surfaces white or mist. Reserve blue for prominent statements and green for interaction accents and the technology feature. Outline colors follow their context: ink on light backgrounds, paper on blue, and green on dark.

## 3. Typography

**Verified family:** `"Px Grotesk", sans-serif`. Sampled text uses weight `400`, including headings. The studio's logo is a separate custom wordmark; do not approximate it with ordinary body type.

The typography has simple grotesque forms, open spacing, and a direct editorial tone. Headings rely on scale rather than bold weight. Body copy is relatively large, with compact but readable leading. Dates, the menu control, and small hero hints use uppercase; most headings and body copy use sentence case.

| Text role | Sample size | Sample line height | Treatment |
| --- | --- | --- | --- |
| Hero statement | 83.40 px | 104.25 px | Regular, two-line composition |
| Service ribbon | 109.74 px | 142.66 px | Oversized uppercase, horizontally clipped |
| Major section heading | 54.87 px | 63.10 px | Regular; one word outlined |
| Fact value / footer invitation | 43.90 px | 50.48 / 54.87 px | Large, regular |
| Expanded primary navigation | 37.18 px | 48.33 px | Vertical list; active link underlined |
| Card title / main action | 24.14 px | 27.76 px | Regular |
| Main descriptive paragraph | 22.94 px | 28.67 px | Approximately 1.25 line height |
| Navigation secondary link | 19.92 px | 23.90 px | Social/contact navigation |
| Project summary | 18.11 px | 22.63 px | Muted ink |
| Date tag | 18.11 px | 20.82 px | Uppercase |
| Small labels | Approximately 15–17 px | Approximately 18–20 px | Group labels and metadata |

**Implementation suggestion:** use fluid type scales with sensible minimums and maximums. Preserve the relative jump between body copy, section headings, and the hero rather than copying the sampled pixel values at every viewport. Use Px Grotesk only with the appropriate font rights; a substitute should have similar width and regular-weight proportions.

## 4. Layout and spacing

The homepage is a long sequence of distinct editorial sections. Wide image surfaces and broad panels alternate with quieter text areas. Content is aligned to a consistent outer gutter, while some panels sit much closer to the viewport edge.

Measured at the inspected width:

- Main gutter: approximately **33.36 px** on each side, leaving a **613.28 px** content width.
- Rounded-panel outer inset: approximately **8.34 px**.
- Large panel radius: approximately **50.04 px**.
- Common internal spacing samples: **25.02 px**, **33.36 px**, and **66.72 px**.
- Standard section-heading offset from a section's top: approximately **88 px** in sampled news/work sections.
- Hero region: approximately **888 px** tall in the sampled viewport.

The rhythm is generous: section titles, supporting text, media, and calls to action each have room to breathe. Avoid compressing the page into a dense dashboard layout. Layouts are not uniformly symmetrical: the introduction uses an offset second paragraph, the footer uses uneven columns, and the technology mosaic uses cells of varying sizes.

## 5. Homepage composition

### Header and hero

- Custom dark wordmark at the upper left.
- `MENU` and a small three-line icon at the upper right.
- The menu control remains available while scrolling; its computed position is fixed.
- Opening statement: “We turn ideas into software,” set very large over the central artwork. “Software” is enclosed in a thin, rounded outline.
- A glossy blue three-dimensional open loop/ribbon occupies most of the opening composition. It overlaps the statement, with soft luminous/refraction-like details where artwork and text meet.
- Small `SINCE 2010` and `SCROLL DOWN` labels sit near opposite bottom corners.
- The opening viewport has no dense paragraph or large filled CTA competing with the artwork.

### Introduction

Two substantial paragraphs explain the studio's approach. The first begins at the main left gutter; the second is indented. A thin horizontal rule beneath the first paragraph meets a vertical rule beside the second, producing an architectural right-angle detail.

### Services

A deep ink panel with large rounded corners contains an oversized, continuously moving uppercase service ribbon. Text extends beyond and is clipped by the panel edges. A smaller explanatory paragraph sits below the ribbon. Service names are separated by small graphic marks.

### Company facts

A blue rounded panel contains a centered introductory line and white capsules for key values. At the inspected width, three values occupy the first row and the wide location capsule spans the row beneath. Supporting labels sit below their capsules in white. Values are dark, large, and regular-weight.

### Recent news

A white section uses a large “Recent news” heading, with “news” outlined. A short subtitle precedes two side-by-side entries at the inspected width. Each entry contains a pale rounded date tag, rectangular image, green circular plus affordance, text excerpt, and a LinkedIn text link. A centered blue outlined “Show all news” action closes the section.

### Featured work

A full-width mist background distinguishes the portfolio area. “Featured work” repeats the outlined-word heading treatment. Work entries use broad rectangular imagery, a title immediately below, and a smaller muted summary. The inspected layout stacks the projects in one column. Images keep straight corners and carry a green plus circle near the lower right. A centered blue outline action leads to all work.

### Team invitation

A blue rounded panel contains the white “Human made” heading, with “made” outlined, a large descriptive paragraph, and a white outline “The Team” action aligned toward the lower right.

### Clients and testimonials

The client section returns to white and repeats the outlined-word heading style. Client marks are arranged in repeating horizontal bands; the page contains repeated logo lists. Testimonials follow as substantial mist-colored rounded cards, with prominent quotation text, an arrow marker, and smaller attribution details. Preserve the distinction between logo display and testimonial reading content.

### Technology feature

“Tech stack” introduces a bright green field containing a tightly packed mosaic of black technology logos. Thin dark grid lines separate cells. Mixed cell sizes create a dense, irregular but structured composition. This is a graphic feature rather than a uniform set of floating cards. The sampled grid has 14 narrow base columns and 1 px gaps.

### Footer

A large deep ink footer begins with a centered invitation and an oversized green outlined “Tell us about it!” email link. There is substantial vertical breathing room before the information columns.

The lower area groups contact links, office address, menu links, social profiles, legal links, and language switching. Labels are small and muted; links and address text are larger and light-colored. Phone and email use green outlined rounded links. The active page link is underlined. Copyright sits at the bottom left.

## 6. Reusable components

### Outlined word capsule

Used inside major headings to emphasize one word. Keep the font weight unchanged, use a thin outline, and give the word enough horizontal padding. The shape is a rounded rectangle closely fitted to the word rather than an independent badge. Match the outline to the surrounding text color. Examples: “news,” “work,” “made,” and “clients.”

### Outlined action link

- Transparent background with a **2 px** colored border.
- Regular text in the same color as the border.
- A rounded rectangle with relatively tight vertical padding.
- Sample standard action: **24.14 px** text, **12.07 px** vertical and **24.14 px** horizontal padding, **24.14 px** radius.
- Sample smaller contact action: **19.92 px** text, **9.96 px** vertical and **19.92 px** horizontal padding, **19.92 px** radius.
- Large footer variant: **43.90 px** text with a more compact vertical inset.

### Image link / project entry

The image carries most of the visual weight. A small bright green circular control containing a dark plus sign sits inside its lower-right corner. The title and description sit directly on the section background, without an enclosing elevated surface. Preserve generous spacing between entries.

### Date tag

Mist background, ink uppercase text, compact rounded rectangle. Sample padding is **9.05 × 18.11 px**, with a **13.58 px** radius.

### Testimonial card

Mist surface with a large corner radius, no prominent shadow. Sample radius is **36.21 px** and padding is approximately **24.14 × 30.18 px**. Quotes are much larger than attribution text.

## 7. Navigation and motion

The expanded menu is a full-viewport mist-colored surface. At the inspected width, social links and blue outlined contact actions occupy the left column; the larger primary page links occupy the right. The language option sits near the lower left. The top-right toggle becomes `CLOSE` with an X icon. Primary destinations are Home, News, Work, Play, Team, and Contact.

Verified motion properties:

| Element | Observed computed behavior |
| --- | --- |
| Navigation panel | Transform transition, `0.54s cubic-bezier(0.76, 0, 0.24, 1)` |
| Menu control | Color transition, `0.2s ease-in-out` |
| Service ribbon | `ribbon-loop`, `50s linear infinite` |

The menu opening also visibly shifts the underlying page. The overall motion language combines deliberate panel movement with slow continuous graphic movement. Exact hero rendering technology, pointer response, hover behavior, and client-band timing were not verified; do not treat those as confirmed implementation requirements.

## 8. Asset direction

- **Brand:** custom wordmark, used with generous clear space.
- **Hero:** glossy cobalt/electric-blue 3D ribbon with real depth, shaded internal faces, and luminous edges.
- **Portfolio:** authentic project photography and interface imagery, shown in wide rectangular frames.
- **News:** real event photographs and graphic images.
- **Client/technology marks:** predominantly monochrome presentations with consistent optical sizing; technology marks appear black over green.
- **Icons:** restrained line and geometric symbols: menu, close, plus, arrow, and service separators.

For a new implementation, supply original or properly licensed artwork and marks. A flat blue circle or generic gradient would lose much of the reference's visual character.

## 9. Responsive and accessibility guidance

Only the 680 px-wide rendering was inspected. Exact phone and wide-desktop breakpoints, alternative layouts, and keyboard behavior were not tested.

**Suggested implementation requirements:**

- Use fluid gutters and typography while retaining readable lower bounds.
- Collapse the news and footer columns when their content becomes cramped.
- Let the facts and navigation layouts reflow without clipping contact actions.
- Preserve the hero's statement legibility when the artwork overlaps it.
- Keep the hero headline available as semantic DOM text, even if a canvas or WebGL layer handles visual effects.
- Use a semantic heading hierarchy; visual size alone should not determine heading level.
- Give image links descriptive accessible names; do not rely on a plus symbol alone.
- Make all actions keyboard-accessible and provide visible focus states.
- Support Escape, focus management, and focus return for the navigation overlay.
- Respect `prefers-reduced-motion` for looping ribbons, panel movement, and animated artwork.
- Check contrast for muted small text and labels on saturated surfaces.

## 10. Suggested implementation tokens

The colors and font family below are verified. Rounded spacing values are convenient approximations of the inspected rendering, not extracted source variables.

```css
:root {
  --color-paper: #fefefe;
  --color-ink: #120e20;
  --color-blue: #004dce;
  --color-green: #4ef992;
  --color-mist: #e6e6ec;
  --color-muted: #69647c;

  --font-body: "Px Grotesk", sans-serif;
  --font-weight-normal: 400;

  /* Approximate values at the inspected 680 px width. */
  --page-gutter: 33px;
  --panel-inset: 8px;
  --panel-radius: 50px;
  --quote-radius: 36px;
  --outline-width: 2px;

  --ease-panel: cubic-bezier(0.76, 0, 0.24, 1);
  --duration-menu: 540ms;
  --duration-color: 200ms;
}
```

## 11. Fidelity checklist

- Preserve the regular-weight grotesque typography and strong differences in scale.
- Pair the restrained editorial layout with one expressive 3D hero asset.
- Use outlined words consistently in major section headings.
- Keep large panels broadly rounded and project imagery mostly rectangular.
- Maintain the white → dark → blue → white → mist → blue → white → green → dark section rhythm.
- Retain green plus circles and contextual outline actions as recognizable interaction cues.
- Allow substantial space around headings, media, and the footer invitation.
- Treat unverified responsive and interaction details as design decisions to validate, rather than facts about the source site.
