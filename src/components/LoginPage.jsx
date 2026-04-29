import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StaffBubble from './StaffBubble'
import PasscodeEntry from './PasscodeEntry'
import { STAFF, BOOTH } from '../config/staff'

// Update this to your background image filename in /public/
const BG_IMAGE = '/background.png'

function Logo() {
  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {/* Replace with your actual logo: <img src="/hi-logo.png" alt="Hi!" className="h-48 w-auto" /> */}
      <img src="/hi-logo.png" alt="Hi!" className="h-48 w-auto" />
      <p className="text-white/25 text-[10px] font-bold tracking-[0.25em] uppercase">
        {BOOTH.event} · {BOOTH.booth}
      </p>
    </div>
  )
}

export default function LoginPage({ onLogin }) {
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [showPasscode, setShowPasscode] = useState(false)

  const handleBubbleSelect = (staff) => {
    setSelectedStaff(staff)
    setTimeout(() => setShowPasscode(true), 420)
  }

  const handleBack = () => {
    setShowPasscode(false)
    setSelectedStaff(null)
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0A0A0A]">

      {/* Full-screen background image */}
      <img
        src={BG_IMAGE}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* Dark overlay so text stays readable */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1, }}
      />

      {/* Ambient red glow blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
        <div className="absolute rounded-full" style={{
          width: 500, height: 500, top: '-120px', right: '-80px',
          background: 'radial-gradient(circle, rgba(232,52,28,0.2) 0%, transparent 70%)',
          filter: 'blur(70px)',
        }} />
        <div className="absolute rounded-full" style={{
          width: 350, height: 350, bottom: '60px', left: '-60px',
          background: 'radial-gradient(circle, rgba(232,52,28,0.12) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }} />
      </div>

      <AnimatePresence mode="wait">

        {/* ── BUBBLE SELECT SCREEN ── */}
        {!showPasscode && (
          <motion.div
            key="bubbles"
            className="relative h-full flex flex-col"
            style={{ zIndex: 3 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.28 }}
          >
            {/* Logo */}
            <div className="flex justify-center pt-12 pb-2 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                <Logo />
              </motion.div>
            </div>

            {/* Prompt */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="text-center text-white/40 text-xs tracking-[0.28em] uppercase font-semibold pointer-events-none"
            >
              Who's running the booth?
            </motion.p>

            {/* Bubble field */}
            <div className="relative flex-1 w-full">
              {STAFF.map((staff, i) => (
                <StaffBubble
                  key={staff.id}
                  staff={staff}
                  index={i}
                  onSelect={handleBubbleSelect}
                  animDelay={0.15 + i * 0.1}
                  bgImageUrl={BG_IMAGE}
                />
              ))}
            </div>

            {/* Footer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-center text-white/15 text-[10px] tracking-[0.14em] uppercase pb-8 pointer-events-none"
            >
              {BOOTH.dates}
            </motion.p>
          </motion.div>
        )}

        {/* ── PASSCODE SCREEN ── */}
        {showPasscode && (
          <motion.div
            key="passcode"
            className="relative h-full flex items-center justify-center px-4"
            style={{ zIndex: 3 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div
              className="relative w-full rounded-3xl overflow-hidden"
              style={{
                maxWidth: 400,
                height: '82vh',
                background: 'rgba(255,255,255,0.045)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
              }}
            >
              <PasscodeEntry
                staff={selectedStaff}
                onSuccess={onLogin}
                onBack={handleBack}
              />
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      <div className="noise" />
    </div>
  )
}