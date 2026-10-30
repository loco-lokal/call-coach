# Call Coach wordmark

The first capital C is a phone handset, with a slim curved grip, broad angled earpiece/mouthpiece housings and transparent speaker slots. The o in Coach is a rotary dial with ten finger holes and a green hub. The other letters are outlined Manrope at weight 650, matching the application's brand typography.

- `call-coach.svg`: primary, transparent, cobalt/ink/green.
- `call-coach-mono.svg`: single ink color, transparent with true dial cutouts.
- `call-coach.png`: transparent PNG at 1536 × 348 pixels.

Use the primary logo on a white or very light background. Keep clear space of at least half the dial diameter around the artwork and use a minimum width of 160px so the dial remains legible. The SVGs contain paths, not live fonts, and scale without external dependencies.

To rebuild, install `fonttools[woff]`, run `python3 scripts/create-logo.py` from the project, then rasterize the primary SVG with Sharp. The Manrope source is supplied by the installed `@fontsource-variable/manrope` package under its SIL Open Font License.
