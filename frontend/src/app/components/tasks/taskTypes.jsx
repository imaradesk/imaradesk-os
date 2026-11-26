import { useEffect, useState } from 'react'
import {
  CheckSquare, Bug, Sparkles, TrendingUp, Wrench, Lightbulb, Rocket, Flag, Bookmark, FileText, Megaphone,
  ShoppingCart, Truck, Users, Phone, Mail, Calendar, Shield, Wallet, Package, ClipboardList, Search, Heart, Star,
} from 'lucide-react'
import api from '../../../utils/axios'

// Icon and colour keys mirror TASK_TYPE_ICONS / TASK_TYPE_COLORS in modules/tasks/models.py.
export const TYPE_ICONS = {
  'check-square': CheckSquare, bug: Bug, sparkles: Sparkles, 'trending-up': TrendingUp, wrench: Wrench,
  lightbulb: Lightbulb, rocket: Rocket, flag: Flag, bookmark: Bookmark, 'file-text': FileText,
  megaphone: Megaphone, 'shopping-cart': ShoppingCart, truck: Truck, users: Users, phone: Phone, mail: Mail,
  calendar: Calendar, shield: Shield, wallet: Wallet, package: Package, 'clipboard-list': ClipboardList,
  search: Search, heart: Heart, star: Star,
}

// Full class names so Tailwind keeps them.
export const TYPE_COLORS = {
  blue: 'bg-blue-500', red: 'bg-red-500', emerald: 'bg-emerald-500', violet: 'bg-violet-500', slate: 'bg-slate-500',
  amber: 'bg-amber-500', pink: 'bg-pink-500', teal: 'bg-teal-500', indigo: 'bg-indigo-500', orange: 'bg-orange-500',
}

// One shared list for the whole page: every select, filter and dialog sees a newly added type at once.
let types = null
let request = null
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn(types))

function load() {
  if (types !== null || request) return
  request = api.get('/api/tasks/types/')
    .then((res) => { types = res.data.types || [] })
    .catch(() => { types = [] })
    .finally(() => { request = null; emit() })
}

/** Workspace task types (null until loaded). */
export function useTaskTypes() {
  const [list, setList] = useState(types)
  useEffect(() => {
    listeners.add(setList)
    load()
    return () => { listeners.delete(setList) }
  }, [])
  return list
}

/** Creates a type on the server and adds it to the shared list. Throws with the server message on failure. */
export async function createTaskType(payload) {
  const res = await api.post('/api/tasks/types/', payload)
  const created = res.data.type
  types = [...(types || []), created]
  emit()
  return created
}
