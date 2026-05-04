import React from 'react'
import { icons } from 'lucide-react'

const CATEGORY_ICONS = [
  'Folder', 'FolderOpen', 'FileText', 'Book', 'BookOpen', 'Bookmark',
  'Rocket', 'Zap', 'Star', 'Heart', 'Shield', 'Lock',
  'Globe', 'Code', 'Terminal', 'Database', 'Server', 'Cloud',
  'Settings', 'Wrench', 'Puzzle', 'Lightbulb', 'Target', 'Flag',
  'Users', 'UserCheck', 'Mail', 'Bell', 'MessageCircle', 'Phone',
  'CreditCard', 'ShoppingCart', 'Package', 'Truck', 'Gift', 'Tag',
  'Camera', 'Image', 'Video', 'Music', 'Headphones', 'Monitor',
  'Palette', 'PenLine', 'Sparkles', 'Award', 'Trophy', 'GraduationCap',
  'BarChart3', 'PieChart', 'TrendingUp', 'Activity', 'Clock', 'Calendar',
  'Map', 'MapPin', 'Navigation', 'Compass', 'Home', 'Building2',
]

export { CATEGORY_ICONS }

export default function LucideIcon({ name, className = 'w-5 h-5', fallback = 'Folder' }) {
  const IconComponent = icons[name] || icons[fallback]
  if (!IconComponent) return null
  return <IconComponent className={className} />
}
