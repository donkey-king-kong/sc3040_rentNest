export const formatLeaseDateInput = (text, previous = '') => {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  const deleting = text.length < previous.length;
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4);

  let formatted = day;
  if (digits.length > 2 || (digits.length === 2 && !deleting)) formatted += '-' + month;
  if (digits.length > 4 || (digits.length === 4 && !deleting)) formatted += '-' + year;
  return formatted;
};
