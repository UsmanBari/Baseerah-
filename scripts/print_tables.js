import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function getTable(sNum, maxA) {
  const padded = String(sNum).padStart(3, '0');
  const raw = fs.readFileSync(path.join(ROOT_DIR, 'data', 'surahs', `${padded}.js`), 'utf8')
    .replace('window.BASEERAH_SURAH = ', '')
    .replace(/;\s*$/, '');
  const surah = JSON.parse(raw);
  
  console.log('| Ayah | Mushaf Rules & Spans (Data & DOM) | WBW Rules & Spans (Data & DOM) | Explanation / Notes |');
  console.log('| :--- | :--- | :--- | :--- |');
  for (let a = 1; a <= maxA; a++) {
    const ayah = surah.ayahs.find(x => x.number === a);
    const mRules = {};
    (ayah.arTajweed.match(/class="([^"]+)"/g) || []).forEach(m => {
      const c = m.replace('class="', '').replace('"', '');
      mRules[c] = (mRules[c] || 0) + 1;
    });
    const wRules = {};
    (ayah.words || []).forEach(w => {
      (w.arTajweed.match(/class="([^"]+)"/g) || []).forEach(m => {
        const c = m.replace('class="', '').replace('"', '');
        wRules[c] = (wRules[c] || 0) + 1;
      });
    });
    const mTotal = Object.values(mRules).reduce((x, y) => x + y, 0);
    const wTotal = Object.values(wRules).reduce((x, y) => x + y, 0);
    const mStr = Object.entries(mRules).map(([k, v]) => `${k.replace('tj-', '')}: ${v}`).join(', ') + ` (**Total: ${mTotal}**)`;
    const wStr = Object.entries(wRules).map(([k, v]) => `${k.replace('tj-', '')}: ${v}`).join(', ') + ` (**Total: ${wTotal}**)`;
    let notes = 'Exact match across Mushaf and WBW';
    if (mTotal !== wTotal) {
      notes = `Difference (+${wTotal - mTotal}) due to cross-word rule split across tiles`;
    }
    console.log(`| ${sNum}:${a} | ${mStr} | ${wStr} | ${notes} |`);
  }
}

console.log('### Surah 1:1 – 1:7 (Data Spans vs DOM Spans)');
getTable(1, 7);
console.log('\n### Surah 2:1 – 2:5 (Data Spans vs DOM Spans)');
getTable(2, 5);
