import { Types } from 'mongoose';

export function getMonthRange(month, year) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

export function getPreviousMonth(month, year) {
  const date = new Date(year, month - 2, 1);
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

export function getRollingMonths(month, year, length = 6) {
  return Array.from({ length }, (_, index) => {
    const date = new Date(year, month - length + index, 1);
    return {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      label: date.toLocaleDateString('en-US', { month: 'short' }),
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    };
  });
}

export function buildTransactionFilters({ userId, search, category, type, startDate, endDate }) {
  const filters = {
    userId: new Types.ObjectId(userId),
  };

  if (search) {
    filters.$or = [
      { title: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
    ];
  }

  if (category) {
    filters.category = category;
  }

  if (type) {
    filters.type = type;
  }

  if (startDate || endDate) {
    filters.date = {};

    if (startDate) {
      filters.date.$gte = new Date(startDate);
    }

    if (endDate) {
      filters.date.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }
  }

  return filters;
}

export function calculatePercentageChange(current, previous) {
  if (!previous) {
    return current ? 100 : 0;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}
