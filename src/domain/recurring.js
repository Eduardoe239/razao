const ISO = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value) {
  if (typeof value !== 'string' || !ISO.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function occurrenceDate(year, monthIndex, day) {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(Math.min(Math.max(1, day), lastDay)).padStart(2, '0')}`;
}

export function validateRecurringRule(rule) {
  if (!rule || typeof rule !== 'object') return { valid: false, reason: 'Regra inválida.' };
  if (typeof rule.id !== 'string' || !rule.id.trim()) return { valid: false, reason: 'Identificador obrigatório.' };
  if (typeof rule.description !== 'string' || !rule.description.trim()) return { valid: false, reason: 'Descrição obrigatória.' };
  if (!Number.isSafeInteger(rule.amountCents) || rule.amountCents <= 0) return { valid: false, reason: 'O valor deve ser positivo e estar em centavos inteiros.' };
  if (rule.type !== undefined && !['receita', 'despesa'].includes(rule.type)) return { valid: false, reason: 'Tipo recorrente inválido.' };
  if (!Number.isInteger(rule.dayOfMonth) || rule.dayOfMonth < 1 || rule.dayOfMonth > 31) return { valid: false, reason: 'Dia do mês deve ficar entre 1 e 31.' };
  if (rule.startDate && !validDate(rule.startDate)) return { valid: false, reason: 'Data inicial inválida.' };
  if (rule.endDate && !validDate(rule.endDate)) return { valid: false, reason: 'Data final inválida.' };
  if (rule.startDate && rule.endDate && rule.endDate < rule.startDate) return { valid: false, reason: 'A data final não pode preceder a inicial.' };
  return { valid: true };
}

export function generateRecurringOccurrences({ recurring = [], transactions = [], fromISO, monthsAhead = 3 }) {
  if (!validDate(fromISO)) throw new Error('fromISO deve ser uma data ISO válida.');
  if (!Number.isInteger(monthsAhead) || monthsAhead < 0 || monthsAhead > 36) throw new Error('monthsAhead deve ficar entre 0 e 36.');
  const existing = new Set();
  for (const transaction of transactions) {
    if (transaction?.recurringId && transaction?.recurringOccurrenceDate) {
      existing.add(`${transaction.recurringId}:${transaction.recurringOccurrenceDate}`);
    }
    if (typeof transaction?.idempotencyKey === 'string') {
      const match = transaction.idempotencyKey.match(/^recurring:(.+):(\d{4}-\d{2}-\d{2})$/);
      if (match) existing.add(`${match[1]}:${match[2]}`);
    }
  }
  const start = new Date(`${fromISO}T00:00:00Z`);
  const result = [];
  for (const rule of recurring) {
    if (!rule?.active) continue;
    const normalizedRule = { ...rule, type: rule.type || 'despesa' };
    const validation = validateRecurringRule(normalizedRule);
    if (!validation.valid) continue;
    for (let offset = 0; offset <= monthsAhead; offset++) {
      const month = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1));
      const date = occurrenceDate(month.getUTCFullYear(), month.getUTCMonth(), rule.dayOfMonth);
      if (date < fromISO || (rule.startDate && date < rule.startDate) || (rule.endDate && date > rule.endDate)) continue;
      if (existing.has(`${rule.id}:${date}`) || existing.has(`recurring:${rule.id}:${date}`)) continue;
      result.push({
        id: `rec-${rule.id}-${date}`, sourceType: 'recurring', sourceId: rule.id,
        recurringId: rule.id, recurringOccurrenceDate: date, description: rule.description,
        date, amountCents: rule.amountCents, type: normalizedRule.type, status: 'pendente',
        accountId: rule.accountId, categoryId: rule.categoryId || undefined
      });
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description));
}
