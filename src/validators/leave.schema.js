const LT = ['ABSENT', 'ANNUAL_LEAVE', 'SICK_LEAVE'];

export function parseLeave(body) {
  const errors = {};
  const type = String(body.type || '').toUpperCase();
  if (!LT.includes(type)) errors.type = 'type harus ABSENT | ANNUAL_LEAVE | SICK_LEAVE';

  const s = body.startDate ? new Date(body.startDate) : null;
  const e = body.endDate   ? new Date(body.endDate)   : null;
  if (!s || isNaN(s.getTime())) errors.startDate = 'startDate invalid (ISO DateTime)';
  if (!e || isNaN(e.getTime())) errors.endDate   = 'endDate invalid (ISO DateTime)';
  if (!errors.startDate && !errors.endDate && s > e) errors.range = 'startDate tidak boleh > endDate';

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      type,
      startDate: s.toISOString(),
      endDate: e.toISOString(),
      note: body.note || undefined,
    }
  };
}
