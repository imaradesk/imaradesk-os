import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { THEME, COLORS } from '../constants/theme';

export default function CustomerPortalSurveys({ portal_settings, business_type, questions = [], survey_submitted = false }) {
  const [responses, setResponses] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleRatingChange = (questionId, value) => {
    setResponses({
      ...responses,
      [questionId]: value
    });
  };

  const handleTextChange = (questionId, value) => {
    setResponses({
      ...responses,
      [questionId]: value
    });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      
      const response = await fetch('/portal/surveys/submit/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
          business_type: business_type,
          responses: responses
        })
      });

      if (response.ok) {
        router.reload();
      }
    } catch (error) {
      console.error('Error submitting survey:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const isQuestionAnswered = (question) => {
    return responses[question.id] !== undefined && responses[question.id] !== '';
  };

  const progress = (Object.keys(responses).filter(key => responses[key] !== undefined && responses[key] !== '').length / questions.length) * 100;

  if (survey_submitted) {
    return (
      <>
        <Head title="Survey - Thank You" />
        
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 md:p-8">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-6 md:p-12 text-center">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full mx-auto mb-4 md:mb-6 flex items-center justify-center" style={{ backgroundColor: COLORS.primary }}>
              <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Thank You!</h1>
            <p className="text-lg text-gray-600 mb-8">
              Your feedback has been submitted successfully. We appreciate you taking the time to help us improve our services.
            </p>
            <Link
              href="/portal/"
              className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-lg font-medium transition-colors"
              style={{ backgroundColor: COLORS.primary }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Portal
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (questions.length === 0) {
    return (
      <>
        <Head title="Customer Surveys" />
        
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 md:p-8">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-6 md:p-12 text-center">
            <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">No surveys available</h1>
            <p className="text-gray-600 mb-8">There are currently no surveys for your business type.</p>
            <Link
              href="/portal/"
              className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-lg font-medium transition-colors"
              style={{ backgroundColor: COLORS.primary }}
            >
              Back to Portal
            </Link>
          </div>
        </div>
      </>
    );
  }

  const question = questions[currentQuestion];

  return (
    <>
      <Head title="Customer Survey" />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="relative py-8 md:py-10 lg:py-12 px-4 md:px-6 lg:px-8 overflow-hidden" style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryLight} 100%)` }}>
          <div className="max-w-4xl mx-auto">
            <Link href="/portal/" className="text-white hover:text-gray-200 inline-flex items-center gap-2 text-sm mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Portal
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Customer Satisfaction Survey</h1>
            <p className="text-white text-opacity-90 text-sm md:text-base">Help us improve our {business_type} services</p>
          </div>
        </header>

        {/* Progress Bar */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {Math.round(progress)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: COLORS.primary }}
              />
            </div>
          </div>
        </div>

        {/* Survey Content */}
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 lg:p-8">
            <form onSubmit={handleSubmit}>
              {/* Question */}
              <div className="mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
                  {question.question}
                </h2>

                {question.type === 'rating' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-center md:justify-between gap-2 md:gap-0">
                      {[...Array(question.scale)].map((_, index) => {
                        const value = index + 1;
                        const isSelected = responses[question.id] === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => handleRatingChange(question.id, value)}
                            className={`flex flex-col items-center gap-1.5 md:gap-2 p-2 md:p-4 rounded-lg border-2 transition-all ${
                              isSelected
                                ? 'border-current shadow-lg transform scale-105'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            style={isSelected ? { borderColor: COLORS.primary, color: COLORS.primary } : {}}
                          >
                            <div
                              className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-lg md:text-xl font-bold ${
                                isSelected ? 'text-white' : 'text-gray-600'
                              }`}
                              style={isSelected ? { backgroundColor: COLORS.primary } : { backgroundColor: '#e5e7eb' }}
                            >
                              {value}
                            </div>
                            <span className="text-xs text-gray-600">
                              {value === 1 && 'Poor'}
                              {value === 2 && 'Fair'}
                              {value === 3 && 'Good'}
                              {value === 4 && 'Very Good'}
                              {value === 5 && 'Excellent'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {question.type === 'nps' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-6 md:grid-cols-11 gap-1.5 md:gap-2">
                      {[...Array(question.scale + 1)].map((_, index) => {
                        const isSelected = responses[question.id] === index;
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleRatingChange(question.id, index)}
                            className={`aspect-square rounded-lg border-2 transition-all font-bold text-base md:text-lg ${
                              isSelected
                                ? 'border-current shadow-lg transform scale-110'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            style={isSelected ? { borderColor: COLORS.primary, backgroundColor: COLORS.primary, color: 'white' } : {}}
                          >
                            {index}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 px-1">
                      <span>Not likely at all</span>
                      <span>Extremely likely</span>
                    </div>
                  </div>
                )}

                {question.type === 'text' && (
                  <textarea
                    value={responses[question.id] || ''}
                    onChange={(e) => handleTextChange(question.id, e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent resize-none"
                    style={{ focusRing: COLORS.primary }}
                    placeholder="Please share your thoughts..."
                  />
                )}
              </div>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                  className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors order-1 sm:order-none"
                >
                  Previous
                </button>

                <div className="flex gap-1 order-3 sm:order-none">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full ${
                        isQuestionAnswered(q) ? 'bg-current' : 'bg-gray-300'
                      }`}
                      style={isQuestionAnswered(q) ? { backgroundColor: COLORS.primary } : {}}
                    />
                  ))}
                </div>

                {currentQuestion < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full sm:w-auto px-6 py-3 text-white rounded-lg font-medium transition-colors order-2 sm:order-none"
                    style={{ backgroundColor: COLORS.primary }}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-6 py-3 text-white rounded-lg font-medium transition-colors disabled:opacity-50 order-2 sm:order-none"
                    style={{ backgroundColor: COLORS.primary }}
                  >
                    {submitting ? 'Submitting...' : 'Submit Survey'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
