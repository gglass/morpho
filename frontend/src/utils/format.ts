export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  
  return formatDate(dateString);
};

export const getDateRangeForFilter = (filter: 'all-time' | 'last-year' | 'year-to-date'): { start_date?: string; end_date?: string } => {
  if (filter === 'all-time') {
    return {};
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  if (filter === 'last-year') {
    const lastYearStart = new Date(currentYear - 1, 0, 1);
    const lastYearEnd = new Date(currentYear - 1, 11, 31, 23, 59, 59);
    return {
      start_date: lastYearStart.toISOString(),
      end_date: lastYearEnd.toISOString(),
    };
  }

  if (filter === 'year-to-date') {
    const yearStart = new Date(currentYear, 0, 1);
    const today = new Date(currentYear, currentMonth, currentDay, 23, 59, 59);
    return {
      start_date: yearStart.toISOString(),
      end_date: today.toISOString(),
    };
  }

  return {};
};
