import { useState, useEffect } from 'react'

// Границы периодов дня. Возвращает: dawn, morning, day, evening, dusk, night
function resolvePeriod(hour) {
  if (hour >= 5 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 17) return 'day'
  if (hour >= 17 && hour < 20) return 'evening'
  if (hour >= 20 && hour < 23) return 'dusk'
  return 'night'
}

export const PERIODS = {
  dawn: {
    label: 'Раннее утро',
    greeting: 'Доброе утро',
    sub: 'Ещё тихо. Хороший момент, чтобы начать спокойно.',
    gradient: ['#FFB88C', '#FF7E87', '#8E6BFF'],
    accent: '#FF7E87',
    tint: 'rgba(255, 126, 135, 0.14)',
    text: '#2B1B2E',
    textSoft: 'rgba(43, 27, 46, 0.62)',
    surface: 'rgba(255, 255, 255, 0.62)',
    surfaceBorder: 'rgba(255, 255, 255, 0.55)',
    scheme: 'light',
  },
  morning: {
    label: 'Утро',
    greeting: 'Доброе утро',
    sub: 'День только разгоняется.',
    gradient: ['#8FD3F4', '#84FAB0', '#FFFFFF'],
    accent: '#0A84FF',
    tint: 'rgba(10, 132, 255, 0.10)',
    text: '#0B1A2A',
    textSoft: 'rgba(11, 26, 42, 0.58)',
    surface: 'rgba(255, 255, 255, 0.66)',
    surfaceBorder: 'rgba(255, 255, 255, 0.6)',
    scheme: 'light',
  },
  day: {
    label: 'День',
    greeting: 'Добрый день',
    sub: 'Самое продуктивное время.',
    gradient: ['#6DD5FA', '#2980B9', '#E8F6FF'],
    accent: '#0A84FF',
    tint: 'rgba(10, 132, 255, 0.10)',
    text: '#0B1A2A',
    textSoft: 'rgba(11, 26, 42, 0.58)',
    surface: 'rgba(255, 255, 255, 0.7)',
    surfaceBorder: 'rgba(255, 255, 255, 0.65)',
    scheme: 'light',
  },
  evening: {
    label: 'Вечер',
    greeting: 'Добрый вечер',
    sub: 'Можно немного сбавить темп.',
    gradient: ['#FF9A56', '#FF6B95', '#5D4E9E'],
    accent: '#FF6B95',
    tint: 'rgba(255, 107, 149, 0.14)',
    text: '#2B1B2E',
    textSoft: 'rgba(43, 27, 46, 0.6)',
    surface: 'rgba(255, 255, 255, 0.55)',
    surfaceBorder: 'rgba(255, 255, 255, 0.5)',
    scheme: 'light',
  },
  dusk: {
    label: 'Сумерки',
    greeting: 'Хорошего вечера',
    sub: 'День почти закончен.',
    gradient: ['#232A5C', '#5E3A7A', '#B15A7D'],
    accent: '#BF5AF2',
    tint: 'rgba(191, 90, 242, 0.18)',
    text: '#F4EFFA',
    textSoft: 'rgba(244, 239, 250, 0.62)',
    surface: 'rgba(30, 22, 48, 0.55)',
    surfaceBorder: 'rgba(255, 255, 255, 0.14)',
    scheme: 'dark',
  },
  night: {
    label: 'Ночь',
    greeting: 'Доброй ночи',
    sub: 'Пора бы уже отдыхать.',
    gradient: ['#03040F', '#0B1130', '#1B2A57'],
    accent: '#5E5CE6',
    tint: 'rgba(94, 92, 230, 0.2)',
    text: '#EDEEF7',
    textSoft: 'rgba(237, 238, 247, 0.55)',
    surface: 'rgba(20, 22, 40, 0.55)',
    surfaceBorder: 'rgba(255, 255, 255, 0.1)',
    scheme: 'dark',
  },
}

export function useDayTheme() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const period = resolvePeriod(now.getHours())
  return { period, theme: PERIODS[period], now }
}
