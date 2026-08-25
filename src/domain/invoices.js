// Ciclo de fatura de cartão de crédito.
// Uma fatura é identificada pela chave do mês em que ela FECHA (invoiceKey).
export function invoiceKeyForDate(dateStr, closingDay) {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (d <= closingDay) return `${y}-${String(m).padStart(2, "0")}`;
  const dt = new Date(y, m, 1); // mês seguinte
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

// Se dueDay < closingDay, o vencimento cai no mês seguinte ao fechamento
// (convenção mais comum em cartões brasileiros: fecha dia 25, vence dia 5).
export function invoiceDueDate(invoiceKey, dueDay, closingDay) {
  const [y, m] = invoiceKey.split("-").map(Number);
  if (dueDay < closingDay) {
    const dt = new Date(y, m, dueDay);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
  }
  return `${y}-${String(m).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
}
