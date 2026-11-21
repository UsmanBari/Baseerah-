const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testArabicJoining() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Create an HTML page with Uthmani text with and without tags
  const htmlContent = `
  <!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Amiri+Quran&display=swap');
      body {
        background: #111;
        color: #fff;
        padding: 40px;
        font-family: 'Amiri Quran', serif;
        font-size: 48px;
        line-height: 2.2;
      }
      .tajweed-box {
        background: #222;
        padding: 20px 30px;
        border-radius: 12px;
        margin-bottom: 30px;
        border: 1px solid #444;
      }
      .label {
        font-size: 18px;
        color: #aaa;
        font-family: sans-serif;
        margin-bottom: 10px;
      }
      /* Tajweed Dar al-Maarifah styling */
      .ham_wasl { color: #888; }
      .laam_shamsiyah { color: #888; }
      .ghunnah { color: #169200; }
      .madda_necessary { color: #b50000; }
      .madda_obligatory { color: #d60000; }
      .madda_permissible { color: #e65100; }
      .madda_normal { color: #c47d00; }
      .qalaqah { color: #0288d1; }
      .ikhafa { color: #2e7d32; }
      .idgham_ghunnah { color: #388e3c; }
      .idgham_wo_ghunnah { color: #888; }
      .slnt { color: #888; }
    </style>
  </head>
  <body>
    <div class="tajweed-box">
      <div class="label">1. Plain Uthmani (Amiri Quran) - 114:1</div>
      <div>قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ</div>
    </div>
    
    <div class="tajweed-box">
      <div class="label">2. Tagged Tajweed (Amiri Quran) - 114:1</div>
      <div>قُلْ أَعُوذُ بِرَبِّ <span class="ham_wasl">ٱ</span><span class="laam_shamsiyah">ل</span><span class="ghunnah">نّ</span><span class="madda_permissible">َا</span>سِ</div>
    </div>

    <div class="tajweed-box">
      <div class="label">3. Tagged Tajweed - 1:7 (الضَّالِّينَ)</div>
      <div>صِرَ<span class="madda_normal">ـٰ</span>طَ <span class="ham_wasl">ٱ</span>لَّذِينَ أَنعَمتَ عَلَيهِم غَيرِ <span class="ham_wasl">ٱ</span>لمَغضُوبِ عَلَيهِم وَلاَ <span class="ham_wasl">ٱ</span><span class="laam_shamsiyah">ل</span><span class="qalaqah">ضّ</span><span class="madda_necessary">َا</span>ٓ<span class="laam_shamsiyah">لّ</span><span class="madda_permissible">ِي</span>نَ</div>
    </div>
  </body>
  </html>
  `;
  
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  const screenshotPath = path.join(__dirname, 'tajweed_joining_test.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Saved screenshot to:', screenshotPath);
  
  await browser.close();
}

testArabicJoining().catch(console.error);
