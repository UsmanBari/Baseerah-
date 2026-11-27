const fs = require('fs');

function analyzeSurah(sNum, maxAyah) {
  const padded = String(sNum).padStart(3, '0');
  const txt = fs.readFileSync('data/surahs/' + padded + '.js', 'utf8').replace(/^window\.BASEERAH_SURAH\s*=\s*/, '').replace(/;\s*$/, '');
  const data = JSON.parse(txt);

  console.log(`\n=== Surah ${sNum} (Ayahs 1 to ${maxAyah}) ===`);
  const totals = { mushaf: 0, wbw: 0 };
  const ruleTotals = { mushaf: {}, wbw: {} };

  for (let a = 1; a <= maxAyah; a++) {
    const ayah = data.ayahs.find(x => x.number === a);
    if (!ayah) continue;

    // Mushaf text: ayah.arTajweed
    const mushafMatches = (ayah.arTajweed || '').match(/class="([^"]+)"/g) || [];
    const mushafRules = {};
    mushafMatches.forEach(m => {
      const cls = m.replace('class="', '').replace('"', '');
      mushafRules[cls] = (mushafRules[cls] || 0) + 1;
      ruleTotals.mushaf[cls] = (ruleTotals.mushaf[cls] || 0) + 1;
      totals.mushaf++;
    });

    // WBW words: w.arTajweed
    const wbwRules = {};
    let wbwCount = 0;
    (ayah.words || []).forEach(w => {
      const wMatches = (w.arTajweed || '').match(/class="([^"]+)"/g) || [];
      wMatches.forEach(m => {
        const cls = m.replace('class="', '').replace('"', '');
        wbwRules[cls] = (wbwRules[cls] || 0) + 1;
        ruleTotals.wbw[cls] = (ruleTotals.wbw[cls] || 0) + 1;
        wbwCount++;
        totals.wbw++;
      });
    });

    const isMatch = JSON.stringify(mushafRules) === JSON.stringify(wbwRules);
    console.log(`Ayah ${sNum}:${a} -> Mushaf: ${mushafMatches.length} spans, WBW: ${wbwCount} spans [${isMatch ? 'PERFECT MATCH' : 'DIFF'}]`);
    if (!isMatch) {
      console.log('  Mushaf rules:', mushafRules);
      console.log('  WBW rules:   ', wbwRules);
    }
  }

  console.log(`\nSummary for Surah ${sNum} (Ayahs 1-${maxAyah}):`);
  console.log('Mushaf rule totals:', ruleTotals.mushaf);
  console.log('WBW rule totals:   ', ruleTotals.wbw);
  console.log(`Total spans: Mushaf=${totals.mushaf}, WBW=${totals.wbw}`);
  return { ruleTotals, totals };
}

console.log('ANALYZING TAJWEED SPANS IN DATA FILE...');
analyzeSurah(1, 7);
analyzeSurah(2, 5);
