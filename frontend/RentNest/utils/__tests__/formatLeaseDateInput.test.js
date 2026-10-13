import { formatLeaseDateInput } from '../formatLeaseDateInput';

it.each(['02', '15', '17'])('adds a dash after day %s', day => {
  expect(formatLeaseDateInput(day)).toBe(day + '-');
});

it('formats a date while typing each digit', () => {
  let value = '';
  const steps = ['0', '02-', '02-1', '02-10-', '02-10-2', '02-10-20', '02-10-202', '02-10-2026'];
  [...'02102026'].forEach((digit, index) => {
    value = formatLeaseDateInput(value + digit, value);
    expect(value).toBe(steps[index]);
  });
});

it.each(['02102026', '02-10-2026', '02/10/2026'])('formats pasted input %s', text => {
  expect(formatLeaseDateInput(text)).toBe('02-10-2026');
});

it('limits input to eight digits and removes non-date characters', () => {
  expect(formatLeaseDateInput('02a10b2026789')).toBe('02-10-2026');
});

it('allows repeated Backspace through automatically added dashes', () => {
  let value = '02-10-2026';
  for (let count = 0; value && count < 12; count++) {
    const next = formatLeaseDateInput(value.slice(0, -1), value);
    expect(next.length).toBeLessThan(value.length);
    value = next;
  }
  expect(value).toBe('');
});

it('supports clearing, replacing a date and retyping a separator boundary', () => {
  expect(formatLeaseDateInput('', '02-10-2026')).toBe('');
  expect(formatLeaseDateInput('15112027', '02-10-2026')).toBe('15-11-2027');
  expect(formatLeaseDateInput('02', '02-')).toBe('02');
  expect(formatLeaseDateInput('021', '02')).toBe('02-1');
});

it('leaves invalid calendar dates for the existing date validation to reject', () => {
  expect(formatLeaseDateInput('31022026')).toBe('31-02-2026');
});
