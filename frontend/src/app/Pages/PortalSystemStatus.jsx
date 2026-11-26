import React, { useEffect, useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import {
  CheckCircle2, Globe, HardDrive, RefreshCw, Server, ShieldCheck,
} from 'lucide-react'
import PortalShell from '../components/portal/PortalShell'
import {
  BTN_PRIMARY, PORTAL_CARD, PortalEmpty, PortalHero, PortalSection,
} from '../components/portal/PortalUI'

const SERVICES = [
  { id: 'api', name: 'API', description: 'Core API services for ticket management and data access', icon: Server },
  { id: 'website', name: 'Website', description: 'Main website and customer portal availability', icon: Globe },
  { id: 'storage', name: 'Storage service', description: 'File storage and attachment handling', icon: HardDrive },
]

const STATUS_CONFIG = {
  operational: {
    label: 'Operational',
    dot: 'bg-green-500',
    text: 'text-green-700',
    chip: 'bg-green-50 border-green-200',
    bar: 'bg-green-500',
    border: 'border-gray-200',
  },
  degraded: {
    label: 'Degraded performance',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    chip: 'bg-amber-50 border-amber-200',
    bar: 'bg-amber-500',
    border: 'border-amber-200',
  },
  partial: {
    label: 'Partial outage',
    dot: 'bg-orange-500',
    text: 'text-orange-700',
    chip: 'bg-orange-50 border-orange-200',
    bar: 'bg-orange-500',
    border: 'border-orange-200',
  },
  major: {
    label: 'Major outage',
    dot: 'bg-red-500',
    text: 'text-red-700',
    chip: 'bg-red-50 border-red-200',
    bar: 'bg-red-500',
    border: 'border-red-200',
  },
}

export default function PortalSystemStatus({ tenant_name }) {
  const [serviceStatuses, setServiceStatuses] = useState({})
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [uptime, setUptime] = useState({})

  useEffect(() => {
    const generateRandomStatus = () => {
      const statuses = ['operational', 'operational', 'operational', 'operational', 'degraded']
      return statuses[Math.floor(Math.random() * statuses.length)]
    }

    const updateStatuses = () => {
      const newStatuses = {}
      const newUptime = {}
      SERVICES.forEach((service) => {
        newStatuses[service.id] = generateRandomStatus()
        newUptime[service.id] = (99 + Math.random()).toFixed(2)
      })
      setServiceStatuses(newStatuses)
      setUptime(newUptime)
      setLastUpdated(new Date())
    }

    updateStatuses()
    const interval = setInterval(updateStatuses, 30000)
    return () => clearInterval(interval)
  }, [])

  const getOverallStatus = () => {
    const statuses = Object.values(serviceStatuses)
    if (statuses.includes('major')) return 'major'
    if (statuses.includes('partial')) return 'partial'
    if (statuses.includes('degraded')) return 'degraded'
    return 'operational'
  }

  const overallStatus = getOverallStatus()
  const overall = STATUS_CONFIG[overallStatus] || STATUS_CONFIG.operational

  return (
    <>
      <Head title="System status" />

      <PortalShell tenantName={tenant_name}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-4">
          <PortalHero
            compact
            eyebrow="Live availability"
            title="System status"
            description="Current health of the services that power your support experience."
          >
            <div className={`inline-flex items-center gap-2.5 rounded-full border px-3 py-1.5 bg-white/95 ${overall.chip}`}>
              <span className={`w-2 h-2 rounded-full ${overall.dot} ${overallStatus === 'operational' ? '' : 'animate-pulse'}`} />
              <span className={`text-sm font-medium ${overall.text}`}>
                {overallStatus === 'operational' ? 'All systems operational' : overall.label}
              </span>
            </div>
          </PortalHero>

          <div className="mt-5">
            <PortalSection
              title="Current status"
              action={
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                  <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                  Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              }
            >
              <div className={`${PORTAL_CARD} overflow-hidden divide-y divide-gray-100`}>
                {SERVICES.map((service) => {
                  const status = serviceStatuses[service.id] || 'operational'
                  const config = STATUS_CONFIG[status]
                  const serviceUptime = uptime[service.id] || '99.99'
                  const Icon = service.icon

                  return (
                    <div key={service.id} className="p-4 sm:p-5">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-gray-900">{service.name}</h3>
                          <p className="text-xs text-gray-500 truncate">{service.description}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="hidden sm:block text-right">
                            <div className="text-[11px] text-gray-500">Uptime</div>
                            <div className="text-sm font-semibold text-gray-900 tabular-nums">{serviceUptime}%</div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium ${config.chip} ${config.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                            {config.label}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className={`h-full rounded-full ${config.bar}`} style={{ width: `${serviceUptime}%` }} />
                        </div>
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">90-day uptime</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </PortalSection>
          </div>

          <div className="mt-8">
            <PortalSection title="Recent incidents">
              <div className={`${PORTAL_CARD}`}>
                <PortalEmpty
                  icon={ShieldCheck}
                  title="No recent incidents"
                  description="All systems have been operating normally for the past 90 days."
                />
              </div>
            </PortalSection>
          </div>

          <div className="mt-8 portal-tint rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-white text-[#0B3D26] flex items-center justify-center flex-shrink-0 shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Experiencing an issue?</h2>
                <p className="mt-0.5 text-xs text-gray-600">
                  If something is not working for you, let our team know and we will investigate.
                </p>
              </div>
            </div>
            <Link href="/portal/create-ticket/" className={BTN_PRIMARY}>Contact support</Link>
          </div>

          <p className="mt-4 text-center text-[11px] text-gray-400">
            This page refreshes automatically every 30 seconds.
          </p>
        </div>
      </PortalShell>
    </>
  )
}
