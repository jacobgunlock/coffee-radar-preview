// Calendar days in the cafes' time zone, including today in the selected window.
(function (root) {
  const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' });
  function dayNumber(value) {
    if (!value) return NaN;
    const text = String(value);
    let day;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) day = text;
    else {
      const date = new Date(text);
      if (!Number.isFinite(date.getTime())) return NaN;
      day = dayFormat.format(date);
    }
    const parsed = Date.parse(day + 'T00:00:00Z');
    if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== day) return NaN;
    return parsed / 86400000;
  }
  function sourceDate(drink) {
    return drink.source_type === 'instagram'
      ? drink.source_posted_at || drink.drop_date : drink.drop_date;
  }
  function matches(drink, days, now = new Date()) {
    if (days >= 30) return true; // 30+ means every currently visible listing.
    const age = dayNumber(now) - dayNumber(sourceDate(drink));
    return Number.isFinite(age) && age >= 0 && age < days;
  }
  function label(days) {
    if (days >= 30) return '30+ days';
    return days % 7 === 0 ? `Last ${days / 7} week${days === 7 ? '' : 's'}` : `Last ${days} days`;
  }
  const api = { matches, label, sourceDate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DropRecency = api;
})(globalThis);
