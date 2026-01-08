function getWIBRange(year, month) {
  // WIB = UTC+7
  const start = new Date(Date.UTC(year, month - 1, 1, -7, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, -7, 0, 0));
  return { start, end };
}
