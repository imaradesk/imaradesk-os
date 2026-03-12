// Theme colors
export const COLORS = {
  primary: '#4a154b',
  primaryHover: '#5a235c',
  primaryActive: '#6e3770',
  primaryLight: '#825084',
  primaryDark: '#320a32',
  secondary: '#320a32',
}

// Common classes for reuse
export const THEME = {
  button: {
    primary: 'bg-[#4a154b] hover:bg-[#5a235c] text-white',
    primaryOutline: 'border-2 border-[#4a154b] text-[#4a154b] hover:bg-[#4a154b] hover:text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
  },
  fab: 'fixed bottom-6 right-6 w-14 h-14 bg-[#4a154b] hover:bg-[#5a235c] text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50',
  link: 'text-[#4a154b] hover:text-[#5a235c]',
  badge: {
    primary: 'bg-[#4a154b] text-white',
    secondary: 'bg-gray-100 text-gray-700',
  },
  gradient: 'bg-gradient-to-r from-[#4a154b] to-[#825084]',
}
