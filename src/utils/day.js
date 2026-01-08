// src/utils/day.js
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import tz from 'dayjs/plugin/timezone.js';
import duration from 'dayjs/plugin/duration.js';

dayjs.extend(utc);
dayjs.extend(tz);
dayjs.extend(duration);
dayjs.tz.setDefault('Asia/Jakarta');

export { dayjs };

// ubah "HH:mm" -> menit sejak 00:00
export function hhmmToMinutes(hhmm = '09:00') {
  const [h, m] = (hhmm || '00:00').split(':').map(Number);
  return (h * 60) + (m || 0);
}

// jadikan menit-of-day ke dayjs pada tanggal tertentu
export function minutesToDate(dateStr, minutes) {
  const h = Math.floor((minutes || 0) / 60);
  const m = (minutes || 0) % 60;
  return dayjs.tz(`${dateStr}T00:00:00`).hour(h).minute(m).second(0).millisecond(0);
}
