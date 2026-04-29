import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { SAUCES } from '../../config/products'
import BottleViewer from '../BottleViewer'
import BottleModal from '../BottleModal'
import LiquidSplash from '../LiquidSplash'

// Import splash images directly — Vite handles this, guarantees correct URL
import buffaloSplash from '../../assets/splashes/buffalo.png'
import burnSplash from '../../assets/splashes/burn.png'
import bbqSplash from '../../assets/splashes/bbq.png'

const SPLASH_MAP = {
  buffalo: buffaloSplash,
  burn: burnSplash,
  bbq: bbqSplash,
}

function TiltCard({ children, style = {} }) {
  const cardRef = useRef(null)
  const rotX = useMotionValue(0)
  const rotY = useMotionValue(0)
  const springX = useSpring(rotX, { stiffness: 80, damping: 20 })
  const springY = useSpring(rotY, { stiffness: 80, damping: 20 })
  const handleMove = useCallback((clientX, clientY) => {
    const el = cardRef.current; if (!el) return
    const rect = el.getBoundingClientRect()
    rotY.set(((clientX - (rect.left + rect.width / 2)) / (rect.width / 2)) * 4)
    rotX.set(-((clientY - (rect.top + rect.height / 2)) / (rect.height / 2)) * 3)
  }, [rotX, rotY])
  const handleReset = useCallback(() => { rotX.set(0); rotY.set(0) }, [rotX, rotY])
  useEffect(() => {
    const m = (e) => handleMove(e.clientX, e.clientY)
    const t = (e) => { if (e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY) }
    window.addEventListener('mousemove', m); window.addEventListener('touchmove', t, { passive: true })
    window.addEventListener('mouseleave', handleReset); window.addEventListener('touchend', handleReset)
    return () => {
      window.removeEventListener('mousemove', m); window.removeEventListener('touchmove', t)
      window.removeEventListener('mouseleave', handleReset); window.removeEventListener('touchend', handleReset)
    }
  }, [handleMove, handleReset])
  return (
    <motion.div ref={cardRef} style={{ rotateX: springX, rotateY: springY, transformStyle: 'preserve-3d', perspective: 1000, ...style }}>
      {children}
    </motion.div>
  )
}

function GlassCard({ children, accent, style = {} }) {
  return (
    <div style={{
      background: 'rgba(8,8,8,0.55)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 26,
      backdropFilter: 'blur(2px) saturate(160%)', WebkitBackdropFilter: 'blur(40px) saturate(160%)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 4px 8px rgba(0,0,0,0.35), 0 20px 50px rgba(0,0,0,0.6)',
      position: 'relative', overflow: 'hidden', ...style,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.55) 35%, rgba(255,255,255,0.55) 65%, transparent 95%)', pointerEvents: 'none' }} />
      {children}
    </div>
  )
}

function Chip({ label, value, color, style = {} }) {
  return (
    <div style={{
      background: 'rgba(6,6,6,0.82)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 14,
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 14px rgba(0,0,0,0.55)',
      padding: '9px 13px', position: 'relative', overflow: 'hidden', ...style,
    }}>
      <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.38), transparent)', pointerEvents: 'none' }} />
      <div style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.16em', marginBottom: 3, fontFamily: 'Work Sans, sans-serif', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 900, color: color || '#fff', fontFamily: 'Impact, sans-serif', lineHeight: 1, letterSpacing: '0.02em' }}>{value}</div>
    </div>
  )
}

function HeatDots({ level, accent }) {
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i <= level ? accent : 'rgba(255,255,255,0.1)', boxShadow: i <= level ? `0 0 7px ${accent}` : 'none' }} />
      ))}
    </div>
  )
}

export default function SauceTab() {
  const [current, setCurrent]       = useState(0)
  const [dir, setDir]               = useState(1)
  const [modalSauce, setModalSauce] = useState(null)
  const touchStart = useRef(0)
  const sauce = SAUCES[current]
  const splashSrc = SPLASH_MAP[sauce.id]

  const goTo = (idx) => {
    if (idx === current || idx < 0 || idx >= SAUCES.length) return
    setDir(idx > current ? 1 : -1); setCurrent(idx)
  }

  const variants = {
    enter: (d) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d) => ({ x: d > 0 ? '-30%' : '30%', opacity: 0, scale: 0.96 }),
  }

  return (
    <>
      <div
        style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#060606' }}
        onTouchStart={e => { touchStart.current = e.touches[0].clientX }}
        onTouchEnd={e => {
          const diff = touchStart.current - e.changedTouches[0].clientX
          if (diff > 55) goTo(current + 1); if (diff < -55) goTo(current - 1)
        }}
      >
        {/* Color glow */}
        <AnimatePresence>
          <motion.div key={sauce.id + '-glow'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}
            style={{ position: 'absolute', inset: 0, zIndex: 0, background: sauce.bgGradient, pointerEvents: 'none' }} />
        </AnimatePresence>

        {/* ── LIQUID SPLASH — shader ripple effect ── */}
        <AnimatePresence>
          <motion.div
            key={sauce.id + '-splashes'}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', overflow: 'hidden' }}
          >
            {/* Primary — bottom-left, large, ripple shader */}
            <motion.div
              animate={{ x: [0,10,-6,4,0], y: [0,-8,5,-3,0] }}
              transition={{ duration: 14, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
              style={{ position: 'absolute', top: '18%', left: '-12%', width: '72%', height: '72%', opacity: 0.92 }}
            >
              <LiquidSplash src={splashSrc} style={{ width: '100%', height: '100%' }} />
            </motion.div>
            {/* Secondary — top-right, smaller, rotated */}
            <motion.div
              animate={{ x: [0,-8,4,-2,0], y: [0,6,-3,2,0] }}
              transition={{ duration: 17, delay: 2.5, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
              style={{ position: 'absolute', top: '-8%', right: '-12%', width: '46%', height: '46%', opacity: 0.38, transform: 'rotate(162deg) scaleX(-1)', filter: 'blur(1px)' }}
            >
              <LiquidSplash src={splashSrc} style={{ width: '100%', height: '100%' }} />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Slide content */}
        <AnimatePresence custom={dir} mode="wait">
          <motion.div
            key={sauce.id} custom={dir} variants={variants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', background: 'transparent' }}
          >
            {/* Bottle */}
            <div style={{ position: 'relative', height: '42%', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: '5%', left: '50%', transform: 'translateX(-50%)', width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${sauce.accent}30 0%, transparent 70%)`, filter: 'blur(28px)', pointerEvents: 'none', zIndex: 1 }} />
              <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
                <BottleViewer sauce={sauce} onClick={() => setModalSauce(sauce)} />
              </div>
              <Chip label="THC / SERVE" value={sauce.thc} color={sauce.accent} style={{ position: 'absolute', top: 14, left: 14, zIndex: 10 }} />
              <Chip label="FORMAT" value={sauce.format} color="rgba(255,255,255,0.82)" style={{ position: 'absolute', top: 14, right: 14, zIndex: 10 }} />
              <div style={{ position: 'absolute', bottom: 14, left: 14, zIndex: 10, background: 'rgba(6,6,6,0.82)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 14, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 14px rgba(0,0,0,0.55)', padding: '9px 13px' }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.14em', marginBottom: 5 }}>HEAT</div>
                <HeatDots level={sauce.heat} accent={sauce.accent} />
                <div style={{ fontSize: 11, fontWeight: 700, color: sauce.accent, marginTop: 4, fontFamily: 'Work Sans, sans-serif', letterSpacing: '0.04em' }}>{sauce.heatLabel}</div>
              </div>
              <Chip label="MARGIN" value="40%" color="#27C96A" style={{ position: 'absolute', bottom: 14, right: 14, zIndex: 10 }} />
            </div>

            {/* Cards */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 58px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <TiltCard>
                <GlassCard accent={sauce.accent}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: '26px 26px 0 0', background: `linear-gradient(90deg, transparent 5%, ${sauce.accent}CC 40%, ${sauce.accent}CC 60%, transparent 95%)` }} />
                  <div style={{ padding: '20px 20px 18px' }}>
                    <motion.div key={sauce.id + '-head'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
                      <h2 style={{
                        fontFamily: 'Impact, "Arial Narrow", sans-serif',
                        fontSize: 34,
                        fontWeight: 900,
                        letterSpacing: '0.02em',
                        lineHeight: 1,
                        marginBottom: 6,
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '0.2em',
                        flexWrap: 'wrap',
                      }}>
                        {/* "Hi!" — cream white, like "HOW IT'S" in the reference */}
                        <span style={{ color: '#F5ECD7', WebkitTextFillColor: '#F5ECD7' }}>Hi!</span>
                        {/* Flavor name — orange-red gradient, like "MADE" in the reference */}
                        <span style={{
                          background: `linear-gradient(135deg, #FF8C00 0%, ${sauce.accent} 50%, #C0200A 100%)`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}>{sauce.shortName}</span>
                      </h2>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', fontFamily: 'Work Sans, sans-serif', fontWeight: 400, letterSpacing: '0.01em', marginBottom: 12 }}>{sauce.tagline}</p>
                    </motion.div>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, marginBottom: 14, fontFamily: 'Work Sans, sans-serif', fontWeight: 400 }}>{sauce.description}</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                      {sauce.tags.map(tag => <span key={tag} style={{ padding: '4px 10px', borderRadius: 7, background: `${sauce.accent}18`, border: `1px solid ${sauce.accent}35`, fontSize: 10, fontWeight: 700, color: sauce.accent, letterSpacing: '0.05em' }}>{tag}</span>)}
                    </div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 16 }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                      {[
                        { label: 'WHOLESALE', value: `$${sauce.wholesale.toFixed(2)}`, color: sauce.accent },
                        { label: 'RETAIL', value: `$${sauce.retail.toFixed(2)}`, color: 'rgba(255,255,255,0.82)' },
                        { label: 'SACHET WS', value: `$${sauce.sachetWholesale.toFixed(2)}`, color: '#27C96A' },
                      ].map(item => (
                        <div key={item.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.16em', marginBottom: 4, fontFamily: 'Work Sans, sans-serif', textTransform: 'uppercase' }}>{item.label}</div>
                          <div style={{ fontSize: 22, fontWeight: 900, color: item.color, fontFamily: 'Impact, sans-serif', letterSpacing: '0.01em' }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 16 }} />
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.22em', marginBottom: 10, fontFamily: 'Work Sans, sans-serif', textTransform: 'uppercase' }}>Pairs Perfectly With</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                      {sauce.pairings.map(p => (
                        <div key={p.label} style={{ padding: '10px 6px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}>
                          <div style={{ fontSize: 24, lineHeight: 1, marginBottom: 5 }}>{p.emoji}</div>
                          <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.5)', fontFamily: 'Work Sans, sans-serif' }}>{p.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </TiltCard>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {sauce.facts.map(f => (
                  <div key={f.label} style={{ padding: '10px 8px', textAlign: 'center', background: 'rgba(6,6,6,0.65)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
                    <div style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.14em', marginBottom: 3, fontFamily: 'Work Sans, sans-serif', textTransform: 'uppercase' }}>{f.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: 'rgba(255,255,255,0.78)', fontFamily: 'Impact, sans-serif', letterSpacing: '0.02em' }}>{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Nav */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px 14px', background: 'linear-gradient(transparent, rgba(6,6,6,0.97))' }}>
          <button onClick={() => goTo(current - 1)} disabled={current === 0} style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: current > 0 ? 'rgba(255,255,255,0.1)' : 'transparent', color: current > 0 ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.12)', fontSize: 17, cursor: current > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {SAUCES.map((s, i) => (
              <button key={s.id} onClick={() => goTo(i)} style={{ height: 6, borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.35s', width: i === current ? 24 : 6, background: i === current ? sauce.accent : 'rgba(255,255,255,0.2)', boxShadow: i === current ? `0 0 8px ${sauce.accent}` : 'none' }} />
            ))}
          </div>
          <button onClick={() => goTo(current + 1)} disabled={current === SAUCES.length - 1} style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: current < SAUCES.length - 1 ? `${sauce.accent}22` : 'transparent', color: current < SAUCES.length - 1 ? sauce.accent : 'rgba(255,255,255,0.12)', fontSize: 17, cursor: current < SAUCES.length - 1 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</button>
        </div>
      </div>

      <BottleModal sauce={modalSauce} onClose={() => setModalSauce(null)} />
    </>
  )
}