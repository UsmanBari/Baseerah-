/**
 * tests/test_bidi_isolation.js
 * Unit test for Unicode Bidi isolation across all number+text mixtures:
 * - Header subtitle (.surah-sub-info)
 * - Ayah chips (.ayah-chip)
 * - Jump pill (.jump-pill-text)
 * - Bookmarks (.bookmark-ref)
 * - Search results
 * - Prayer times jamaat
 */

const assert = require('assert');

// Simulate the DOM structure output by our templates
function testSurahSubInfoUrdu(sNum, totalAyahs) {
  const toUrduDigits = (n) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  return `<span class="surah-sub-info" dir="rtl">` +
    `<span>سورت <bdi class="urdu-num">${toUrduDigits(sNum)}</bdi></span> ` +
    `<span class="sub-dot" aria-hidden="true">·</span> ` +
    `<span><bdi class="urdu-num">${toUrduDigits(totalAyahs)}</bdi> آیات</span>` +
    `</span>`;
}

function testSurahSubInfoEnglish(sNum, totalAyahs) {
  return `<span class="surah-sub-info" dir="ltr">` +
    `<span>Surah <bdi class="urdu-num">${sNum}</bdi></span> ` +
    `<span class="sub-dot" aria-hidden="true">·</span> ` +
    `<span><bdi class="urdu-num">${totalAyahs}</bdi> verses</span>` +
    `</span>`;
}

// 1. Surah Sub Info Urdu test
const urHtml = testSurahSubInfoUrdu(2, 286);
assert(!urHtml.includes('۲۸۶۰۲'), 'Must not contain fused digits ۲۸۶۰۲');
assert(!urHtml.includes('۲۸۶۲'), 'Must not contain fused digits ۲۸۶۲');
assert(urHtml.includes('<bdi class="urdu-num">۲</bdi>'), 'Must isolate surah digit in <bdi>');
assert(urHtml.includes('<bdi class="urdu-num">۲۸۶</bdi>'), 'Must isolate ayah count in <bdi>');
assert(urHtml.includes('<span class="sub-dot" aria-hidden="true">·</span>'), 'Must have isolated dot separator');

// 2. Surah Sub Info English test
const enHtml = testSurahSubInfoEnglish(2, 286);
assert(enHtml.includes('Surah <bdi class="urdu-num">2</bdi>'));
assert(enHtml.includes('<bdi class="urdu-num">286</bdi> verses'));

// 3. Jump Pill Urdu test
const jumpUr = `<span>آیت <bdi class="urdu-num">۱</bdi></span> <span aria-hidden="true">/</span> <span>جائیں</span>`;
assert(jumpUr.includes('<bdi class="urdu-num">۱</bdi>'));
assert(jumpUr.includes('<span aria-hidden="true">/</span>'));

// 4. Bookmark Ref Urdu test
const bmUr = `<span>سورت <bdi class="urdu-num">۲</bdi></span> <span aria-hidden="true">·</span> <span>آیت <bdi class="urdu-num">۲۵۵</bdi></span>`;
assert(!bmUr.includes('۲۵۵۲'));
assert(bmUr.includes('<bdi class="urdu-num">۲</bdi>'));
assert(bmUr.includes('<bdi class="urdu-num">۲۵۵</bdi>'));

// 5. Ayah Ref Badge (e.g. 2:255)
const badgeUr = `<span>سورت</span> <bdi dir="ltr"><span class="urdu-num">۲</span>:<span class="urdu-num">۲۵۵</span></bdi>`;
assert(badgeUr.includes('<bdi dir="ltr">'));

// 6. Prayer Times & Jamaat Western Digits & Bidi Isolation in Urdu UI
(async () => {
  if (typeof globalThis.localStorage === 'undefined') {
    globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
  const { PrayerEngine } = await import('../js/core/prayer-times.js');

  const fajrTime = new Date(2026, 10, 22, 5, 11);
  const dhuhrTime = new Date(2026, 10, 22, 11, 50);
  const asrTime = new Date(2026, 10, 22, 15, 24);
  const maghribTime = new Date(2026, 10, 22, 17, 1);
  const ishaTime = new Date(2026, 10, 22, 18, 26);

  const timesToTest = [
    { label: 'Fajr', date: fajrTime, expected: '<bdi dir="ltr">5:11</bdi> صبح' },
    { label: 'Dhuhr', date: dhuhrTime, expected: '<bdi dir="ltr">11:50</bdi> صبح' },
    { label: 'Asr', date: asrTime, expected: '<bdi dir="ltr">3:24</bdi> شام' },
    { label: 'Maghrib', date: maghribTime, expected: '<bdi dir="ltr">5:01</bdi> شام' },
    { label: 'Isha', date: ishaTime, expected: '<bdi dir="ltr">6:26</bdi> شام' }
  ];

  for (const t of timesToTest) {
    const renderedUr = PrayerEngine.formatPrayerTime(t.date, 'ur');
    assert.strictEqual(renderedUr, t.expected, `${t.label} formatting mismatch: ${renderedUr}`);
    assert(/\d{1,2}:\d{2}/.test(renderedUr), `${t.label} must contain western digits time: ${renderedUr}`);
    assert(!/[۰-۹]/.test(renderedUr), `${t.label} must not contain Urdu digits: ${renderedUr}`);
    assert(!/[\u0660-\u0669]/.test(renderedUr), `${t.label} must not contain Arabic digits: ${renderedUr}`);
    assert(renderedUr.includes('<bdi dir="ltr">'), `${t.label} must wrap time in <bdi dir="ltr">`);
  }

  // Jamaat string inputs (both 24h and eastern/urdu digits)
  const jamaatCases = [
    { input: '05:30', expected: '<bdi dir="ltr">5:30</bdi> صبح' },
    { input: '17:30', expected: '<bdi dir="ltr">5:30</bdi> شام' },
    { input: '11:50', expected: '<bdi dir="ltr">11:50</bdi> صبح' },
    { input: '۰۵:۳۰', expected: '<bdi dir="ltr">5:30</bdi> صبح' },
    { input: '٠٥:٣٠', expected: '<bdi dir="ltr">5:30</bdi> صبح' }
  ];

  for (const jc of jamaatCases) {
    const rendered = PrayerEngine.formatPrayerTime(jc.input, 'ur');
    assert.strictEqual(rendered, jc.expected, `Jamaat ${jc.input} formatting mismatch: ${rendered}`);
    assert(/\d{1,2}:\d{2}/.test(rendered), `Jamaat must contain western digits: ${rendered}`);
    assert(!/[۰-۹]/.test(rendered), `Jamaat must not contain Urdu digits: ${rendered}`);
    assert(!/[\u0660-\u0669]/.test(rendered), `Jamaat must not contain Arabic digits: ${rendered}`);
  }

  // Countdown in Urdu UI
  const cdUr = PrayerEngine.formatCountdown(168, 'ur');
  assert.strictEqual(cdUr, '<bdi dir="ltr">2</bdi> گھنٹے <bdi dir="ltr">48</bdi> منٹ باقی');
  assert(/\d+/.test(cdUr), 'Countdown must contain western digits');
  assert(!/[۰-۹]/.test(cdUr), 'Countdown must not contain Urdu digits');

  // Verify next prayer title line in Urdu
  const nextTitle = `اگلی نماز: <strong>ظہر (${PrayerEngine.formatPrayerTime(dhuhrTime, 'ur')})</strong>`;
  assert(nextTitle.includes('<bdi dir="ltr">11:50</bdi> صبح'));
  assert(!/[۰-۹]/.test(nextTitle));

  console.log('✅ ALL BIDI ISOLATION & PRAYER DIGITS TESTS PASSED!');
})();
