import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

// Each bubble gets a unique slow float path
const FLOAT_VARIANTS = [
  {
    animate: {
      y: [0, -18, -8, -22, 0],
      x: [0, 8, -5, 12, 0],
      rotate: [0, 1.5, -1, 2, 0],
    },
    transition: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
  },
  {
    animate: {
      y: [0, -14, -24, -10, 0],
      x: [0, -10, 6, -8, 0],
      rotate: [0, -2, 1, -1.5, 0],
    },
    transition: { duration: 8.5, repeat: Infinity, ease: 'easeInOut' },
  },
  {
    animate: {
      y: [0, -20, -12, -18, 0],
      x: [0, 12, -8, 5, 0],
      rotate: [0, 1, -2, 0.5, 0],
    },
    transition: { duration: 6.5, repeat: Infinity, ease: 'easeInOut' },
  },
  {
    animate: {
      y: [0, -10, -20, -14, 0],
      x: [0, -6, 10, -12, 0],
      rotate: [0, -1, 2, -1, 0],
    },
    transition: { duration: 9, repeat: Infinity, ease: 'easeInOut' },
  },
]

// CSS-based liquid glass sphere — no GLB needed, works perfectly
function GlassSphere({ size, color = 'rgba(255,255,255,0.08)' }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      position: 'relative',
      overflow: 'hidden',
      // Main glass body
      background: `
        radial-gradient(
          ellipse at 38% 35%,
          rgba(255,255,255,0.55) 0%,
          rgba(255,255,255,0.18) 25%,
          rgba(255,255,255,0.04) 55%,
          rgba(255,255,255,0.10) 100%
        )
      `,
      boxShadow: `
        inset 0 2px 20px rgba(255,255,255,0.30),
        inset 0 -6px 24px rgba(0,0,0,0.25),
        inset 4px 0 16px rgba(255,255,255,0.08),
        0 12px 48px rgba(0,0,0,0.55),
        0 4px 16px rgba(0,0,0,0.35),
        0 0 0 1px rgba(255,255,255,0.20)
      `,
      backdropFilter: 'blur(12px) saturate(180%) brightness(1.1)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%) brightness(1.1)',
    }}>
      {/* Primary specular highlight — top left bright spot */}
      <div style={{
        position: 'absolute',
        top: '12%',
        left: '18%',
        width: '42%',
        height: '28%',
        background: 'radial-gradient(ellipse, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.4) 40%, transparent 75%)',
        borderRadius: '50%',
        filter: 'blur(3px)',
        transform: 'rotate(-25deg)',
      }} />

      {/* Secondary smaller highlight */}
      <div style={{
        position: 'absolute',
        top: '18%',
        left: '55%',
        width: '16%',
        height: '10%',
        background: 'radial-gradient(ellipse, rgba(255,255,255,0.7) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(2px)',
      }} />

      {/* Bottom reflection glow */}
      <div style={{
        position: 'absolute',
        bottom: '12%',
        left: '25%',
        right: '25%',
        height: '14%',
        background: 'radial-gradient(ellipse, rgba(255,255,255,0.22) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(4px)',
      }} />

      {/* Iridescent color shift — subtle rainbow rim */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: `
          conic-gradient(
            from 220deg,
            rgba(232,100,28,0.18) 0deg,
            rgba(255,200,100,0.10) 60deg,
            rgba(180,220,255,0.12) 120deg,
            rgba(200,150,255,0.10) 180deg,
            rgba(232,80,28,0.15) 240deg,
            rgba(255,220,80,0.08) 300deg,
            rgba(232,100,28,0.18) 360deg
          )
        `,
        opacity: 0.6,
        mixBlendMode: 'screen',
      }} />

      {/* Inner dark gradient for depth */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at 60% 65%, rgba(0,0,0,0.35) 0%, transparent 65%)',
      }} />
    </div>
  )
}

export default function FluidGlassBubble({
  size = 130,
  name,
  subLabel = 'tap',
  onClick,
  animDelay = 0,
  floatIndex = 0,
  position,
}) {
  const [popping, setPopping] = useState(false)
  const [showRipple, setShowRipple] = useState(false)
  const [hovered, setHovered] = useState(false)

  const floatVar = FLOAT_VARIANTS[floatIndex % FLOAT_VARIANTS.length]

  const handleClick = () => {
    if (popping) return
    setPopping(true)
    setShowRipple(true)
    setTimeout(() => onClick(), 440)
  }

  return (
    // Outer: absolute position on screen
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: animDelay,
        duration: 0.7,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      style={{
        position: 'absolute',
        left: position.left,
        top: position.top,
        width: size,
        height: size,
        pointerEvents: 'auto',
        zIndex: 10,
        cursor: 'pointer',
      }}
    >
      {/* Float animation layer */}
      <motion.div
        animate={popping ? { scale: [1, 1.3, 0], opacity: [1, 0.8, 0] } : floatVar.animate}
        transition={popping
          ? { duration: 0.42, ease: [0.36, 0, 0.66, -0.56] }
          : { ...floatVar.transition, delay: animDelay * 0.5 }
        }
        whileHover={!popping ? { scale: 1.1 } : {}}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        onClick={handleClick}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        {/* Subtle drop shadow that moves with bubble */}
        <div style={{
          position: 'absolute',
          bottom: -size * 0.12,
          left: '15%',
          right: '15%',
          height: size * 0.08,
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.5) 0%, transparent 70%)',
          filter: 'blur(8px)',
          transform: 'scaleY(0.4)',
          pointerEvents: 'none',
        }} />

        {/* The glass sphere */}
        <GlassSphere size={size} />

        {/* Name + tap — overlaid */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          borderRadius: '50%',
        }}>
          <span style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: size * 0.175,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.95)',
            textShadow: '0 1px 14px rgba(0,0,0,0.7), 0 0 30px rgba(0,0,0,0.5)',
            letterSpacing: '0.01em',
            lineHeight: 1,
          }}>
            {name}
          </span>
          <span style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: size * 0.09,
            color: 'rgba(255,255,255,0.4)',
            marginTop: 5,
            letterSpacing: '0.14em',
          }}>
            {subLabel}
          </span>
        </div>
      </motion.div>

      {/* Pop ripple rings */}
      {showRipple && (
        <>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.6)',
            animation: 'rippleOut 0.55s ease-out forwards',
            pointerEvents: 'none', zIndex: 20,
          }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.3)',
            animation: 'rippleOut 0.75s 0.12s ease-out forwards',
            pointerEvents: 'none', zIndex: 20,
          }} />
        </>
      )}
    </motion.div>
  )
}