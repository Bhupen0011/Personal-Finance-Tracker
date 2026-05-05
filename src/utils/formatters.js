import { monthNames } from './constants';

export function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(value = 0) {
  return `INR ${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)}`;
}

export function formatSignedAmount(value = 0, type = 'expense') {
  const prefix = type === 'income' ? '+' : '-';
  return `${prefix} ${formatCurrency(value)}`;
}

export function formatDate(value) {
  if (!value) {
    return '--';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function getMonthLabel(month, year) {
  if (!month || !year) {
    return '';
  }

  return `${monthNames[month - 1]} ${year}`;
}

export function getTransactionStatus(type) {
  return type === 'income' ? 'Received' : 'Completed';
}

export function downloadTransactionsCsv(transactions, fileName = 'transactions-report.csv') {
  const rows = [
    ['Title', 'Category', 'Type', 'Amount', 'Date', 'Notes'],
    ...transactions.map((transaction) => [
      transaction.title,
      transaction.category,
      transaction.type,
      transaction.amount,
      formatDate(transaction.date),
      transaction.notes || '',
    ]),
  ];

  const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
