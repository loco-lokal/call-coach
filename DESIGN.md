---
name: "Call Coach"
description: "Paper, ink, blue, and green: the replacement Atuin reference adapted for focused conversations."
colors:
  page: "#fefefe"
  surface: "#fefefe"
  raised: "#e6e6ec"
  notes: "#f3f3f7"
  ink: "#120e20"
  muted: "#69647c"
  placeholder: "#69647c"
  disabled: "#777284"
  line: "#d5d3dd"
  control-line: "#7b758b"
  accent: "#004dce"
  accent-hover: "#003da4"
  on-accent: "#fefefe"
  green: "#4ef992"
  on-green: "#120e20"
  selected: "#eaf0ff"
  success: "#17683b"
  success-bg: "#e4f8ec"
  warning: "#795610"
  warning-bg: "#fcf3de"
  error: "#a62d35"
  error-bg: "#fceef0"
  danger-line: "#bc737a"
  skeleton: "#d5d3dd"
typography:
  headline:
    fontFamily: "\"Manrope Variable\", \"Manrope\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline-narrow:
    fontFamily: "\"Manrope Variable\", \"Manrope\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "38px"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "\"Manrope Variable\", \"Manrope\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  title-narrow:
    fontFamily: "\"Manrope Variable\", \"Manrope\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  title-small:
    fontFamily: "\"Manrope Variable\", \"Manrope\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  component-title:
    fontFamily: "\"Manrope Variable\", \"Manrope\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "\"Manrope Variable\", \"Manrope\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  conversation:
    fontFamily: "\"Manrope Variable\", \"Manrope\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 400
    lineHeight: 1.8
    letterSpacing: "0"
  conversation-narrow:
    fontFamily: "\"Manrope Variable\", \"Manrope\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.85
    letterSpacing: "0"
  dialog-title:
    fontFamily: "\"Manrope Variable\", \"Manrope\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  label:
    fontFamily: "\"Manrope Variable\", \"Manrope\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  button:
    fontFamily: "\"Manrope Variable\", \"Manrope\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  field:
    fontFamily: "\"Manrope Variable\", \"Manrope\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  field-narrow:
    fontFamily: "\"Manrope Variable\", \"Manrope\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.6
  node-label:
    fontFamily: "\"Manrope Variable\", \"Manrope\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  badge:
    fontFamily: "\"Manrope Variable\", \"Manrope\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
  wordmark:
    fontFamily: "\"Manrope Variable\", \"Manrope\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.6
    letterSpacing: "-0.035em"
  call-identity:
    fontFamily: "\"Manrope Variable\", \"Manrope\", ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.6
rounded:
  control: "12px"
  panel: "40px"
  action: "20px"
  panel-phone: "24px"
  editor-node-local: "12px"
  dialog-local: "24px"
  badge-local: "4px"
  navigation-local: "6px"
  loading-bar-local: "3px"
  word-outline-local: "0.3em"
spacing:
  "4": "4px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "28": "28px"
  "32": "32px"
  "40": "40px"
  "48": "48px"
  "56": "56px"
  "80": "80px"
components:
  button-primary:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    typography: "{typography.button}"
    rounded: "{rounded.action}"
    padding: "9px 20px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.error}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
  button-primary-active:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-accent}"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.field}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  nav-item-active:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.accent}"
    rounded: "{rounded.navigation-local}"
    padding: "10px 12px"
  badge-green:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success}"
    typography: "{typography.badge}"
    rounded: "{rounded.badge-local}"
    padding: "3px 8px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  branch-option-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.accent}"
    rounded: "{rounded.control}"
    padding: "14px 18px"
  editor-node:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.editor-node-local}"
  heading-word:
    typography: "{typography.title}"
    rounded: "{rounded.word-outline-local}"
    padding: "0.02em 0.2em 0.07em"
  review-footer:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.page}"
    padding: "32px"
---

# Design System: Call Coach

## Overview

**Creative North Star: "Paper, color, and regular type"**

The user's replacement Atuin reference governs this library: paper surfaces, violet-black ink, cobalt blue, bright green, mist panels, and large regular-weight headings. Thin outlines enclose selected heading words and primary actions. Broad color fields carry the graphic identity while conversation reading stays white, spacious, and quiet. This replaces the earlier inaccurate dark interpretation.

Call Coach uses locally hosted Manrope as the explicit substitute for the reference's licensed Px Grotesk, whose files were not supplied. It adapts the reference's typography and geometry to an operating component library, without importing the studio homepage's copy, artwork, navigation, or functions. The artifact still demonstrates synthetic, page-local behavior; full application screens and backend workflows remain behind user feedback.

**Key Characteristics:**

- Paper reading surfaces and violet-black ink with cobalt action outlines.
- Regular Manrope headings with selected words enclosed by thin capsules.
- Broad blue editor field, mist forms, and an ink footer with green actions.
- Large panel corners, smaller white editor nodes, and shaped outline buttons.
- Preserved 22px/20px conversation reading, open leading, and independent notes.

Authority: `docs/atuin-design-reference.md`, `docs/component-review.md`, and `PRODUCT.md`. Extraction: current `src/styles/tokens.css`, `src/app/globals.css`, `src/app/layout.tsx`, and `src/components/`. The original seed (`1d46a936acd44a57`) is historical provenance; the latest explicit reference supersedes its visual direction. Frontmatter is normative. Sidecar tonal strips are generated previews, not new CSS tokens.

## Colors

### Primary

**Cobalt (`accent`)** defines primary outlines, action text, selected paths, ordinary focus, and the editor field. **Deep Cobalt (`accent-hover`)** supplies pressed primary fill. **Paper on Blue (`on-accent`)** serves text on the blue field and primary hover/pressed fill. **Selected Blue Wash (`selected`)** marks selected navigation, branches, and outcomes.

### Secondary

**Bright Green (`green`)** marks the circular add icon, footer action, and editor perimeter focus/selection on blue. **Ink on Green (`on-green`)** supplies its readable foreground. It is distinct from the darker semantic success text color.

### Neutral

**Paper (`page`, `surface`)** is the page and conversation/field surface. **Ink (`ink`)** carries primary text and the footer field. **Mist (`raised`)** groups forms, quiet badges, hover, and disabled controls. **Notes Paper (`notes`)** gently separates notes. **Muted Ink (`muted`)** carries support copy; `placeholder` and `disabled` define their named roles. `line` separates regions, `control-line` gives fields and interactive nodes stronger boundaries, and `skeleton` fills loading bars.

Semantic success, warning, and error retain their own readable inks and pale backgrounds. `danger-line` supports destructive boundaries. They explain state through text as well as color.

**The Contextual Contrast Rule.** Use blue on paper, paper on blue, and green for editor perimeter focus or selection against blue; keep child Edit focus blue on its white node.

## Typography

**Display and Body Font:** locally hosted Manrope Variable, with Manrope and the source's UI sans-serif fallbacks. This is the approved implementation substitute for Px Grotesk. The font import is in `src/app/layout.tsx`; no Px Grotesk asset is present.

Headings, body, actions, badges, labels, and selected navigation use regular weight. The wordmark retains its semantic weight (650); call identity and avatar text, alert titles, and palette names retain local weight (500). These exceptions do not change the regular display system. Heading hierarchy comes from scale and whitespace.

The main heading is the frontmatter headline role and becomes (38px) below (600px). Section headings become (26px) at that breakpoint. Ordinary component headings, dialog headings, labels, and metadata retain their observed smaller roles. The source also has a local typography specimen (28px). The word capsule inherits its heading weight, has a thin current-color stroke, and uses leading (1.15); it is a text emphasis device, not an interactive chip.

Conversation copy has maximum measure (50ch), preserved line breaks, safe wrapping, and leading (1.8). At maximum width (899px) it becomes (1.25rem / 20px) with leading (1.85). Switch headings share its size with leading (1.6). Introduction copy has measure (65ch) and leading (1.75). Desktop notes are (15px) with leading (1.8); mobile fields/notes are (18px). This is a fixed application role scale, not the reference homepage's sampled display scale.

**The Reading Space Rule.** Preserve the larger conversation scale, open leading, short measure, and additional reading padding.

## Layout

Frontmatter records reused distances without introducing new CSS spacing variables. Conversation areas retain padding (40px), node gap (40px), and node separation (36px). Compact desktop reading padding becomes (32px); narrow reading padding becomes (32px 24px), with node gap (36px). Form specimens use padding (28px 32px 32px), then contract responsively. There is no single universal panel padding.

The gallery shell caps at (1680px), with sidebar (232px), sticky header (72px), and main content cap (1360px). Main padding is (48px 52px 0). Desktop section separation is (80px). The call uses reading/notes columns (2fr / 1fr) with notes minimum (220px). Its sticky header keeps End call reachable. These gallery compositions do not prescribe every future application screen.

- Maximum width (1150px): sidebar and spacing contract; foundations stack.
- Maximum width (899px): the header becomes (64px), section navigation becomes a horizontal scroll strip, the call becomes one column, and notes open in a full-screen dialog backed by the same state. The call header's sticky offset is (124px).
- Maximum width (599px): form/editor columns stack, main gutters become (16px), major work panels use the phone radius, fields enlarge, and section separation becomes (40px).
- Minimum width (1600px): horizontal content gutters expand to (72px).
- Devices without hover retain node testing and minimum control targets (44px). Compact desktop overrides are not a touch-target rule; native radio indicators remain inside larger labeled targets.

## Elevation & Depth

Paper, mist, cobalt, and ink fields establish hierarchy without decorative elevation. Conversation panels keep fine boundaries; forms and the editor field have no enclosing stroke. White editor nodes retain their stronger boundary. The footer is an ink field with broad top corners. Dialogs and the preview message share the source shadow in the sidecar; the dialog backdrop uses translucent ink. Headers are opaque.

**The Color Field Rule.** Keep conversation reading white, form specimens mist, editor specimens blue with white nodes, and the footer ink with green links.

Button background, text, and border colors transition over the source state duration. The primary moves down (1px) on press. Loading uses a linear spinner; section scrolling is smooth. The notes dialog has no entrance animation. Reduced motion disables smooth scrolling and minimizes animation/transition duration. No portfolio hero, marquee, or atmospheric animation is implemented.

## Shapes

Shared controls use the control radius; primary actions use the larger action radius. Major panels use broad desktop corners and explicit phone corners. Editor nodes stay locally (12px); standard dialogs use local (24px) corners. Frontmatter records these local exceptions rather than pretending every card inherits the panel radius.

Word capsules use an em-based radius, thin current-color stroke, and compact inline padding. Badge, navigation, and loading-bar corners retain their small local values. The footer action uses local corners (16px). Circular forms belong to avatars, connection ports, and the green add mark. Mobile notes are square and full-screen. Most field and container boundaries are single-pixel; the primary outline is deliberately stronger (2px).

## Components

### Buttons

Primary is a transparent, blue-text action with a blue outline and action corners. Hover fills blue and changes text to paper; press uses deeper blue and a small downward response. Secondary is paper with ink and a control boundary. Ghost is muted on transparency; secondary and ghost hover use mist. Danger combines paper, error text, and a soft destructive boundary. Base minimum height is (44px), with compact contextual desktop overrides.

Ordinary focus is a blue outline (2px) offset (4px). The skip link uses blue with paper text. Disabled controls use mist and disabled text; busy buttons prevent activation and add a spinner plus `aria-busy`.

### Chips

Badges are informational labels, with regular text and neutral or semantic pale fills. They are not selectable chips. Outlined heading words are typographic emphasis and are not controls.

### Cards / Containers

The broad conversation panel stays paper; forms use mist; the blue editor field contains smaller white nodes. Editor nodes retain type, content, explicit Edit, optional Start badge, and explanatory validation text. Selection, article focus, and the external node-test action use green perimeter outlines offset (3px), maintaining contrast against the blue field. The child Edit action retains ordinary blue focus on white. Hover, focus, or selection reveals testing; touch and narrow layouts keep it visible.

### Inputs / Fields

Paper fields have persistent labels, control boundaries, associated hints/errors, and regular text. Required status appears in words. Invalid inputs expose `aria-invalid` and an error boundary; disabled fields use mist. Desktop notes intentionally use a transparent borderless textarea on the notes surface with focus offset (6px).

### Navigation

Quiet section links use muted ink; current links use blue on the selected blue wash with an arrow and `aria-current`. Hover uses mist. At the middle breakpoint the same links scroll horizontally and hide arrows. The footer's green outlined Back to top action fills green with ink text on hover. Call Coach retains its own product navigation.

The Call Coach wordmark replaces its first capital C with a cobalt handset and the o in Coach with a cobalt rotary dial and green hub. The handset has a slim curved grip and broad, angled speaker housings with transparent grille slots, so it reads as a physical receiver. All remaining letters are outlined Manrope at weight 650 in ink. Use the transparent vector in `public/brand/call-coach.svg` on paper surfaces: 184px in navigation and 248px on login, with an accessible Call Coach label. The artwork has no external font dependency; monochrome and transparent PNG exports accompany it.

### Conversation and branches

Talking point and Switch retain icons with visible labels. Questions use Talking point text; node-editor connection dropdowns are omitted in favor of canvas handles. Full-width branches have minimum height (56px); selection uses pale blue, blue text/boundary, a check, and `aria-pressed`. The specimen reveals the next talking point while preserving independent notes. Back, Next, End, and evaluation remain explicit page-local interactions.

Outgoing canvas handles are green 28px plus buttons. Clicking a handle opens a compact paper popover with Talking point and Switch choices, plus Connect to existing node. The popover lives in the browser's top layer, keeps a 12px viewport margin, uses 44px choice rows and visible blue keyboard focus, and dismisses with Escape or an outside click. Switch outputs disable another Switch with a textual explanation. Added nodes connect in one draft change; inserted nodes retain the previous path. Dragging the same handle connects to an existing node; a drag never opens the popover.

### Dialogs and feedback

Native dialogs are labeled, trap focus, close on Escape, block page scrolling, and restore prior focus. Their standard width is bounded (480px); mobile notes fill the screen and retain End call. Save states, alerts, validation, empty/loading examples, and records pair color with explanatory text and icons where implemented. The preview message uses ink with paper text and a green focus outline.

## Do's and Don'ts

### Do:

- **Do** use the current paper, ink, blue, green, mist, and muted palette.
- **Do** preserve regular heading weights and the intentional semantic weights of brand and identity text.
- **Do** keep editor perimeter focus and selection green on blue, with child Edit focus blue on white.
- **Do** preserve conversation wrapping, independent notes, and reachable End call controls.
- **Do** retain labeled fields, textual errors, visible focus, touch alternatives, reduced motion, and sample labels.

### Don't:

- **Don't** restore the superseded dark palette or lime pill primary action.
- **Don't** claim the substituted Manrope font is Px Grotesk.
- **Don't** place decorative artwork behind conversation or form content.
- **Don't** import the reference studio's homepage copy, navigation, artwork, or functions.
- **Don't** imply page-local preview interactions are saved to a server.

Not canonized or repaired: no material findings remained after the independent ship review. `--color-canvas` and `--color-graphic` are unused declarations, so they receive no normative role or preview metadata. Px Grotesk is referenced but not supplied; Manrope is the recorded substitution. Proposed studio assets and homepage behavior are not implemented. The direction contract mentions mobile panel motion, while the current notes dialog has no entrance animation. This remains a component milestone awaiting feedback.
