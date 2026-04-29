import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const KEYS = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  ['','0','⌫'],
]

const PASSCODE_LENGTH = 4

export default function PasscodeEntry({ staff, onSuccess, onBack }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    if (code.length === PASSCODE_LENGTH) {
      if (code === staff.passcode) {
        setTimeout(() => onSuccess(staff), 200)
      } else {
        setError(true)
        setShake(true)
        setTimeout(() => {
          setCode('')
          setError(false)
          setShake(false)
        }, 600)
      }
    }
  }, [code, staff, onSuccess])

  const handleKey = (key) => {
    if (key === '⌫') {
      setCode(prev => prev.slice(0, -1))
    } else if (key === '') {
      return
    } else if (code.length < PASSCODE_LENGTH) {
      setCode(prev => prev + key)
    }
  }

  return (
    <motion.div
      className="page-enter flex flex-col items-center justify-center h-full px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-8 left-6 flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors font-display text-sm tracking-widest uppercase"
      >
        <span>←</span> Back
      </button>

      {/* Avatar bubble */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="mb-8 flex flex-col items-center gap-3"
      >
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: 88,
            height: 88,
            background: 'radial-gradient(ellipse at 35% 35%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.03) 100%)',
            border: '1px solid rgba(255,255,255,0.22)',
            boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <span className="font-display text-2xl font-black text-white">
            {staff.name[0]}
          </span>
        </div>
        <div className="text-center">
          <p className="font-display text-xl font-bold text-white tracking-tight">{staff.name}</p>
          <p className="text-white/40 text-sm mt-0.5 tracking-wide">Enter your passcode</p>
        </div>
      </motion.div>

      {/* Passcode dots */}
      <div className={`flex gap-4 mb-10 ${shake ? 'shake' : ''}`}>
        {Array.from({ length: PASSCODE_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`passcode-dot ${i < code.length ? (error ? 'border-red-400' : 'filled') : ''}`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="flex flex-col gap-4">
        {KEYS.map((row, ri) => (
          <div key={ri} className="flex gap-4 justify-center">
            {row.map((key, ki) => (
              <button
                key={ki}
                className={`keypad-btn ${key === '' ? 'opacity-0 pointer-events-none' : ''}`}
                onClick={() => handleKey(key)}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Error hint */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 text-red-400/80 text-sm tracking-wide"
          >
            Incorrect passcode
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}