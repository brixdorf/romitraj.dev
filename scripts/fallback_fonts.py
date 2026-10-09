"""Downloads the free fallback fonts and prepares them for the site.

Visitors normally see the licensed fonts. The free fonts here are a safety net,
used only when a licensed file fails to load or has no drawing for a character.
This script downloads them from the official Google Fonts repository, keeps only
Latin characters, and saves them with their license files in src/assets/fonts/.
It then measures each one against the licensed font it stands in for, and writes
how much to scale it to src/_data/fallbackFonts.json, so the page keeps its shape
if a fallback is ever used.
Run it with: npm run fonts:fallback   (only needed when the font list changes)
"""

import io
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

from fonts import FONT_LIST, ROOT, WEB_DIR, save_as_woff2

OUT_DIR = ROOT / "src" / "assets" / "fonts"
DATA_FILE = ROOT / "src" / "_data" / "fallbackFonts.json"

# The exact snapshot of github.com/google/fonts the files are taken from, so a rerun gives the same files.
SNAPSHOT = "51303ca9e8ac9dcea7b12d307ba568fd0e6fcfca"
REPO = f"https://raw.githubusercontent.com/google/fonts/{SNAPSHOT}/ofl/"

# Each fallback file: where it comes from, and which weight to take from fonts that hold a range of weights.
RECIPES = {
    "anton-regular.woff2": {"name": "Anton", "path": "anton/Anton-Regular.ttf", "weight": None, "license": "anton/OFL.txt"},
    "cormorant-regular.woff2": {"name": "Cormorant", "path": "cormorant/Cormorant[wght].ttf", "weight": 400, "license": "cormorant/OFL.txt"},
    "cormorant-italic.woff2": {"name": "Cormorant", "path": "cormorant/Cormorant-Italic[wght].ttf", "weight": 400, "license": "cormorant/OFL.txt"},
    "inter-tight-regular.woff2": {"name": "Inter Tight", "path": "intertight/InterTight[wght].ttf", "weight": 400, "license": "intertight/OFL.txt"},
    "inter-tight-semibold.woff2": {"name": "Inter Tight", "path": "intertight/InterTight[wght].ttf", "weight": 600, "license": "intertight/OFL.txt"},
}

# Text used to compare how wide two fonts run. Families in CAPS_ONLY are only ever set in capitals.
SAMPLE = (
    "What we know is a drop, what we do not know is an ocean. A lifelong explorer who procrastinates a lot. "
    "Selected projects, latest writing, about the author, and a short letter from the editor."
)
CAPS_ONLY = {"Manuka"}


def download(path: str) -> bytes:
    with urllib.request.urlopen(REPO + urllib.parse.quote(path)) as response:
        return response.read()


def average_width(font: TTFont, text: str, shared: set[int]) -> float:
    """Average width of the text's characters, as a share of the font size."""
    cmap = font.getBestCmap()
    widths = [font["hmtx"][cmap[ord(char)]][0] for char in text if ord(char) in shared]
    return sum(widths) / len(widths) / font["head"].unitsPerEm


def percent(value: float) -> str:
    return f"{value * 100:.1f}%"


def main() -> None:
    fonts = json.loads(FONT_LIST.read_text(encoding="utf-8"))
    if not all((WEB_DIR / font["file"]).is_file() for font in fonts):
        sys.exit("The licensed web fonts are missing. Run npm run fonts first.")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Download, cut down and save each fallback font, with its license.
    for file_name, recipe in RECIPES.items():
        # recalcTimestamp=False keeps the file's own date, so a rerun gives identical files.
        font = TTFont(io.BytesIO(download(recipe["path"])), recalcTimestamp=False)
        if recipe["weight"] is not None:
            font = instancer.instantiateVariableFont(font, {"wght": recipe["weight"]})
            font.recalcTimestamp = False
        save_as_woff2(font, OUT_DIR / file_name)
        license_file = OUT_DIR / f"OFL-{recipe['name'].replace(' ', '')}.txt"
        license_file.write_bytes(download(recipe["license"]))
        print(f"{file_name:<28} {(OUT_DIR / file_name).stat().st_size / 1024:5.1f} KB   license: {license_file.name}")

    # 2. Measure each fallback against the licensed font it stands in for.
    entries = []
    print()
    for font in fonts:
        licensed = TTFont(WEB_DIR / font["file"])
        fallback = TTFont(OUT_DIR / font["fallback"])
        text = SAMPLE.upper() if font["family"] in CAPS_ONLY else SAMPLE
        shared = set(licensed.getBestCmap()) & set(fallback.getBestCmap())
        scale = average_width(licensed, text, shared) / average_width(fallback, text, shared)
        # The licensed font's own heights, restated for the scaled fallback, so lines of text sit at the same height.
        hhea = licensed["hhea"]
        em = licensed["head"].unitsPerEm
        entry = {
            "family": f"{font['family']} Fallback",
            "weight": font["weight"],
            "style": font["style"],
            "file": font["fallback"],
            "madeFrom": RECIPES[font["fallback"]]["name"],
            "sizeAdjust": percent(scale),
            "ascentOverride": percent(hhea.ascent / em / scale),
            "descentOverride": percent(abs(hhea.descent) / em / scale),
            "lineGapOverride": percent(hhea.lineGap / em / scale),
        }
        entries.append(entry)
        print(f"{entry['family']:<26} {font['style']:<7} {font['weight']}  uses {entry['file']:<28} scaled to {entry['sizeAdjust']}")

    DATA_FILE.write_text(json.dumps(entries, indent=2) + "\n", encoding="utf-8")
    print(f"\nDone. Fonts and licenses in {OUT_DIR.relative_to(ROOT)}, measurements in {DATA_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
