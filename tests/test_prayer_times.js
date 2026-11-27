/**
 * tests/test_prayer_times.js
 * Unit test for Islamic prayer times offline calculation using adhan (Lahore coordinates 31.5204, 74.3587).
 * Verifies exact wiring, Karachi calculation method, and Hanafi Asr standard.
 */
import assert from 'node:assert';
import { Coordinates, CalculationMethod, PrayerTimes, Madhab, Prayer } from '../js/vendor/adhan.esm.js';

console.log('=== Running Prayer Times Engine Unit Tests ===');

const LAHORE_LAT = 31.5204;
const LAHORE_LNG = 74.3587;
const coords = new Coordinates(LAHORE_LAT, LAHORE_LNG);

const params = CalculationMethod.Karachi();
params.madhab = Madhab.Hanafi;

function formatHHMM(dt) {
  const h = String(dt.getHours()).padStart(2, '0');
  const m = String(dt.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// 1. Test Autumn date (Nov 21, 2026)
{
  const testDate = new Date(2026, 10, 21);
  const pt = new PrayerTimes(coords, testDate, params);

  assert.strictEqual(formatHHMM(pt.fajr), '05:11', 'Fajr on 2026-11-21 in Lahore must be 05:11');
  assert.strictEqual(formatHHMM(pt.sunrise), '06:35', 'Sunrise on 2026-11-21 in Lahore must be 06:35');
  assert.strictEqual(formatHHMM(pt.dhuhr), '11:49', 'Dhuhr on 2026-11-21 in Lahore must be 11:49');
  assert.strictEqual(formatHHMM(pt.asr), '15:24', 'Asr (Hanafi) on 2026-11-21 in Lahore must be 15:24');
  assert.strictEqual(formatHHMM(pt.maghrib), '17:01', 'Maghrib on 2026-11-21 in Lahore must be 17:01');
  assert.strictEqual(formatHHMM(pt.isha), '18:26', 'Isha on 2026-11-21 in Lahore must be 18:26');
  console.log('PASS: Nov 21, 2026 Lahore times match ground truth.');
}

// 2. Test Spring date (March 1, 2026)
{
  const testDate = new Date(2026, 2, 1);
  const pt = new PrayerTimes(coords, testDate, params);

  assert.strictEqual(formatHHMM(pt.fajr), '05:09', 'Fajr on 2026-03-01 in Lahore must be 05:09');
  assert.strictEqual(formatHHMM(pt.sunrise), '06:30', 'Sunrise on 2026-03-01 in Lahore must be 06:30');
  assert.strictEqual(formatHHMM(pt.dhuhr), '12:16', 'Dhuhr on 2026-03-01 in Lahore must be 12:16');
  assert.strictEqual(formatHHMM(pt.asr), '16:21', 'Asr (Hanafi) on 2026-03-01 in Lahore must be 16:21');
  assert.strictEqual(formatHHMM(pt.maghrib), '18:00', 'Maghrib on 2026-03-01 in Lahore must be 18:00');
  assert.strictEqual(formatHHMM(pt.isha), '19:21', 'Isha on 2026-03-01 in Lahore must be 19:21');
  console.log('PASS: March 1, 2026 Lahore times match ground truth.');
}

// 3. Test Summer Solstice date (June 21, 2026)
{
  const testDate = new Date(2026, 5, 21);
  const pt = new PrayerTimes(coords, testDate, params);

  assert.strictEqual(formatHHMM(pt.fajr), '03:19', 'Fajr on 2026-06-21 in Lahore must be 03:19');
  assert.strictEqual(formatHHMM(pt.sunrise), '04:58', 'Sunrise on 2026-06-21 in Lahore must be 04:58');
  assert.strictEqual(formatHHMM(pt.dhuhr), '12:05', 'Dhuhr on 2026-06-21 in Lahore must be 12:05');
  assert.strictEqual(formatHHMM(pt.asr), '17:01', 'Asr (Hanafi) on 2026-06-21 in Lahore must be 17:01');
  assert.strictEqual(formatHHMM(pt.maghrib), '19:11', 'Maghrib on 2026-06-21 in Lahore must be 19:11');
  assert.strictEqual(formatHHMM(pt.isha), '20:50', 'Isha on 2026-06-21 in Lahore must be 20:50');
  console.log('PASS: June 21, 2026 Lahore times match ground truth.');
}

console.log('ALL PRAYER TIMES UNIT TESTS PASSED!');
