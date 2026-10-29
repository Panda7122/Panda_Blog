"""重新產生首頁標語用的手寫字型子集（content/public/fonts/tagline-hand.woff）。

改了 frontend/src/config.ts 的 tagline 之後執行：
    pip install fonttools
    python3 scripts/subset_tagline_font.py

字型來源：辰宇落雁體 https://github.com/Chenyu-otf/chenyuluoyan_thin（OFL-1.1）
OFL 的保留字型名稱條款規定修改版不能沿用原名，所以子集改名為 "Tagline Hand"。
"""
import re
import tempfile
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FONT_URL = 'https://github.com/Chenyu-otf/chenyuluoyan_thin/releases/download/v2.0/ChenYuluoyan-2.0-Thin.ttf'
OUT = ROOT / 'content/public/fonts/tagline-hand.woff'
NEW_NAMES = {1: 'Tagline Hand', 3: 'Tagline Hand subset', 4: 'Tagline Hand', 6: 'TaglineHand', 16: 'Tagline Hand', 21: 'Tagline Hand'}


def main() -> None:
    config = (ROOT / 'frontend/src/config.ts').read_text(encoding='utf-8')
    tagline = re.search(r"tagline:\s*'([^']*)'", config).group(1)
    text = tagline + '，。、！？'
    print(f'tagline: {tagline}')

    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / 'source.ttf'
        print('downloading 辰宇落雁體 …')
        urllib.request.urlretrieve(FONT_URL, src)
        font = TTFont(src)

    options = subset.Options()
    options.flavor = 'woff'
    options.layout_features = ['*']
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=text)
    subsetter.subset(font)

    for rec in font['name'].names:
        if rec.nameID in NEW_NAMES:
            rec.string = NEW_NAMES[rec.nameID]

    font.flavor = 'woff'
    font.save(OUT)
    print(f'wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size} bytes)')


if __name__ == '__main__':
    main()
