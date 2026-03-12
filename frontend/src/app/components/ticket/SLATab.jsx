import React from 'react'

export default function SLATab({ slaData }) {
  if (!slaData) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-500 text-lg">No SLA policy applied</p>
        <p className="text-gray-400 text-sm mt-1">This ticket is not covered by an SLA policy</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">SLA Information</h3>
        </div>

        {/* SLA Status */}
        {slaData.is_on_hold && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="font-medium text-yellow-800">SLA Timer is On Hold</p>
                <p className="text-sm text-yellow-700 mt-1"><strong>Reason:</strong> {slaData.hold_reason}</p>
                {slaData.hold_started_at && (
                  <p className="text-xs text-yellow-600 mt-1">Hold started: {new Date(slaData.hold_started_at).toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Policy Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Policy Name</label>
              <p className="text-gray-900 font-medium">{slaData.policy?.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Priority</label>
              <p className="text-gray-900">
                <span className={`px-2 py-1 text-sm rounded-full ${
                  slaData.policy?.priority === 'critical' ? 'bg-red-100 text-red-700' :
                  slaData.policy?.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                  slaData.policy?.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {slaData.policy?.priority}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Total Hold Time</label>
              <p className="text-gray-900">{slaData.total_hold_time || 0} minutes</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">First Response Target</label>
              <p className="text-gray-900">{slaData.policy?.first_response_time} minutes</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Resolution Target</label>
              <p className="text-gray-900">{slaData.policy?.resolution_time} minutes</p>
            </div>
          </div>
        </div>

        {/* Due Dates */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Due Dates</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border-2 ${slaData.response_breached ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">First Response Due</label>
                {slaData.response_breached && (
                  <span className="px-2 py-1 text-xs bg-red-600 text-white rounded-full">Breached</span>
                )}
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {slaData.response_due_at ? new Date(slaData.response_due_at).toLocaleString() : 'Not set'}
              </p>
              {slaData.responded_at && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Responded at: {new Date(slaData.responded_at).toLocaleString()}
                </p>
              )}
            </div>

            <div className={`p-4 rounded-lg border-2 ${slaData.resolution_breached ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Resolution Due</label>
                {slaData.resolution_breached && (
                  <span className="px-2 py-1 text-xs bg-red-600 text-white rounded-full">Breached</span>
                )}
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {slaData.resolution_due_at ? new Date(slaData.resolution_due_at).toLocaleString() : 'Not set'}
              </p>
              {slaData.resolved_at && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Resolved at: {new Date(slaData.resolved_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Hold History */}
        {slaData.hold_history && slaData.hold_history.length > 0 && (
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4">Hold History</h4>
            <div className="space-y-2">
              {slaData.hold_history.map((hold, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{hold.reason}</p>
                    <p className="text-gray-500 text-xs">
                      {hold.started_at && `Started: ${new Date(hold.started_at).toLocaleString()}`}
                      {hold.ended_at && ` • Ended: ${new Date(hold.ended_at).toLocaleString()}`}
                    </p>
                  </div>
                  <span className="text-gray-600">{hold.duration_minutes || 0} min</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
