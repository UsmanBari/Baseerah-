"""Build data/timings/alafasy/NNN.json: word start/end times (ms) for Mishary
Alafasy's ayah recordings, mapped onto the app's own word list.

Source: quran-align by Collin Fair, release 2016-11-24, Alafasy_128kbps.json,
CC BY 4.0, https://github.com/cpfair/quran-align (modified: re-indexed to the
app's words, gaps filled). Usage: python scripts/build_word_timings.py <path>
"""
import json, re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
src = json.load(open(sys.argv[1], encoding="utf-8"))
by = {(r["surah"], r["ayah"]): r["segments"] for r in src}
out_dir = root / "data/timings/alafasy"
out_dir.mkdir(parents=True, exist_ok=True)
direct = scaled = missing = 0
for s in range(1, 115):
    raw = (root / f"data/surahs/{s:03d}.js").read_text(encoding="utf-8")
    data = json.loads(re.sub(r"^window\.BASEERAH_SURAH\s*=\s*", "", raw).rstrip().rstrip(";"))
    surah = {}
    for a in data["ayahs"]:
        n = len(a.get("words") or [])
        segs = by.get((s, a["number"]))
        if not n or not segs:
            missing += 1
            continue
        m = max(e for _, e, _, _ in segs)  # source word count
        t = [None] * m
        for w0, w1, st, en in segs:
            k = max(1, w1 - w0)
            for j in range(w0, w1):
                t[j] = [st + (en - st) * (j - w0) / k, st + (en - st) * (j - w0 + 1) / k]
        # fill words the aligner could not place, from their neighbours
        for j in range(m):
            if t[j] is None:
                prev = next((t[i][1] for i in range(j - 1, -1, -1) if t[i]), segs[0][2])
                nxt = next((t[i][0] for i in range(j + 1, m) if t[i]), segs[-1][3])
                t[j] = [prev, max(prev, nxt)]
        if m == n:
            direct += 1
            words = t
        else:  # different word split: map by position through the ayah
            scaled += 1
            words = []
            for i in range(n):
                a0, a1 = i * m / n, (i + 1) * m / n
                st = t[min(int(a0), m - 1)][0]
                en = t[min(max(int(a1 - 1e-9), 0), m - 1)][1]
                words.append([st, max(st, en)])
        surah[a["number"]] = [[round(x), round(y)] for x, y in words]
    (out_dir / f"{s:03d}.json").write_text(json.dumps(surah, separators=(",", ":")), encoding="utf-8")
print(f"direct={direct} scaled={scaled} missing={missing}")
