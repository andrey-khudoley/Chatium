// @shared

export type DurationType = 'days' | 'months' | 'years';
export type CalendarPeriodType = 'current' | 'next' | 'specific';

export interface PeriodOption {
  label: string;
  startDate: Date;
  endDate: Date;
  value: string;
}

/**
 * Получает последний день месяца
 */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Генерирует опции периодов для тарифа
 */
export function generatePeriodOptions(
  durationType: DurationType,
  durationValue: number,
  calendarPeriod: CalendarPeriodType = 'current',
  specificPeriodStart?: number
): PeriodOption[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const options: PeriodOption[] = [];

  if (durationType === 'days') {
    // Для дней - просто с текущего момента
    const startDate = new Date(now);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + durationValue);
    
    options.push({
      label: `С ${formatDate(startDate)} по ${formatDate(endDate)}`,
      startDate,
      endDate,
      value: 'immediate'
    });
  } else if (durationType === 'months') {
    if (calendarPeriod === 'specific' && specificPeriodStart) {
      // Для кварталов и специфических периодов
      const quarters = generateQuarters(specificPeriodStart, durationValue);
      
      for (const quarter of quarters) {
        const startDate = new Date(quarter.year, quarter.startMonth, 1);
        const endDate = new Date(quarter.year, quarter.endMonth + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        
        const isCurrent = isPeriodCurrent(startDate, endDate, now);
        const isPast = endDate < now;
        
        if (!isPast) {
          options.push({
            label: `${quarter.name} ${quarter.year} (${formatDate(startDate)} - ${formatDate(endDate)})${isCurrent ? ' — текущий' : ''}`,
            startDate,
            endDate,
            value: `${quarter.year}-${quarter.startMonth}`
          });
        }
      }
    } else {
      // Обычные месяцы
      // Текущий период
      const currentStart = new Date(currentYear, currentMonth, 1);
      const currentEnd = new Date(currentYear, currentMonth + durationValue, 0);
      currentEnd.setHours(23, 59, 59, 999);
      
      const isCurrentActive = currentEnd >= now;
      
      if (isCurrentActive) {
        options.push({
          label: formatPeriodLabel(currentStart, currentEnd, true),
          startDate: currentStart,
          endDate: currentEnd,
          value: 'current'
        });
      }
      
      // Следующий период
      const nextStart = new Date(currentYear, currentMonth + 1, 1);
      const nextEnd = new Date(currentYear, currentMonth + 1 + durationValue, 0);
      nextEnd.setHours(23, 59, 59, 999);
      
      options.push({
        label: formatPeriodLabel(nextStart, nextEnd, false),
        startDate: nextStart,
        endDate: nextEnd,
        value: 'next'
      });
    }
  } else if (durationType === 'years') {
    // Текущий год (если еще не закончился)
    const currentStart = new Date(currentYear, 0, 1);
    const currentEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);
    
    if (currentEnd >= now) {
      options.push({
        label: `${currentYear} год (текущий)`,
        startDate: currentStart,
        endDate: currentEnd,
        value: 'current'
      });
    }
    
    // Следующий год
    const nextStart = new Date(currentYear + 1, 0, 1);
    const nextEnd = new Date(currentYear + 1, 11, 31, 23, 59, 59, 999);
    
    options.push({
      label: `${currentYear + 1} год`,
      startDate: nextStart,
      endDate: nextEnd,
      value: 'next'
    });
  }
  
  return options;
}

/**
 * Генерирует кварталы на основе начального месяца
 */
function generateQuarters(startMonth: number, durationMonths: number): Array<{year: number, startMonth: number, endMonth: number, name: string}> {
  const quarters = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Генерируем кварталы для текущего, прошлого и следующего года
  for (let year = currentYear - 1; year <= currentYear + 1; year++) {
    for (let m = 0; m < 12; m += durationMonths) {
      if (m + 1 === startMonth || (startMonth - 1) % durationMonths === m % durationMonths) {
        const quarterNum = Math.floor(m / durationMonths) + 1;
        const quarterNames: Record<number, Record<number, string>> = {
          3: { 0: 'I квартал', 1: 'II квартал', 2: 'III квартал', 3: 'IV квартал' },
          6: { 0: 'Первое полугодие', 1: 'Второе полугодие' }
        };
        
        const name = quarterNames[durationMonths]?.[Math.floor(m / durationMonths)] || 
                    `Период ${quarterNum}`;
        
        quarters.push({
          year,
          startMonth: m,
          endMonth: m + durationMonths - 1,
          name
        });
      }
    }
  }
  
  return quarters;
}

/**
 * Проверяет, является ли период текущим
 */
function isPeriodCurrent(startDate: Date, endDate: Date, now: Date): boolean {
  return startDate <= now && endDate >= now;
}

/**
 * Форматирует метку периода
 */
function formatPeriodLabel(startDate: Date, endDate: Date, isCurrent: boolean): string {
  const months = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 
                  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  
  const startMonth = months[startDate.getMonth()];
  const endMonth = months[endDate.getMonth()];
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  
  let label = '';
  if (startMonth === endMonth && startDate.getMonth() === endDate.getMonth()) {
    label = `${startMonth} ${startYear}`;
  } else if (startYear === endYear) {
    label = `${startMonth} - ${endMonth} ${startYear}`;
  } else {
    label = `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
  }
  
  return isCurrent ? `${label} (текущий)` : label;
}

/**
 * Форматирует дату
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Проверяет, есть ли активная подписка
 */
export function isSubscriptionActive(subscription: { status: string; startDate: Date; endDate: Date } | null): boolean {
  if (!subscription || subscription.status !== 'active') return false;
  
  const now = new Date();
  return subscription.startDate <= now && subscription.endDate >= now;
}

/**
 * Проверяет, истекает ли подписка в ближайшие N дней
 */
export function isExpiringSoon(subscription: { endDate: Date } | null, days: number = 3): boolean {
  if (!subscription) return false;
  
  const now = new Date();
  const warningDate = new Date(now);
  warningDate.setDate(warningDate.getDate() + days);
  
  return subscription.endDate <= warningDate && subscription.endDate >= now;
}

/**
 * Получает дату окончания периода на основе типа
 */
export function calculatePeriodEnd(
  durationType: DurationType,
  durationValue: number,
  startDate: Date
): Date {
  const endDate = new Date(startDate);
  
  if (durationType === 'days') {
    endDate.setDate(endDate.getDate() + durationValue);
  } else if (durationType === 'months') {
    endDate.setMonth(endDate.getMonth() + durationValue);
  } else if (durationType === 'years') {
    endDate.setFullYear(endDate.getFullYear() + durationValue);
  }
  
  // Устанавливаем конец дня
  endDate.setHours(23, 59, 59, 999);
  
  return endDate;
}
