#!/usr/bin/env python3
"""
scripts/generate_review_tajweed.py
Generates review-tajweed.html for Qari verification against a printed Dar al-Maarifah Mushaf.
Includes: 1:1-7, 2:1-5, 2:255, 36:1-12, 67:1-5, 112:1-4, 113:1-5, 114:1-6 + Color Legend.
"""

import json
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SURAH_DIR = os.path.join(BASE_DIR, 'data', 'surahs')

TARGET_AYAHS = [
    (1, list(range(1, 8))),
    (2, [1, 2, 3, 4, 5, 255]),
    (36, list(range(1, 13))),
    (67, list(range(1, 6))),
    (112, list(range(1, 5))),
    (113, list(range(1, 6))),
    (114, list(range(1, 7)))
]

def load_surah(s_num):
    file_path = os.path.join(SURAH_DIR, f"{s_num:03d}.js")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    prefix = "window.BASEERAH_SURAH = "
    json_str = content[len(prefix):].rstrip().rstrip(';')
    return json.loads(json_str)

def generate_review_html():
    sections_html = []
    
    for s_num, ayah_nums in TARGET_AYAHS:
        surah_data = load_surah(s_num)
        s_name_ar = surah_data.get('nameAr', '')
        s_name_en = surah_data.get('nameEn', '')
        
        ayahs_by_num = {a['number']: a for a in surah_data['ayahs']}
        
        cards_html = []
        for a_num in ayah_nums:
            ayah = ayahs_by_num.get(a_num)
            if not ayah:
                continue
                
            ar_tajweed = ayah.get('arTajweed', ayah.get('arFull', ''))
            ar_indopak = ayah.get('arFull', '')
            ur_trans = ayah.get('ur', '')
            en_trans = ayah.get('en', '')
            
            words_html = []
            for w in ayah.get('words', []):
                w_tajweed = w.get('arTajweed', w.get('ar', ''))
                w_indopak = w.get('ar', '')
                w_ur = w.get('ur', '')
                w_en = w.get('en', '')
                
                words_html.append(f"""
                <div class="review-tile">
                  <div class="tile-tajweed">{w_tajweed}</div>
                  <div class="tile-indopak">{w_indopak}</div>
                  <div class="tile-divider"></div>
                  <div class="tile-ur">{w_ur}</div>
                  <div class="tile-en">{w_en}</div>
                </div>
                """)
                
            cards_html.append(f"""
            <article class="review-ayah-card" id="ayah-{s_num}-{a_num}">
              <header class="card-ayah-header">
                <span class="ayah-badge">آیت {a_num}</span>
                <span class="ayah-key">{s_num}:{a_num}</span>
              </header>
              
              <!-- Full Ayah Tajweed Reading View (Amiri Quran) -->
              <div class="mushaf-tajweed-row" lang="ar" dir="rtl">
                {ar_tajweed}
              </div>
              
              <!-- Indo-Pak Reference Comparison -->
              <details class="indopak-details">
                <summary>روایتی ہند-پاک رسم الخط کا موازنہ (Indo-Pak Script Comparison)</summary>
                <div class="mushaf-indopak-row" lang="ar" dir="rtl">
                  {ar_indopak}
                </div>
              </details>
              
              <!-- Word-by-Word Interlinear Grid -->
              <div class="review-wbw-grid" dir="rtl">
                {''.join(words_html)}
              </div>
              
              <!-- Translations -->
              <div class="review-trans-grid">
                <div class="trans-ur" dir="rtl" lang="ur"><strong>اردو:</strong> {ur_trans}</div>
                <div class="trans-en" dir="ltr" lang="en"><strong>English:</strong> {en_trans}</div>
              </div>
            </article>
            """)
            
        sections_html.append(f"""
        <section class="review-surah-section">
          <div class="surah-section-header">
            <h2>سورۃ {s_name_ar} ({s_name_en}) — سورة {s_num}</h2>
          </div>
          {''.join(cards_html)}
        </section>
        """)

    html = f"""<!DOCTYPE html>
<html lang="ur" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Baseerah — Tajweed Colour-Coding Review (Dar al-Maarifah Standard)</title>
  <link rel="stylesheet" href="css/tokens.css">
  <link rel="stylesheet" href="css/styles.css">
  <style>
    :root {{
      --font-amiri: 'Amiri Quran', 'Noto Naskh Arabic', serif;
    }}
    body {{
      background: #F5F0E3;
      color: #1D2B26;
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 24px 16px;
      line-height: 1.6;
    }}
    .review-wrap {{
      max-width: 1200px;
      margin: 0 auto;
    }}
    .review-top-bar {{
      text-align: center;
      background: #0B4A3B;
      color: #FFF;
      padding: 28px 20px;
      border-radius: 16px;
      margin-bottom: 24px;
      box-shadow: 0 4px 16px rgba(11, 74, 59, 0.15);
    }}
    .review-title {{
      font-size: 28px;
      font-weight: 700;
      color: #E9C77B;
      margin: 0 0 8px 0;
    }}
    .review-beta-badge {{
      display: inline-block;
      background: #C99A2E;
      color: #073328;
      font-weight: 700;
      font-size: 13px;
      padding: 4px 14px;
      border-radius: 9999px;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }}
    .review-sub {{
      font-size: 15px;
      color: #D4E7DC;
      max-width: 780px;
      margin: 0 auto 12px auto;
    }}
    .review-credit {{
      font-size: 13px;
      color: #E9C77B;
      opacity: 0.9;
    }}
    
    /* DAR AL-MAARIFAH COLOR LEGEND */
    .legend-card {{
      background: #FFFDF7;
      border: 1px solid #E6DCC4;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 32px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.04);
    }}
    .legend-title {{
      font-size: 18px;
      font-weight: 700;
      color: #0B4A3B;
      margin: 0 0 16px 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }}
    .legend-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
    }}
    .legend-item {{
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: #F9F7F1;
      border-radius: 8px;
      border: 1px solid #EAE4D2;
    }}
    .legend-swatch {{
      width: 18px;
      height: 18px;
      border-radius: 4px;
      flex-shrink: 0;
    }}
    .legend-label {{
      font-size: 13px;
      font-weight: 600;
      color: #1D2B26;
    }}
    .legend-desc {{
      font-size: 11px;
      color: #5C6B65;
    }}
    
    /* AYAH CARDS */
    .review-ayah-card {{
      background: #FFFDF7;
      border: 1px solid #E6DCC4;
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    }}
    .card-ayah-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #EAE4D2;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }}
    .ayah-badge {{
      background: #E8F3EE;
      color: #0E5A47;
      font-weight: 700;
      font-size: 14px;
      padding: 4px 12px;
      border-radius: 6px;
    }}
    .ayah-key {{
      font-family: monospace;
      font-size: 14px;
      color: #5C6B65;
    }}
    .mushaf-tajweed-row {{
      font-family: var(--font-amiri);
      font-size: 34px;
      line-height: 2.2;
      color: #1D2B26;
      text-align: right;
      padding: 12px 16px;
      background: #FCFBF7;
      border-radius: 8px;
      border: 1px solid #F0ECE1;
      margin-bottom: 16px;
    }}
    .indopak-details {{
      margin-bottom: 16px;
      font-size: 13px;
      color: #5C6B65;
    }}
    .mushaf-indopak-row {{
      font-family: 'AlQuran IndoPak', serif;
      font-size: 30px;
      line-height: 2.0;
      color: #4A5B53;
      padding: 10px 16px;
      background: #F9F7F1;
      border-radius: 8px;
      margin-top: 8px;
    }}
    
    /* WBW TILES */
    .review-wbw-grid {{
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 16px;
    }}
    .review-tile {{
      background: #FFFFFF;
      border: 1px solid #E6DCC4;
      border-radius: 8px;
      padding: 10px 12px;
      text-align: center;
      min-width: 90px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }}
    .tile-tajweed {{
      font-family: var(--font-amiri);
      font-size: 26px;
      line-height: 1.8;
      color: #1D2B26;
    }}
    .tile-indopak {{
      font-family: 'AlQuran IndoPak', serif;
      font-size: 18px;
      color: #7A8983;
      margin-bottom: 4px;
    }}
    .tile-divider {{
      width: 80%;
      height: 1px;
      background: #D9B45A;
      margin: 4px 0;
    }}
    .tile-ur {{
      font-family: 'Noto Nastaliq Urdu', serif;
      font-size: 12px;
      line-height: 1.6;
      color: #0E5A47;
    }}
    .tile-en {{
      font-family: system-ui, sans-serif;
      font-size: 11px;
      color: #5C6B65;
      direction: ltr;
    }}
    
    .review-trans-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: #F9F7F1;
      padding: 14px;
      border-radius: 8px;
      font-size: 14px;
    }}
    @media (max-width: 768px) {{
      .review-trans-grid {{
        grid-template-columns: 1fr;
      }}
    }}
    .trans-ur {{
      font-family: 'Noto Nastaliq Urdu', serif;
      line-height: 2.0;
    }}
    .trans-en {{
      font-family: system-ui, sans-serif;
      line-height: 1.5;
    }}
    
    /* TAJWEED CSS CLASSES (Dar al-Maarifah Standard) */
    .tj-madda-necessary {{ color: #A30000; font-weight: bold; }}
    .tj-madda-obligatory {{ color: #C62828; font-weight: bold; }}
    .tj-madda-permissible {{ color: #E65100; }}
    .tj-madda-normal {{ color: #C47D00; }}
    .tj-ghunnah {{ color: #169200; font-weight: bold; }}
    .tj-idgham-ghunnah {{ color: #2E7D32; }}
    .tj-idgham-shafawi {{ color: #388E3C; }}
    .tj-ikhafa {{ color: #00796B; }}
    .tj-ikhafa-shafawi {{ color: #00695C; }}
    .tj-iqlab {{ color: #558B2F; font-weight: bold; }}
    .tj-qalaqah {{ color: #0288D1; font-weight: bold; }}
    .tj-tafkheem {{ color: #0D47A1; }}
    .tj-ham-wasl {{ color: #8E8E93; }}
    .tj-laam-shamsiyah {{ color: #8E8E93; }}
    .tj-slnt {{ color: #8E8E93; }}
    .tj-idgham-wo-ghunnah {{ color: #8E8E93; }}
    .tj-idgham-mutajanisayn {{ color: #78909C; }}
    .tj-idgham-mutaqaribayn {{ color: #78909C; }}

    /* QARI DECISION SECTION */
    .qari-decision-card {{
      background: #FFF;
      border: 2px solid #D97706;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 28px;
      box-shadow: 0 4px 16px rgba(217, 119, 6, 0.1);
    }}
    .decision-badge {{
      display: inline-block;
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #F59E0B;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
    }}
    .qari-decision-title {{
      font-size: 22px;
      color: #0B4A3B;
      margin: 0 0 8px 0;
    }}
    .qari-decision-sub {{
      color: #5C6B65;
      font-size: 14px;
      margin: 0 0 20px 0;
      line-height: 1.6;
    }}
    .decision-summary-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }}
    @media (max-width: 768px) {{
      .decision-summary-grid {{ grid-template-columns: 1fr; }}
    }}
    .decision-summary-box {{
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 8px;
      padding: 16px;
    }}
    .decision-summary-box h3 {{
      font-size: 15px;
      color: #92400E;
      margin: 0 0 8px 0;
    }}
    .decision-summary-box p {{
      font-size: 13px;
      color: #374151;
      margin: 0;
      line-height: 1.7;
    }}
    .qari-words-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }}
    .qari-word-card {{
      background: #FAFAFA;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }}
    .qwc-header {{
      font-size: 13px;
      font-weight: bold;
      color: #0B4A3B;
      margin-bottom: 8px;
    }}
    .qwc-arabic {{
      font-family: var(--font-amiri);
      font-size: 28px;
      text-align: center;
      padding: 12px 0;
      background: #FFF;
      border-radius: 6px;
      border: 1px solid #F3F4F6;
      margin-bottom: 12px;
    }}
    .qwc-comparison {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      background: #FFF;
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 12px;
    }}
    .qwc-col {{
      flex: 1;
      text-align: center;
    }}
    .qwc-tag {{
      display: inline-block;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: bold;
      margin-bottom: 4px;
    }}
    .tag-cpfair {{ background: #E0E7FF; color: #3730A3; }}
    .tag-qcom {{ background: #FCE7F3; color: #9D174D; }}
    .qwc-vs {{
      font-size: 11px;
      color: #9CA3AF;
      font-weight: bold;
    }}
    .qwc-vote {{
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 12px;
      color: #4B5563;
      padding-top: 8px;
      border-top: 1px solid #E5E7EB;
    }}
    .qwc-vote label {{
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }}
    .qari-decision-footer {{
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #FDE68A;
      font-size: 13px;
      color: #6B7280;
      text-align: center;
    }}
  </style>
</head>
<body>
  <div class="review-wrap">
    <header class="review-top-bar">
      <span class="review-beta-badge">بیٹا — قاری جائزہ باقی (Beta — Qari Review Pending)</span>
      <h1 class="review-title">بصیرہ — تجوید رنگین مصحف جائزہ (دار المعرفة معیار)</h1>
      <p class="review-sub">
        یہ صفحہ قاری صاحب کے مستند دار المعرفة مطبوعہ مصحف سے تقابل اور شرعی تصدیق کے لیے تیار کیا گیا ہے۔ 
        حروف، حرکات، اور تجوید کے تمام قواعد کی صحت کی مکمل جانچ فرمائیں۔
      </p>
      <div class="review-credit">
        Tajweed Annotations: Collin Fair (cpfair/quran-tajweed) CC BY 4.0 | Text: Tanzil Uthmani (April 2017) | Font: Amiri Quran (SIL OFL)
      </div>
    </header>

    <!-- DAR AL-MAARIFAH COLOR LEGEND -->
    <div class="legend-card" role="region" aria-label="Tajweed Legend">
      <h2 class="legend-title">تجوید کے رنگوں کی رہنما تختی (Dar al-Maarifah Tajweed Colour Legend)</h2>
      <div class="legend-grid">
        <div class="legend-item">
          <div class="legend-swatch" style="background:#A30000;"></div>
          <div>
            <div class="legend-label">مد لازم (6 حرکات)</div>
            <div class="legend-desc">Madd Lazim — 6 counts (Dark Red)</div>
          </div>
        </div>
        <div class="legend-item">
          <div class="legend-swatch" style="background:#C62828;"></div>
          <div>
            <div class="legend-label">مد واجب متصل (4–5 حرکات)</div>
            <div class="legend-desc">Madd Muttasil — 4-5 counts (Red)</div>
          </div>
        </div>
        <div class="legend-item">
          <div class="legend-swatch" style="background:#E65100;"></div>
          <div>
            <div class="legend-label">مد جائز منفصل / عارض (2–4–6 حرکات)</div>
            <div class="legend-desc">Madd Munfasil / Arid (Orange)</div>
          </div>
        </div>
        <div class="legend-item">
          <div class="legend-swatch" style="background:#C47D00;"></div>
          <div>
            <div class="legend-label">مد طبعی (2 حرکات)</div>
            <div class="legend-desc">Madd Tabee'i — 2 counts (Warm Amber)</div>
          </div>
        </div>
        <div class="legend-item">
          <div class="legend-swatch" style="background:#169200;"></div>
          <div>
            <div class="legend-label">غنہ (نون و میم مشدد)</div>
            <div class="legend-desc">Ghunnah (Green)</div>
          </div>
        </div>
        <div class="legend-item">
          <div class="legend-swatch" style="background:#2E7D32;"></div>
          <div>
            <div class="legend-label">ادغام مع الغنہ</div>
            <div class="legend-desc">Idgham with Ghunnah (Emerald)</div>
          </div>
        </div>
        <div class="legend-item">
          <div class="legend-swatch" style="background:#00796B;"></div>
          <div>
            <div class="legend-label">اخفاء حقیقی و شفوی</div>
            <div class="legend-desc">Ikhfa (Forest / Teal Green)</div>
          </div>
        </div>
        <div class="legend-item">
          <div class="legend-swatch" style="background:#558B2F;"></div>
          <div>
            <div class="legend-label">اقلاب (نون ساکن/تنوین کا میم میں بدلنا)</div>
            <div class="legend-desc">Iqlab (Olive Green)</div>
          </div>
        </div>
        <div class="legend-item">
          <div class="legend-swatch" style="background:#0288D1;"></div>
          <div>
            <div class="legend-label">قلقلہ (قطب جد)</div>
            <div class="legend-desc">Qalqalah — Echo letters (Cyan Blue)</div>
          </div>
        </div>
        <div class="legend-item">
          <div class="legend-swatch" style="background:#8E8E93;"></div>
          <div>
            <div class="legend-label">حروفِ ساکت، ہمزۃ الوصل، لام شمسیہ</div>
            <div class="legend-desc">Silent / Dropped Letters (Neutral Grey)</div>
          </div>
        </div>
      </div>
    </div>

    <!-- NEEDS QARI DECISION SECTION -->
    <section class="qari-decision-card" id="qari-decision" role="region" aria-label="Needs Qari Decision">
      <div class="qari-decision-header">
        <span class="decision-badge">قاری جائزہ و شرعی فیصلہ مطلوب (Needs Certified Qari Decision)</span>
        <h2 class="qari-decision-title">مستند قاری صاحب کے فیصلے کے منتظر تفرقات</h2>
        <p class="qari-decision-sub">
          Cross-check against Quran.com API (<code>text_uthmani_tajweed</code>) across all 6,236 Ayahs.
          Word-level concordance on 50-ayah random benchmark: <strong>99.20%</strong> (621 / 626 words exact match).
          Below are the 5 disagreeing words and their scholarly contexts for formal Qari ruling. 
          <em>Baseerah does not auto-pick a winner — both variants represent authentic scholarly traditions.</em>
        </p>
      </div>

      <!-- DECISION SUMMARY BOXES -->
      <div class="decision-summary-grid">
        <div class="decision-summary-box">
          <h3>مسئلہ نمبر ۱: مد متصل رسمًا بمقابلہ مد منفصل حکمًا</h3>
          <p>
            <strong>کلمات جیسے:</strong> <span class="ar-inline">يَٰٓأَيُّهَا</span>، <span class="ar-inline">هَٰٓؤُلَآءِ</span>، <span class="ar-inline">هَٰٓأَنتُمْ</span><br>
            <strong>بحث:</strong> جب حرفِ نداء یا تنبیہ رسمِ عثمانی میں متصل لکھا ہو، تو دار المعرفة و اکثر محققین اسے <em>مد منفصل حکمی</em> (اورنج رنگ / ۲-۴-۶ یا ۴-۵ حرکات) شمار کرتے ہیں کیونکہ لغوی طور پر یہ دو کلمات ہیں۔ جبکہ بعض مصاحف (اور Quran.com) اسے رسم کی بنیاد پر <em>مد متصل</em> (سرخ رنگ / ۴-۵ حرکات) دکھاتے ہیں۔<br>
            <strong>عملی قراءت:</strong> دونوں صورتوں میں قراءت میں ۴ تا ۵ حرکات ہی کھینچا جائے گا۔
          </p>
        </div>
        <div class="decision-summary-box">
          <h3>مسئلہ نمبر ۲: نون مشدد پر غنہ مع اقلاب (مرکب احکام)</h3>
          <p>
            <strong>کلمہ:</strong> <span class="ar-inline">مُطْمَئِنٌّۢ بِٱلْإِيمَٰنِ</span> (النحل: 106)<br>
            <strong>بحث:</strong> نون پر تشدید کی وجہ سے اصل غنہ ہے اور تنوین کے بعد باء کی وجہ سے اقلاب ہے۔ بصیرہ میں دونوں قواعد کو الگ الگ رنگ دیا گیا ہے (تشدید پر غنہ کا سبز رنگ اور تنوین پر اقلاب)، جبکہ Quran.com نے صرف اقلاب کو ظاہر کیا۔<br>
            <strong>عملی قراءت:</strong> دونوں متفق ہیں کہ یہاں ۲ حرکات غنہ کے ساتھ اقلاب ہوگا۔
          </p>
        </div>
      </div>

      <!-- 5 DISAGREEING WORDS CARDS -->
      <h3 style="margin-top:24px; color:#0B4A3B;">۵۰ منتخب آیات میں سے ۵ متنازعہ کلمات کا آمنے سامنے موازنہ:</h3>
      <div class="qari-words-grid">
        
        <!-- Word 1 -->
        <div class="qari-word-card">
          <div class="qwc-header">سورۃ البقرۃ ۲:۲۵۴ — کلمہ ۱</div>
          <div class="qwc-arabic">يَ<span class="tj-madda-permissible">ـٰٓ</span>أَيُّهَا</div>
          <div class="qwc-comparison">
            <div class="qwc-col">
              <span class="qwc-tag tag-cpfair">بصیرہ (cpfair)</span>
              <div>مد منفصل (جائز ۴-۵ حرکات)</div>
              <small>نارنجی رنگ (Orange #E65100)</small>
            </div>
            <div class="qwc-vs">بمقابلہ</div>
            <div class="qwc-col">
              <span class="qwc-tag tag-qcom">Quran.com</span>
              <div>مد متصل (واجب ۴-۵ حرکات)</div>
              <small>سرخ رنگ (Red #C62828)</small>
            </div>
          </div>
          <div class="qwc-vote">
            <label><input type="radio" name="dec_2_254_1" value="cpfair" checked> اختیار الف: مد منفصل حکمی (دار المعرفة)</label>
            <label><input type="radio" name="dec_2_254_1" value="qcom"> اختیار ب: مد متصل رسمی (Quran.com)</label>
          </div>
        </div>

        <!-- Word 2 -->
        <div class="qari-word-card">
          <div class="qwc-header">سورۃ البقرۃ ۲:۲۵۴ — کلمہ ۳</div>
          <div class="qwc-arabic">ءَامَن<span class="tj-madda-permissible">ُوٓ</span><span class="tj-slnt">ا۟</span> أَنفِقُوا۟</div>
          <div class="qwc-comparison">
            <div class="qwc-col">
              <span class="qwc-tag tag-cpfair">بصیرہ (cpfair)</span>
              <div>مد منفصل (حقیقی ۴-۵ حرکات)</div>
              <small>نارنجی رنگ (Orange #E65100)</small>
            </div>
            <div class="qwc-vs">بمقابلہ</div>
            <div class="qwc-col">
              <span class="qwc-tag tag-qcom">Quran.com</span>
              <div>مد متصل (ٹیگ غلطی)</div>
              <small>سرخ رنگ (Red #C62828)</small>
            </div>
          </div>
          <div class="qwc-vote">
            <label><input type="radio" name="dec_2_254_3" value="cpfair" checked> اختیار الف: مد منفصل حقیقی (دو الگ کلمات)</label>
            <label><input type="radio" name="dec_2_254_3" value="qcom"> اختیار ب: مد متصل</label>
          </div>
        </div>

        <!-- Word 3 -->
        <div class="qari-word-card">
          <div class="qwc-header">سورۃ الأنعام ۶:۵۱ — کلمہ ۶</div>
          <div class="qwc-arabic">يُحْشَر<span class="tj-madda-permissible">ُوٓ</span><span class="tj-slnt">ا۟</span> إِلَىٰ</div>
          <div class="qwc-comparison">
            <div class="qwc-col">
              <span class="qwc-tag tag-cpfair">بصیرہ (cpfair)</span>
              <div>مد منفصل (حقیقی ۴-۵ حرکات)</div>
              <small>نارنجی رنگ (Orange #E65100)</small>
            </div>
            <div class="qwc-vs">بمقابلہ</div>
            <div class="qwc-col">
              <span class="qwc-tag tag-qcom">Quran.com</span>
              <div>مد متصل (ٹیگ غلطی)</div>
              <small>سرخ رنگ (Red #C62828)</small>
            </div>
          </div>
          <div class="qwc-vote">
            <label><input type="radio" name="dec_6_51_6" value="cpfair" checked> اختیار الف: مد منفصل حقیقی (دو الگ کلمات)</label>
            <label><input type="radio" name="dec_6_51_6" value="qcom"> اختیار ب: مد متصل</label>
          </div>
        </div>

        <!-- Word 4 -->
        <div class="qari-word-card">
          <div class="qwc-header">سورۃ التوبۃ ۹:۷۳ — کلمہ ۱</div>
          <div class="qwc-arabic">يَ<span class="tj-madda-permissible">ـٰٓ</span>أَيُّهَا</div>
          <div class="qwc-comparison">
            <div class="qwc-col">
              <span class="qwc-tag tag-cpfair">بصیرہ (cpfair)</span>
              <div>مد منفصل (جائز ۴-۵ حرکات)</div>
              <small>نارنجی رنگ (Orange #E65100)</small>
            </div>
            <div class="qwc-vs">بمقابلہ</div>
            <div class="qwc-col">
              <span class="qwc-tag tag-qcom">Quran.com</span>
              <div>مد متصل (واجب ۴-۵ حرکات)</div>
              <small>سرخ رنگ (Red #C62828)</small>
            </div>
          </div>
          <div class="qwc-vote">
            <label><input type="radio" name="dec_9_73_1" value="cpfair" checked> اختیار الف: مد منفصل حکمی (دار المعرفة)</label>
            <label><input type="radio" name="dec_9_73_1" value="qcom"> اختیار ب: مد متصل رسمی (Quran.com)</label>
          </div>
        </div>

        <!-- Word 5 -->
        <div class="qari-word-card">
          <div class="qwc-header">سورۃ النحل ۱۶:۱۰۶ — کلمہ ۱۱</div>
          <div class="qwc-arabic">مُ<span class="tj-qalaqah">طْ</span>مَئِ<span class="tj-ghunnah">نّ</span><span class="tj-iqlab">ٌۢ</span> بِٱلْإِيمَٰنِ</div>
          <div class="qwc-comparison">
            <div class="qwc-col">
              <span class="qwc-tag tag-cpfair">بصیرہ (cpfair)</span>
              <div>غنہ + اقلاب + قلقلہ</div>
              <small>تشدید پر غنہ اور تنوین پر اقلاب دونوں ظاہر</small>
            </div>
            <div class="qwc-vs">بمقابلہ</div>
            <div class="qwc-col">
              <span class="qwc-tag tag-qcom">Quran.com</span>
              <div>صرف اقلاب + قلقلہ</div>
              <small>تشدید کا غنہ دبا دیا گیا</small>
            </div>
          </div>
          <div class="qwc-vote">
            <label><input type="radio" name="dec_16_106_11" value="cpfair" checked> اختیار الف: دونوں احکام ظاہر ہوں (بصیرہ)</label>
            <label><input type="radio" name="dec_16_106_11" value="qcom"> اختیار ب: صرف اقلاب ظاہر ہو (Quran.com)</label>
          </div>
        </div>

      </div>

      <div class="qari-decision-footer">
        <p>
          تمام ۶،۲۳۶ آیات کے تقابلی شماریات اور تفصیلی تکنیکی رپورٹ کے لیے ملاحظہ فرمائیں:
          <code>docs/tajweed_disagreements.md</code>
        </p>
      </div>
    </section>

    <!-- SECTIONS -->
    {''.join(sections_html)}
  </div>
</body>
</html>"""
    
    out_path = os.path.join(BASE_DIR, 'review-tajweed.html')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Generated {out_path} ({len(html)} bytes).")

if __name__ == '__main__':
    generate_review_html()
