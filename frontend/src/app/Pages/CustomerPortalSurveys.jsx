import React, { useEffect, useRef, useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import {
  ArrowLeft, ArrowRight, CheckCircle2, HelpCircle, Send,
} from 'lucide-react'
import api from '../../utils/axios'
import RichEditor from '../components/RichEditor'
import PortalShell from '../components/portal/PortalShell'
import { useUnsavedChanges } from '../context/UnsavedChangesContext'
import {
  BTN_PRIMARY, BTN_SECONDARY, PORTAL_CARD, PortalEmpty, PortalHero,
} from '../components/portal/PortalUI'

const RATING_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very good', 5: 'Excellent' }

export default function CustomerPortalSurveys({
  portal_settings, business_type, questions = [], survey_submitted = false,
}) {
  const [responses, setResponses] = useState({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [direction, setDirection] = useState(1)
  const advanceTimer = useRef(null)
  const { allowNextNavigation } = useUnsavedChanges(Object.keys(responses).length > 0 && !survey_submitted)

  const tenantName = portal_settings?.tenant_name

  useEffect(() => () => clearTimeout(advanceTimer.current), [])

  const goTo = (index) => {
    clearTimeout(advanceTimer.current)
    if (index < 0 || index >= questions.length) return
    setDirection(index > currentQuestion ? 1 : -1)
    setCurrentQuestion(index)
  }

  const setAnswer = (questionId, value) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }))
  }

  // Score questions move on by themselves after a short pause so the pick registers
  const pickScore = (questionId, value) => {
    setAnswer(questionId, value)
    clearTimeout(advanceTimer.current)
    if (currentQuestion < questions.length - 1) {
      advanceTimer.current = setTimeout(() => goTo(currentQuestion + 1), 450)
    }
  }

  const handleNext = () => goTo(currentQuestion + 1)
  const handlePrevious = () => goTo(currentQuestion - 1)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await api.post('/portal/surveys/submit/', {
        business_type,
        responses,
      })
      if (response.status === 200) {
        allowNextNavigation()
        router.reload()
      }
    } catch (error) {
      console.error('Error submitting survey:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const isQuestionAnswered = (question) => responses[question.id] !== undefined && responses[question.id] !== ''
  const progress = questions.length
    ? (Object.keys(responses).filter((key) => responses[key] !== undefined && responses[key] !== '').length / questions.length) * 100
    : 0

  if (survey_submitted) {
    return (
      <>
        <Head title="Survey — thank you" />
        <PortalShell tenantName={tenantName}>
          <div className="max-w-xl mx-auto px-4 sm:px-6 py-16">
            <div className={`${PORTAL_CARD} p-8 text-center animate-scaleIn`}>
              <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4 animate-portalPop">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Thank you</h1>
              <p className="mt-2 text-sm text-gray-500">
                Your feedback has been submitted. We appreciate you helping us improve our {business_type} services.
              </p>
              <Link href="/portal/" className={`${BTN_PRIMARY} mt-6`}>
                <ArrowLeft className="w-4 h-4" /> Back to portal
              </Link>
            </div>
          </div>
        </PortalShell>
      </>
    )
  }

  if (questions.length === 0) {
    return (
      <>
        <Head title="Customer survey" />
        <PortalShell tenantName={tenantName}>
          <div className="max-w-xl mx-auto px-4 sm:px-6 py-16">
            <div className={PORTAL_CARD}>
              <PortalEmpty
                icon={HelpCircle}
                title="No surveys available"
                description="There are currently no surveys for your business type. Please check back later."
                action={<Link href="/portal/" className={BTN_SECONDARY}>Back to portal</Link>}
              />
            </div>
          </div>
        </PortalShell>
      </>
    )
  }

  const question = questions[currentQuestion]

  return (
    <>
      <Head title="Customer survey" />

      <PortalShell tenantName={tenantName}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-4">
          <PortalHero
            compact
            eyebrow="Your feedback"
            title="Customer satisfaction survey"
            description={`Help us improve our ${(business_type || 'support').toLowerCase()} services. It only takes a minute.`}
          />

          <div className={`${PORTAL_CARD} mt-5`}>
            {/* Progress */}
            <div className="px-5 sm:px-6 pt-5">
              <div className="flex items-center justify-between gap-3 mb-2 text-xs">
                <span className="font-medium text-gray-700">Question {currentQuestion + 1} of {questions.length}</span>
                <span className="text-gray-500 tabular-nums">{Math.round(progress)}% complete</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-[#0B3D26] transition-all duration-500 ease-smooth" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {questions.map((q, idx) => (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => goTo(idx)}
                    aria-label={`Go to question ${idx + 1}`}
                    aria-current={idx === currentQuestion ? 'step' : undefined}
                    className={`h-2 rounded-full transition-all duration-300 ${idx === currentQuestion ? 'w-5' : 'w-2'} ${
                      isQuestionAnswered(q) ? 'bg-[#0B3D26]' : idx === currentQuestion ? 'bg-gray-400' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-hidden">
              {/* Keyed on the question so each one slides in from the direction of travel */}
              <div key={currentQuestion} className="animate-portalSlideIn" style={{ '--slide-from': `${direction * 24}px` }}>
              <h2 className="text-lg font-semibold text-gray-900 leading-snug">{question.question}</h2>

              {question.type === 'rating' && (
                <div className="mt-5 grid grid-cols-5 gap-2">
                  {[...Array(question.scale)].map((_, index) => {
                    const value = index + 1
                    const selected = responses[question.id] === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => pickScore(question.id, value)}
                        aria-pressed={selected}
                        style={{ animationDelay: `${index * 40}ms` }}
                        className={`animate-portalRise flex flex-col items-center gap-2 rounded-xl border px-1 py-3 transition-all active:scale-95 ${
                          selected
                            ? 'border-[#0B3D26] bg-[#0B3D26]/5 ring-1 ring-[#0B3D26]'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                          selected ? 'bg-[#0B3D26] text-white scale-110' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {value}
                        </span>
                        <span className={`text-[11px] ${selected ? 'text-[#0B3D26] font-medium' : 'text-gray-500'}`}>
                          {RATING_LABELS[value] || value}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {question.type === 'nps' && (
                <div className="mt-5">
                  <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
                    {[...Array(question.scale + 1)].map((_, index) => {
                      const selected = responses[question.id] === index
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => pickScore(question.id, index)}
                          aria-pressed={selected}
                          style={{ animationDelay: `${index * 25}ms` }}
                          className={`animate-portalRise aspect-square rounded-lg border text-sm font-semibold transition-all active:scale-90 ${
                            selected
                              ? 'border-[#0B3D26] bg-[#0B3D26] text-white scale-105 shadow-sm'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {index}
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-gray-500">
                    <span>Not likely at all</span>
                    <span>Extremely likely</span>
                  </div>
                </div>
              )}

              {question.type === 'text' && (
                <div className="mt-4">
                  <RichEditor
                    compact
                    value={responses[question.id] || ''}
                    onChange={(html) => setAnswer(question.id, html)}
                    placeholder="Please share your thoughts…"
                  />
                </div>
              )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                  className={`${BTN_SECONDARY} w-full sm:w-auto`}
                >
                  <ArrowLeft className="w-4 h-4" /> Previous
                </button>

                {currentQuestion < questions.length - 1 ? (
                  <button type="button" onClick={handleNext} className={`${BTN_PRIMARY} w-full sm:w-auto`}>
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button type="submit" disabled={submitting} className={`${BTN_PRIMARY} w-full sm:w-auto`}>
                    <Send className="w-4 h-4" /> {submitting ? 'Submitting…' : 'Submit survey'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </PortalShell>
    </>
  )
}
