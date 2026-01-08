// src/validators/checkclock.schema.js
const CT = ['IN', 'OUT'];
const AT = ['WFO', 'WFH', 'VISIT', 'ONSITE'];

export function parseCheckclock(body) {
  const errors = {};

  const checkType = String(body.checkType || '').toUpperCase();
  if (!CT.includes(checkType)) errors.checkType = 'checkType harus IN atau OUT';

  const attendanceType = body.attendanceType ? String(body.attendanceType).toUpperCase() : undefined;
  if (attendanceType && !AT.includes(attendanceType)) {
    errors.attendanceType = 'attendanceType tidak valid';
  }

  const latitude  = body.latitude  !== undefined ? Number(body.latitude)  : undefined;
  const longitude = body.longitude !== undefined ? Number(body.longitude) : undefined;
  if (Number.isNaN(latitude))  errors.latitude  = 'latitude harus angka';
  if (Number.isNaN(longitude)) errors.longitude = 'longitude harus angka';

  // time opsional (ISO)
  let time;
  if (body.time) {
    const t = new Date(body.time);
    if (isNaN(t.getTime())) errors.time = 'time tidak valid';
    else time = t.toISOString();
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      checkType,
      attendanceType,
      locationName: body.locationName || undefined,
      address: body.address || undefined,
      latitude,
      longitude,
      workNote: body.workNote || undefined,
      time,
    }
  };
}
