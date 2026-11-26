import React from 'react'
import logoImg from '../assets/imaradesk-logo.png'

// Full-screen loading state: logo + wordmark with three pulsing dots beneath.
// Mirrors the PageLoader used on imaradesk.com. Used as the Suspense fallback
// in main.jsx and mirrored as static markup in templates/base.html so it is
// visible before the JS bundle has loaded.
export default function PageLoader() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-5 bg-white"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <img src={logoImg} alt="" className="w-9 h-9 object-contain" />
        <span className="text-3xl font-semibold tracking-tight text-[#0B3D26]">
          Imaradesk<span className="text-[#4F8A68]">.</span>
        </span>
      </div>
      <span className="flex items-center gap-2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-[#0B3D26] animate-loader-dot"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </span>
      <span className="sr-only">Loading</span>
    </div>
  )
}
