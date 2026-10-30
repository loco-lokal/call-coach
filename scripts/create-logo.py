"""Rebuild the outlined wordmark. Requires fonttools[woff] and the installed Manrope font."""
from pathlib import Path
from math import cos, sin, radians
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

root = Path(__file__).resolve().parent.parent
font = TTFont(root / "node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2")
font = instantiateVariableFont(font, {"wght": 650}, inplace=True)
glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
out = root / "public/brand"
out.mkdir(parents=True, exist_ok=True)

def artwork(monochrome=False):
    ink = "#120e20"
    blue = ink if monochrome else "#004dce"
    green = ink if monochrome else "#4ef992"
    parts = [f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 116" fill="none" role="img" aria-labelledby="title desc">
  <title id="title">Call Coach</title>
  <desc id="desc">A phone handset forms the first C. A rotary telephone dial replaces the o in Coach.</desc>
  <!-- A slim receiver grip joins two broad, angled speaker housings. -->
  <g fill="{blue}">
    <path d="M38 26C20 31 13 44 13 57S20 83 38 88" stroke="{blue}" stroke-width="9" stroke-linecap="round" fill="none"/>
    <!-- Speaker slots are true transparent cutouts, not painted highlights. -->
    <path transform="translate(46 34) rotate(45)" fill-rule="evenodd" d="M-10-10H10a5 5 0 0 1 5 5V5a5 5 0 0 1-5 5H-10a5 5 0 0 1-5-5V-5a5 5 0 0 1 5-5ZM4-4a1.25 1.25 0 0 1 2.5 0V4A1.25 1.25 0 0 1 4 4ZM9-4a1.25 1.25 0 0 1 2.5 0V4A1.25 1.25 0 0 1 9 4Z"/>
    <path transform="translate(46 80) rotate(-45)" fill-rule="evenodd" d="M-10-10H10a5 5 0 0 1 5 5V5a5 5 0 0 1-5 5H-10a5 5 0 0 1-5-5V-5a5 5 0 0 1 5-5ZM4-4a1.25 1.25 0 0 1 2.5 0V4A1.25 1.25 0 0 1 4 4ZM9-4a1.25 1.25 0 0 1 2.5 0V4A1.25 1.25 0 0 1 9 4Z"/>
  </g>''']
    x = 72.0
    for char in "all Coach":
        glyph = glyphs[cmap[ord(char)]]
        if char == "o":
            cx, cy, r = x + 30.7, 67.0, 28.5
            # All apertures are true cutouts, including in the transparent export.
            circles = [(cx, cy, 10.4)]
            circles += [(cx + 20.1*cos(radians(-90+i*36)), cy + 20.1*sin(radians(-90+i*36)), 3.15) for i in range(10)]
            disk = f"M{cx+r:.3f} {cy:.3f}a{r} {r} 0 1 0 {-2*r} 0a{r} {r} 0 1 0 {2*r} 0Z"
            for px, py, pr in circles:
                disk += f"M{px+pr:.3f} {py:.3f}a{pr} {pr} 0 1 0 {-2*pr} 0a{pr} {pr} 0 1 0 {2*pr} 0Z"
            parts.append(f'  <!-- Rotary-dial o, aligned to the lowercase x-height. -->\n  <path fill="{blue}" fill-rule="evenodd" d="{disk}"/>')
            if not monochrome:
                parts.append(f'  <circle cx="{cx:.3f}" cy="{cy:.3f}" r="7.5" fill="{green}"/>')
        elif char != " ":
            pen = SVGPathPen(glyphs)
            glyph.draw(TransformPen(pen, (0.05, 0, 0, -0.05, x, 94)))
            parts.append(f'  <path fill="{ink}" d="{pen.getCommands()}"/>')
        x += glyph.width * 0.05 - (2 if char != " " else -4)
    parts.append("</svg>\n")
    return "\n".join(parts)

(out / "call-coach.svg").write_text(artwork())
(out / "call-coach-mono.svg").write_text(artwork(True))
print("Created color and monochrome outlined SVG wordmarks.")
