import json
import glob
import re
from fontTools.ttLib import TTFont

font_indo = TTFont('fonts/indopak-nastaleeq-qul.ttf')
cmap_indo = font_indo.getBestCmap()

font_amiri = TTFont('fonts/amiri-quran.ttf')
cmap_amiri = font_amiri.getBestCmap()

indo_chars = set()
uthmani_chars = set()

for path in glob.glob('data/surahs/*.js'):
    with open(path, encoding='utf-8') as f:
        content = f.read()
    for m in re.finditer(r'"arFull":\s*"(.*?)"', content):
        indo_chars.update(m.group(1))
    for m in re.finditer(r'"arTajweed":\s*"(.*?)"', content):
        clean = re.sub(r'<[^>]+>', '', m.group(1))
        uthmani_chars.update(clean)

missing_indo = [c for c in sorted(indo_chars) if ord(c) not in cmap_indo]
missing_amiri = [c for c in sorted(uthmani_chars) if ord(c) not in cmap_amiri]

print('Indo-Pak verified total unique chars:', len(indo_chars))
print('Missing in Indo-Pak font:', [(c, f'U+{ord(c):04X}', ord(c)) for c in missing_indo])

print('Uthmani verified total unique chars:', len(uthmani_chars))
print('Missing in Amiri font:', [(c, f'U+{ord(c):04X}', ord(c)) for c in missing_amiri])
