import React, { useState, useEffect } from 'react'
import {
  AlertTriangle, CalendarClock, CheckCircle2, CircleCheckBig, Clock, Gauge, History, MessageSquareReply,
  PauseCircle, RotateCcw, ShieldCheck, Target, Timer,
} from 'lucide-react'
import { PriorityPill, PriorityTile, shortMinutes } from '../sla/SLAUI'

function useCountdown(targetDate, isPaused) {
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!targetDate) return null
    return Math.floor((new Date(targetDate).getTime() - Date.now()) / 1000)
  })

  useEffect(() => {
    if (!targetDate || isPaused) return

    const tick = () => {
      setTimeLeft(Math.floor((new Date(targetDate).getTime() - Date.now()) / 1000))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [targetDate, isPaused])

  return timeLeft
}

function formatCountdown(totalSeconds) {
  const abs = Math.abs(totalSeconds)
  const days = Math.floor(abs / 86400)
  const hours = Math.floor((abs % 86400) / 3600)
  const minutes = Math.floor((abs % 3600) / 60)
  const seconds = abs % 60

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0 || days > 0) parts.push(`${hours}h`)
  parts.push(`${minutes}m`)
  parts.push(`${String(seconds).padStart(2, '0')}s`)
  return parts.join(' ')
}

const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : null)

const TONES = {
  ok: { ring: 'border-gray-200', tile: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-600', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  warn: { ring: 'border-amber-200', tile: 'bg-amber-50 text-amber-600', text: 'text-amber-600', bar: 'bg-amber-500', dot: 'bg-amber-500' },
  bad: { ring: 'border-red-200', tile: 'bg-red-50 text-red-600', text: 'text-red-600', bar: 'bg-red-500', dot: 'bg-red-500' },
  hold: { ring: 'border-amber-200', tile: 'bg-amber-50 text-amber-600', text: 'text-amber-600', bar: 'bg-amber-400', dot: 'bg-amber-500' },
  done: { ring: 'border-gray-200', tile: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-600', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
}

function TimerCard({ icon: Icon, label, targetMinutes, dueAt, breached, onHold, doneAt, doneLabel, startedAt }) {
  const timeLeft = useCountdown(dueAt, onHold || !!doneAt)
  const overdue = !doneAt && (breached || (timeLeft !== null && timeLeft < 0))

  let tone = 'ok'
  if (doneAt) tone = breached ? 'bad' : 'done'
  else if (onHold) tone = 'hold'
  else if (overdue) tone = 'bad'
  else if (timeLeft !== null && timeLeft < 3600) tone = 'warn'
  const t = TONES[tone]

  // Share of the SLA window already used (0-100)
  let progress = 0
  if (dueAt && startedAt) {
    const start = new Date(startedAt).getTime()
    const end = new Date(dueAt).getTime()
    const ref = doneAt ? new Date(doneAt).getTime() : Date.now()
    progress = end > start ? Math.min(100, Math.max(0, ((ref - start) / (end - start)) * 100)) : 0
  }
  if (overdue) progress = 100

  let headline
  if (!dueAt) headline = <span className="text-2xl font-semibold text-gray-300">Not set</span>
  else if (doneAt) headline = <span className={`text-2xl font-semibold ${t.text}`}>{breached ? 'Missed' : 'Met'}</span>
  else if (onHold) headline = <span className={`text-2xl font-semibold ${t.text}`}>Paused</span>
  else headline = (
    <span className={`text-2xl font-semibold tabular-nums tracking-tight ${t.text}`}>
      {overdue ? '−' : ''}{formatCountdown(timeLeft ?? 0)}
    </span>
  )

  return (
    <div className={`rounded-2xl border bg-white p-5 transition-shadow hover:shadow-sm ${t.ring}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-10 h-10 rounded-xl inline-flex items-center justify-center flex-shrink-0 ${t.tile}`}>
            <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{label}</p>
            <p className="text-xs text-gray-500">Target {shortMinutes(targetMinutes)}</p>
          </div>
        </div>
        {breached ? (
          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full border border-red-200 bg-red-50 text-[11px] font-medium text-red-700">
            <AlertTriangle className="w-3 h-3" strokeWidth={2} /> Breached
          </span>
        ) : doneAt ? (
          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full border border-emerald-200 bg-emerald-50 text-[11px] font-medium text-emerald-700">
            <CheckCircle2 className="w-3 h-3" strokeWidth={2} /> {doneLabel}
          </span>
        ) : onHold ? (
          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full border border-amber-200 bg-amber-50 text-[11px] font-medium text-amber-700">
            <PauseCircle className="w-3 h-3" strokeWidth={2} /> On hold
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex items-center gap-2">
        {!doneAt && !onHold && dueAt && (
          <span className={`w-2 h-2 rounded-full ${t.dot} ${tone === 'warn' ? 'animate-pulse' : ''}`} />
        )}
        {headline}
      </div>

      <div className="mt-4 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${t.bar}`} style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-4 space-y-1.5 text-xs">
        <div className="flex items-center gap-2 text-gray-500">
          <CalendarClock className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.75} />
          Due {fmt(dueAt) || 'not set'}
        </div>
        {doneAt && (
          <div className={`flex items-center gap-2 ${breached ? 'text-red-600' : 'text-emerald-600'}`}>
            <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            {doneLabel} {fmt(doneAt)}
          </div>
        )}
      </div>
    </div>
  )
}

function Fact({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 inline-flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4" strokeWidth={1.75} />
      </span>
      <span className="text-sm text-gray-500 flex-1">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{children}</span>
    </div>
  )
}

export default function SLATab({ slaData }) {
  if (!slaData) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-14 px-6 text-center">
        <span className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 inline-flex items-center justify-center">
          <Gauge className="w-6 h-6" strokeWidth={1.5} />
        </span>
        <p className="mt-4 text-sm font-semibold text-gray-900">No SLA policy applied</p>
        <p className="mt-1 text-sm text-gray-500">This ticket isn't covered by an active SLA policy.</p>
      </div>
    )
  }

  const policy = slaData.policy || {}
  const breachedAny = slaData.response_breached || slaData.resolution_breached
  const clockStart = slaData.started_at || slaData.created_at

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <PriorityTile priority={policy.priority} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{policy.name}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <PriorityPill priority={policy.priority} />
            </div>
          </div>
        </div>
        {breachedAny ? (
          <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-red-200 bg-red-50 text-xs font-medium text-red-700">
            <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} /> SLA breached
          </span>
        ) : slaData.is_on_hold ? (
          <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-amber-200 bg-amber-50 text-xs font-medium text-amber-700">
            <PauseCircle className="w-3.5 h-3.5" strokeWidth={2} /> Timer on hold
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} /> On track
          </span>
        )}
      </div>

      {/* On hold banner */}
      {slaData.is_on_hold && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <span className="w-9 h-9 rounded-xl bg-white text-amber-600 inline-flex items-center justify-center flex-shrink-0">
            <PauseCircle className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900">SLA timer is on hold</p>
            {slaData.hold_reason && <p className="mt-0.5 text-sm text-amber-800">{slaData.hold_reason}</p>}
            {slaData.hold_started_at && (
              <p className="mt-1 text-xs text-amber-700">Since {fmt(slaData.hold_started_at)}</p>
            )}
          </div>
        </div>
      )}

      {/* Clock restarted after a priority change */}
      {slaData.restarted_at && (
        <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <span className="w-9 h-9 rounded-xl bg-white text-sky-600 inline-flex items-center justify-center flex-shrink-0">
            <RotateCcw className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sky-900">SLA clock restarted</p>
            <p className="mt-0.5 text-sm text-sky-800">
              Targets below count from {fmt(slaData.restarted_at)}, not from when the ticket was created.
              {slaData.responded_at && ' The first reply was already sent, so it counts as responded.'}
            </p>
          </div>
        </div>
      )}

      {/* Timers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TimerCard
          icon={MessageSquareReply}
          label="First response"
          targetMinutes={policy.first_response_time}
          dueAt={slaData.response_due_at}
          breached={slaData.response_breached}
          onHold={slaData.is_on_hold}
          doneAt={slaData.responded_at}
          doneLabel="Responded"
          startedAt={clockStart}
        />
        <TimerCard
          icon={CircleCheckBig}
          label="Resolution"
          targetMinutes={policy.resolution_time}
          dueAt={slaData.resolution_due_at}
          breached={slaData.resolution_breached}
          onHold={slaData.is_on_hold}
          doneAt={slaData.resolved_at}
          doneLabel="Resolved"
          startedAt={clockStart}
        />
      </div>

      {/* Policy details */}
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-2">
        <div className="divide-y divide-gray-100">
          <Fact icon={Target} label="First response target">{shortMinutes(policy.first_response_time)}</Fact>
          <Fact icon={Timer} label="Resolution target">{shortMinutes(policy.resolution_time)}</Fact>
          <Fact icon={Clock} label="Total hold time">{slaData.total_hold_time ? shortMinutes(slaData.total_hold_time) : 'None'}</Fact>
        </div>
      </div>

      {/* Hold history */}
      {slaData.hold_history && slaData.hold_history.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-gray-400" strokeWidth={1.75} />
            <h4 className="text-sm font-semibold text-gray-900">Hold history</h4>
          </div>
          <div className="space-y-2">
            {slaData.hold_history.map((hold, index) => (
              <div key={index} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{hold.reason}</p>
                  <p className="text-xs text-gray-500">
                    {hold.started_at && `Started ${fmt(hold.started_at)}`}
                    {hold.ended_at && ` · Ended ${fmt(hold.ended_at)}`}
                  </p>
                </div>
                <span className="text-xs font-medium text-gray-600 flex-shrink-0">{shortMinutes(hold.duration_minutes)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
