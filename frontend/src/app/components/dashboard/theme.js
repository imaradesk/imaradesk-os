import { useTheme } from '../ThemeContext'

// Chart colours: the brand purple in three steps plus neutrals. Red and amber are
// reserved for values that need attention. The purple has no contrast on the dark
// #1b1f24 card, so dark mode swaps it for three steps of neutral gray.
export function useChartTheme() {
  const { isDark } = useTheme()
  return isDark
    ? {
        isDark,
        brand: '#e5e7eb',
        brand2: '#9ca3af',
        brand3: '#5b6472',
        brandSoft: 'rgba(229,231,235,0.08)',
        brandRgb: '229,231,235',
        amber: '#fbbf24',
        red: '#f87171',
        gray: '#3a414b',
        grid: '#2a3038',
        axis: '#7d8693',
        track: '#2a3038',
        tooltipBg: '#1b1f24',
        tooltipBorder: '#363d47',
        tooltipText: '#e5e7eb',
        brandText: 'text-gray-100',
      }
    : {
        isDark,
        brand: '#0B3D26',
        brand2: '#7FB394',
        brand3: '#dccbdc',
        brandSoft: 'rgba(11, 61, 38,0.05)',
        brandRgb: '11,61,38',
        amber: '#f59e0b',
        red: '#ef4444',
        gray: '#d1d5db',
        grid: '#f3f4f6',
        axis: '#94a3b8',
        track: '#f1f5f9',
        tooltipBg: '#ffffff',
        tooltipBorder: '#e2e8f0',
        tooltipText: '#111827',
        brandText: 'text-[#0B3D26]',
      }
}
