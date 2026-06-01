import React, { useState, useEffect } from 'react'
import heroSlide1 from '../assets/images/hero_slide_1.png'
import heroSlide2 from '../assets/images/hero_slide_2.png'
import { Shield } from 'lucide-react'

interface SlideData {
  image: string
  title: string
  subtitle: string
  description: string
}

const slides: SlideData[] = [
  {
    image: heroSlide1,
    title: "Guardian of the Grid",
    subtitle: "Real-Time Spatial Protection",
    description: "SafetyNet serves as a resolute shield for the community, empowering local Community Policing Forums (CPF) and security networks with live, secure threat intelligence."
  },
  {
    image: heroSlide2,
    title: "Privacy First Intelligence",
    subtitle: "AI-Scrubbed Incident Ingest",
    description: "Advanced natural language models intercept reports, completely sanitizing personal identifiers before they reach the response queue, maintaining 100% POPIA integrity."
  }
]

export const HeroSection: React.FC = () => {
  const [currentIdx, setCurrentIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-12 text-white bg-neutral-950 font-sans selection:bg-white selection:text-black">
      {/* Background Slideshow with fade transitions */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {slides.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentIdx ? 'opacity-40' : 'opacity-0'
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover object-center scale-105 transition-transform duration-[5000ms] ease-out"
              style={{
                transform: idx === currentIdx ? 'scale(1)' : 'scale(1.05)'
              }}
            />
            {/* Ambient gradients to blend with black canvas */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-neutral-950/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-transparent to-neutral-950/80" />
          </div>
        ))}
      </div>

      {/* Decorative top grid lines for that premium tech feel */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_12px] pointer-events-none z-10" />

      {/* Header Info */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-white/10 rounded-lg flex items-center justify-center bg-black/40 backdrop-blur-md">
            <Shield className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-wider uppercase font-mono text-white/90">SafetyNet</span>
            <span className="block text-[9px] text-white/40 font-mono tracking-widest uppercase">Grid Security Core</span>
          </div>
        </div>
        <span className="text-[10px] font-mono px-3 py-1 bg-white/5 border border-white/10 rounded-full tracking-wider text-white/70 uppercase">
          SECURE STACK v3.1
        </span>
      </div>

      {/* Slide Text Content & Mission (Dynamic) */}
      <div className="relative z-10 my-auto max-w-xl space-y-6 pt-12">
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold tracking-widest text-neutral-400 uppercase flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
            Active Protection Active
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.1] transition-all duration-500">
            {slides[currentIdx].title}
          </h2>
          <p className="text-lg font-bold text-neutral-300">
            {slides[currentIdx].subtitle}
          </p>
        </div>
        <p className="text-sm text-neutral-400 leading-relaxed font-light">
          {slides[currentIdx].description}
        </p>

        {/* Carousel indicators */}
        <div className="flex gap-2.5 pt-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIdx(idx)}
              className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIdx ? 'w-10 bg-white' : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Workflow Section Footer */}
      <div className="relative z-10 pt-8 border-t border-white/10">
        <h4 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest mb-4">
          Integrated Response Workflow
        </h4>
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-1.5 group">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-mono text-neutral-400 group-hover:bg-white group-hover:text-black transition">
                01
              </span>
              <span className="text-xs font-bold text-white">Ingest Signal</span>
            </div>
            <p className="text-[10px] text-neutral-500 leading-normal">
              Reports flow securely via Twilio WhatsApp webhook streams.
            </p>
          </div>

          <div className="space-y-1.5 group">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-mono text-neutral-400 group-hover:bg-white group-hover:text-black transition">
                02
              </span>
              <span className="text-xs font-bold text-white">AI Scrubbing</span>
            </div>
            <p className="text-[10px] text-neutral-500 leading-normal">
              Anthropic models sanitize all citizen details dynamically.
            </p>
          </div>

          <div className="space-y-1.5 group">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-mono text-neutral-400 group-hover:bg-white group-hover:text-black transition">
                03
              </span>
              <span className="text-xs font-bold text-white">Grid Dispatch</span>
            </div>
            <p className="text-[10px] text-neutral-500 leading-normal">
              PostGIS updates spatial nodes, dispatching over live WebSockets.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
