export function generateRandomCedulaCode(): string {
  const digits = Math.floor(Math.random() * 1000000000)
    .toString()
    .padStart(9, '0');
  return digits;
}

export function isValidCedulaCode(value: string): boolean {
  return /^([VE]-\d{8}|\d{9})$/.test(value);
}

export function normalizeCedulaInput(value: string): string {
  const cleaned = value.trim().replace(/[\s.]+/g, '').toUpperCase();

  const venezuelaMatch = cleaned.match(/^([VE])[-]?(\d{8})$/);
  if (venezuelaMatch) {
    return `${venezuelaMatch[1]}-${venezuelaMatch[2]}`;
  }

  const numericMatch = cleaned.match(/^\d{9}$/);
  if (numericMatch) {
    return cleaned;
  }

  return cleaned;
}
