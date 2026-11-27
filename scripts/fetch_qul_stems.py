import urllib.request
import re
import html
import sqlite3
import os

RAW_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "raw")
DB_PATH = os.path.join(RAW_DIR, "qul-morphology-77.sqlite")

def fetch_qul_stems(surah, ayah):
    url = f"https://qul.tarteel.ai/resources/morphology/77?ayah={surah}%3A{ayah}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    content = urllib.request.urlopen(req, timeout=15).read().decode('utf-8', errors='ignore')
    
    # Blocks for each word
    blocks = re.findall(r'<div class="bg-gray-50[^"]*qpc-hafs">.*?</div>\s*</div>', content, flags=re.DOTALL)
    words = []
    for b in blocks:
        m_text = re.search(r'<div class="text-lg[^>]*>(.*?)</div>', b, flags=re.DOTALL)
        # Match href="/morphology/stems/..." >STEM</a>
        m_stem = re.search(r'/morphology/stems/[^">]+">([^<]+)</a>', b)
        
        t = html.unescape(m_text.group(1)).strip() if m_text else ""
        s_val = html.unescape(m_stem.group(1)).strip() if m_stem else None
        words.append((t, s_val))
    return words

def build_sqlite():
    os.makedirs(RAW_DIR, exist_ok=True)
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE stems (
        id INTEGER PRIMARY KEY,
        text TEXT,
        text_clean TEXT,
        words_count INTEGER,
        uniq_words_count INTEGER
    )
    """)
    cur.execute("""
    CREATE TABLE stem_words (
        stem_id INTEGER,
        word_location TEXT
    )
    """)
    cur.execute("CREATE INDEX idx_stem_words_location ON stem_words(word_location)")
    
    stem_map = {} # text_clean -> stem_id
    next_stem_id = 1
    
    targets = [(1, a) for a in range(1, 8)] + [(2, a) for a in range(1, 21)]
    print(f"Fetching stems for {len(targets)} ayahs from QUL Resource 77...")
    
    for s, a in targets:
        words = fetch_qul_stems(s, a)
        # Drop the last element if it is an ayah marker (digits only)
        if words and words[-1][0].isdigit():
            words = words[:-1]
        
        for w_idx, (w_text, stem_clean) in enumerate(words, 1):
            loc = f"{s}:{a}:{w_idx}"
            if stem_clean:
                if stem_clean not in stem_map:
                    stem_id = next_stem_id
                    next_stem_id += 1
                    stem_map[stem_clean] = stem_id
                    cur.execute(
                        "INSERT INTO stems (id, text, text_clean, words_count, uniq_words_count) VALUES (?, ?, ?, ?, ?)",
                        (stem_id, stem_clean, stem_clean, 1, 1)
                    )
                else:
                    stem_id = stem_map[stem_clean]
                    cur.execute("UPDATE stems SET words_count = words_count + 1 WHERE id = ?", (stem_id,))
                
                cur.execute("INSERT INTO stem_words (stem_id, word_location) VALUES (?, ?)", (stem_id, loc))
            else:
                # No stem found for this word
                pass
        print(f"  Ayah {s}:{a}: {len(words)} words processed.")
        
    conn.commit()
    conn.close()
    print(f"Successfully generated {DB_PATH} with {len(stem_map)} unique stems.")

if __name__ == "__main__":
    build_sqlite()
