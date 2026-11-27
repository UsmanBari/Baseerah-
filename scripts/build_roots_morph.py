"""Build word splits and the root explorer from Tarteel QUL data.

Inputs (QUL, qul.tarteel.ai/resources/morphology): word-root.db, word-lemma.db
Outputs:
  data/morph/NNN.json  {"ayah:word": [prefix_chars, suffix_chars, root_id]}
  data/roots.json      {root_id: {"r": letters, "n": count, "f": [[word, en, "s:a:w", count], ...]}}

The split is found by locating the word's lemma (its dictionary form) inside
the word. Only attached particles (wa-, fa-, bi-, li-, ka-, sa-, al-) and
attached pronoun / subject endings are split off; everything else stays in the
stem. Quran text is only read from data/surahs, never changed.
Usage: python scripts/build_roots_morph.py <word-root.db> <word-lemma.db>
"""
import json, re, sqlite3, sys, pathlib, unicodedata
from collections import defaultdict, Counter

root = pathlib.Path(__file__).resolve().parent.parent
rc = sqlite3.connect(sys.argv[1]); lc = sqlite3.connect(sys.argv[2])
roots = {i: (ar, n) for i, ar, n in rc.execute("select id, arabic_trilateral, words_count from roots")}
word_root = {loc: rid for rid, loc in rc.execute("select root_id, word_location from root_words")}
lemma_txt = {i: t for i, t in lc.execute("select id, text_clean from lemmas")}
word_lemma = {loc: lemma_txt.get(lid) for lid, loc in lc.execute("select lemma_id, word_location from lemma_words")}

NORM = {"ي": "ی", "ى": "ی", "ئ": "ی", "ك": "ک", "ة": "ہ", "ۃ": "ہ", "ه": "ہ", "ھ": "ہ",
        "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ؤ": "و"}
def is_diac(ch):
    cp = ord(ch)
    return unicodedata.category(ch) in ("Mn", "Me", "Cf") or 0x064B <= cp <= 0x065F or cp == 0x0670 or 0x06D6 <= cp <= 0x06ED or cp == 0x0640
def base(text):
    return [(i, NORM.get(c, c)) for i, c in enumerate(text) if not is_diac(c) and 0x0600 <= ord(c) <= 0x06FF]

PREFIXES = {"", "و", "ف", "ب", "ل", "ک", "س", "ال", "وال", "فال", "بال", "کال", "لل", "ول", "فل", "وب", "فب",
            "ولل", "فلل", "وک", "فک", "وس", "فس", "وبال", "فبال", "وکال"}
SUFFIXES = {"", "ہ", "ہا", "ہم", "ہما", "ہن", "ک", "کم", "کما", "کن", "نا", "ی", "نی", "ت", "تم", "تما", "تن", "وا"}

def split(word, lemma):
    core = word.split(" ")[0]
    b = base(core)
    seq = "".join(x for _, x in b)
    if not lemma or len(b) < 2:
        return None
    lem = "".join(NORM.get(c, c) for c in lemma if not is_diac(c))
    if "الله" in lemma or "اللہ" in lem:
        return None
    cands = list(dict.fromkeys([lem, lem.lstrip("ا"), lem.replace("ا", "")]))
    for L in cands:
        if not L:
            continue
        pos = [m.start() for m in re.finditer(f"(?={re.escape(L)})", seq)]
        for p in pos:
            head, tail = seq[:p], seq[p + len(L):]
            # keep only the attached-word parts; anything else joins the stem
            hp = max((k for k in range(len(head) + 1) if head[:k] in PREFIXES), default=0)
            if head[:hp] != head:  # e.g. present-tense ya-: not a separate word
                hp = 0 if head not in PREFIXES else hp
            ts = max((k for k in range(len(tail) + 1) if tail[len(tail) - k:] in SUFFIXES), default=0)
            if hp == 0 and ts == 0:
                return None
            if len(b) - hp - ts < 2:
                continue
            pchars = b[hp][0] if hp else 0
            schars = (len(core) - b[len(b) - ts][0]) if ts else 0
            return [pchars, schars + (len(word) - len(core)) * (1 if ts else 0)]
    return None

surahs_out = 0; split_n = 0; total = 0
forms = defaultdict(Counter); first_loc = {}; gloss = {}
(root / "data/morph").mkdir(exist_ok=True)
for s in range(1, 115):
    raw = (root / f"data/surahs/{s:03d}.js").read_text(encoding="utf-8")
    data = json.loads(re.sub(r"^window\.BASEERAH_SURAH\s*=\s*", "", raw).rstrip().rstrip(";"))
    out = {}
    for a in data["ayahs"]:
        for wi, w in enumerate(a.get("words") or []):
            total += 1
            loc = f"{s}:{a['number']}:{wi + 1}"
            rid = word_root.get(loc)
            sp = split(w["ar"], word_lemma.get(loc))
            if sp:
                split_n += 1
                pre, suf = sp
                assert w["ar"][:pre] + w["ar"][pre:len(w["ar"]) - suf] + w["ar"][len(w["ar"]) - suf:] == w["ar"]
            if sp or rid:
                out[f"{a['number']}:{wi + 1}"] = [sp[0] if sp else 0, sp[1] if sp else 0, rid or 0]
            if rid:
                form = w["ar"].split(" ")[0]
                forms[rid][form] += 1
                first_loc.setdefault((rid, form), loc)
                gloss.setdefault((rid, form), re.sub(r"\s+", " ", w.get("en") or "").strip())
    (root / f"data/morph/{s:03d}.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

roots_out = {}
for rid, (ar, n) in roots.items():
    if rid not in forms:
        continue
    f = [[form, gloss[(rid, form)], first_loc[(rid, form)], c] for form, c in forms[rid].most_common(15)]
    roots_out[rid] = {"r": re.sub(r"\s+", " ", ar).strip(), "n": n or sum(forms[rid].values()), "u": len(forms[rid]), "f": f}
(root / "data/roots.json").write_text(json.dumps(roots_out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"words={total} split={split_n} ({split_n*100/total:.1f}%) with_root={len(word_root)} roots={len(roots_out)}")
