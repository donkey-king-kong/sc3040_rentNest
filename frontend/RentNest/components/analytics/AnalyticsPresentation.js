export const displayMetric = (value, unit, definition, reason, basis = 'snapshot') => ({
  value: value ?? null, unit, definition, reason: value == null ? reason : null, basis,
  availability: value == null ? 'unavailable' : 'available',
});

export const displayChart = (points, unit, definition, reason, basis = 'period') => ({
  availability: Array.isArray(points) ? 'available' : 'unavailable',
  unit, definition, reason: Array.isArray(points) ? null : reason, basis,
  points: (points || []).map(point => ({ bucket: point.label, value: point.value ?? point.status ?? null })),
});
