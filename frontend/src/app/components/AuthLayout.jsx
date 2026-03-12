import React from 'react'
import { COLORS } from '../constants/theme'

export default function AuthLayout({ 
  children, 
  title, 
  subtitle, 
  illustration,
  features = []
}) {
  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        .illustration-pulse {
          animation: pulse 3s ease-in-out infinite;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Top-left dispersing gradient */}
        <div 
          className="absolute top-0 left-0 w-96 h-96 opacity-30"
          style={{
            background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryLight} 30%, transparent 70%)`,
          }}
        ></div>
        
        {/* Bottom-right dispersing gradient */}
        <div 
          className="absolute bottom-0 right-0 w-[500px] h-[500px] opacity-25"
          style={{
            background: `linear-gradient(315deg, ${COLORS.primaryLight} 0%, ${COLORS.primary} 30%, transparent 70%)`,
          }}
        ></div>
        
        {/* Top-right accent */}
        <div 
          className="absolute top-0 right-0 w-64 h-64 opacity-20"
          style={{
            background: `linear-gradient(225deg, ${COLORS.primary} 0%, transparent 60%)`,
          }}
        ></div>
        
        {/* Bottom-left accent */}
        <div 
          className="absolute bottom-0 left-0 w-72 h-72 opacity-20"
          style={{
            background: `linear-gradient(45deg, ${COLORS.primaryLight} 0%, transparent 60%)`,
          }}
        ></div>
        
        <div className="max-w-7xl w-full relative z-10 flex items-center gap-16">
          {/* Left Side - Illustration and Text */}
          <div className="hidden lg:flex flex-1 flex-col items-center justify-center">
            {illustration && (
              <div className="illustration-pulse mb-8">
                <img 
                  src={illustration} 
                  alt={title}
                  className="w-80 h-auto"
                />
              </div>
            )}
            <h2 className="text-4xl font-bold mb-4 text-center" style={{ color: COLORS.primary }}>
              {title}
            </h2>
            <p className="text-xl text-center max-w-md text-gray-600 mb-8">
              {subtitle}
            </p>
            {features.length > 0 && (
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" 
                      style={{ backgroundColor: COLORS.primary }}
                    >
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-lg text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Side - Form */}
          <div className="flex-1 max-w-3xl w-full p-4 sm:p-6 md:p-10">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
