export function formatPeriod(minYear, maxYear, isCurrent) {
  if (!minYear) return '-'
  if (isCurrent && maxYear !== null) return `${minYear}-Present`
  if (!maxYear || minYear === maxYear) return String(minYear)
  return `${minYear}-${maxYear}`
}
