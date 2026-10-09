"""Converts the licensed font files into small WOFF2 web fonts.

Reads the list of fonts from src/_data/fonts.json, takes each source file from
../romitraj-private/fonts/source/, keeps only the Latin characters the site needs,
and writes the result to ../romitraj-private/fonts/web/. The source files are only
read, never changed. It also writes a short fingerprint of every converted file to
src/_data/fontVersions.json, so browsers fetch a font again when it changes.
Run it with: npm run fonts
"""

import hashlib
import json
import string
import sys
from pathlib import Path

try:
    from fontTools import subset
    from fontTools.ttLib import TTFont
except ImportError:
    sys.exit("fontTools is missing. Install it once with: python -m pip install -r scripts/requirements.txt")

ROOT = Path(__file__).resolve().parent.parent
FONT_LIST = ROOT / "src" / "_data" / "fonts.json"
VERSIONS = ROOT / "src" / "_data" / "fontVersions.json"
SOURCE_DIR = ROOT.parent / "romitraj-private" / "fonts" / "source"
WEB_DIR = ROOT.parent / "romitraj-private" / "fonts" / "web"

# Character ranges to keep, as Unicode code points (first, last).
KEEP = [
    (0x0020, 0x007E),  # Basic Latin: letters, digits, punctuation
    (0x00A0, 0x00FF),  # Latin-1: accented letters, degree sign, multiplication sign
    (0x0100, 0x017F),  # Latin Extended-A: more accented letters
    (0x2010, 0x2027),  # Hyphens, dashes, curly quotes, bullet, ellipsis
    (0x2030, 0x203A),  # Per mille, primes, single angle quotes
    (0x2044, 0x2044),  # Fraction slash
    (0x20AC, 0x20AC),  # Euro sign
    (0x20B9, 0x20B9),  # Rupee sign
    (0x2122, 0x2122),  # Trade mark sign
    (0x2190, 0x2199),  # Arrows
    (0x2212, 0x2212),  # Minus sign
]

# Everyday characters. If a font has no drawing for one of these, the report says so,
# because the browser will then borrow that character from the fallback font.
EVERYDAY = string.ascii_letters + string.digits + ".,;:!?'\"-()&/@" + "’“”–…"


def save_as_woff2(font: TTFont, target: Path) -> None:
    """Cuts an opened font down to the KEEP ranges and saves it as WOFF2."""
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]  # keep kerning, ligatures and every other OpenType feature
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=[code for first, last in KEEP for code in range(first, last + 1)])
    subsetter.subset(font)
    subset.save_font(font, str(target), options)


def missing_everyday(font_file: Path) -> str:
    """Lists the everyday characters a font file cannot draw."""
    covered = TTFont(font_file).getBestCmap()
    return " ".join(char for char in EVERYDAY if ord(char) not in covered)


def fingerprint(font_file: Path) -> str:
    """A short code that changes whenever the file's contents change."""
    return hashlib.sha256(font_file.read_bytes()).hexdigest()[:8]


def main() -> None:
    if not SOURCE_DIR.is_dir():
        sys.exit(f"Font source folder not found: {SOURCE_DIR}")
    fonts = json.loads(FONT_LIST.read_text(encoding="utf-8"))
    WEB_DIR.mkdir(parents=True, exist_ok=True)

    missing = [font["source"] for font in fonts if not (SOURCE_DIR / font["source"]).is_file()]
    if missing:
        sys.exit("Missing source files:\n  " + "\n  ".join(missing))

    versions = {}
    for font in fonts:
        source = SOURCE_DIR / font["source"]
        target = WEB_DIR / font["file"]
        # recalcTimestamp=False keeps the file's own date, so converting twice gives identical files.
        opened = TTFont(source, recalcTimestamp=False)
        before = len(opened.getGlyphOrder())
        save_as_woff2(opened, target)
        versions[font["file"]] = fingerprint(target)
        print(
            f"{font['file']:<32} {source.stat().st_size / 1024:6.1f} KB -> {target.stat().st_size / 1024:5.1f} KB"
            f"   glyphs {before} -> {len(opened.getGlyphOrder())}"
        )
        gaps = missing_everyday(target)
        if gaps:
            print(f"    no drawing for: {gaps}")

    VERSIONS.write_text(json.dumps(dict(sorted(versions.items())), indent=2) + "\n", encoding="utf-8")

    wanted = {font["file"] for font in fonts}
    extra = sorted(path.name for path in WEB_DIR.glob("*.woff2") if path.name not in wanted)
    if extra:
        print("\nNot in fonts.json, left untouched: " + ", ".join(extra))
    print(f"\nDone. {len(fonts)} fonts written to {WEB_DIR}")
    print(f"Fingerprints written to {VERSIONS.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
