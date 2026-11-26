// Theme colors
export const COLORS = {
  primary: '#0B3D26',
  primaryHover: '#14502F',
  primaryActive: '#2E6B49',
  primaryLight: '#4F8A68',
  primaryDark: '#072618',
  secondary: '#072618',
}

// Common classes for reuse
export const THEME = {
  button: {
    primary: 'bg-[#0B3D26] hover:bg-[#14502F] text-white',
    primaryOutline: 'border-2 border-[#0B3D26] text-[#0B3D26] hover:bg-[#0B3D26] hover:text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
  },
  fab: 'fixed bottom-6 right-6 w-14 h-14 bg-[#0B3D26] hover:bg-[#14502F] text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50',
  link: 'text-[#0B3D26] hover:text-[#14502F]',
  badge: {
    primary: 'bg-[#0B3D26] text-white',
    secondary: 'bg-gray-100 text-gray-700',
  },
  gradient: 'bg-gradient-to-r from-[#0B3D26] to-[#4F8A68]',
}
