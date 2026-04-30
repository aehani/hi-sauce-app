import { Suspense, useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas } from '@react-three/fiber'
import { useGLTF, Environment, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

function fitByHeight(scene, targetHeight) {
  const box = new THREE.Box3().setFromObject(scene)
  const size = new THREE.Vector3()
  box.getSize(size)
  const tallest = Math.max(size.x, size.y, size.z)
  const scale = targetHeight / tallest
  scene.scale.setScalar(scale)
  const box2 = new THREE.Box3().setFromObject(scene)
  const center = new THREE.Vector3()
  box2.getCenter(center)
  scene.position.sub(center)
}

function ModalBottle({ glbPath }) {
  const { scene } = useGLTF(glbPath)
  useEffect(() => {
    if (!scene) return
    fitByHeight(scene, 2.8)
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach(mat => {
          if (mat.name?.toLowerCase().includes('glass') || mat.name?.toLowerCase().includes('body')) {
            mat.transparent = true; mat.opacity = 0.35; mat.roughness = 0.0; mat.envMapIntensity = 3
            if (mat.isMeshPhysicalMaterial) { mat.transmission = 0.9; mat.ior = 1.5; mat.thickness = 0.5 }
          }
          if (mat.name?.toLowerCase().includes('sauce')) { mat.roughness = 0.05; mat.envMapIntensity = 2 }
          mat.needsUpdate = true
        })
      }
    })
  }, [scene])
  return <primitive object={scene} />
}

function ModalSachet({ glbPath }) {
  const { scene } = useGLTF(glbPath)
  useEffect(() => {
    if (!scene) return
    fitByHeight(scene, 2.6)
    scene.rotation.set(0, Math.PI / 2, 0)
  }, [scene])
  return <primitive object={scene} />
}

function ViewerCanvas({ children, accent }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 40 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.3 }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 4]} intensity={2.5} color="#fff8f0" />
      <directionalLight position={[-4, 2, -3]} intensity={1.8} color={accent} />
      <pointLight position={[0, 3, 2]} intensity={1} />
      <Environment preset="studio" />
      <Suspense fallback={null}>{children}</Suspense>
      <OrbitControls enableZoom={true} enablePan={false} minDistance={2} maxDistance={10} autoRotate autoRotateSpeed={1.5} />
    </Canvas>
  )
}

export default function BottleModal({ sauce, onClose }) {
  const [activeTab, setActiveTab] = useState('bottle')

  // Reset tab when sauce changes
  useEffect(() => { setActiveTab('bottle') }, [sauce?.id])

  return (
    <AnimatePresence>
      {sauce && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 36 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            style={{
              position: 'fixed', inset: '4%', zIndex: 201, borderRadius: 28,
              background: 'rgba(12,12,12,0.80)',
              border: '1px solid rgba(255,255,255,0.14)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              boxShadow: `0 24px 80px rgba(0,0,0,0.8), 0 0 60px ${sauce.accent}22`,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            {/* Top shine */}
            <div style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)', pointerEvents: 'none' }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.18em', marginBottom: 2, fontFamily: 'Work Sans, sans-serif', textTransform: 'uppercase' }}>3D Viewer</p>
                <h3 style={{
                  fontFamily: 'Impact, sans-serif', fontSize: 22, letterSpacing: '0.04em', textTransform: 'uppercase',
                  background: `linear-gradient(135deg, #F5ECD7 0%, ${sauce.accent} 60%, #C0200A 100%)`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>{sauce.name}</h3>
              </div>
              <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.6)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: 8, padding: '12px 20px 0' }}>
              {[
                { id: 'bottle', label: '🍶 Bottle' },
                ...(sauce.sachetGlb ? [{ id: 'sachet', label: '📦 Sachet' }] : []),
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '7px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontFamily: 'Work Sans, sans-serif', fontSize: 12, fontWeight: 600,
                    transition: 'all 0.2s',
                    background: activeTab === tab.id ? sauce.accent : 'rgba(255,255,255,0.08)',
                    color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.45)',
                    boxShadow: activeTab === tab.id ? `0 0 16px ${sauce.accent}55` : 'none',
                  }}
                >{tab.label}</button>
              ))}
              <p style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.2)', alignSelf: 'center', fontFamily: 'Work Sans, sans-serif', letterSpacing: '0.06em' }}>
                drag to rotate · scroll to zoom
              </p>
            </div>

            {/* 3D canvas area */}
            <div style={{ flex: 1, position: 'relative', margin: '8px 0 0' }}>
              {/* Glow */}
              <div style={{
                position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)',
                width: 200, height: 200, borderRadius: '50%',
                background: `radial-gradient(circle, ${sauce.accent}28 0%, transparent 70%)`,
                filter: 'blur(28px)', pointerEvents: 'none',
              }} />

              <AnimatePresence mode="wait">
                {activeTab === 'bottle' && (
                  <motion.div key="bottle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} style={{ position: 'absolute', inset: 0 }}>
                    <ViewerCanvas accent={sauce.accent}>
                      <ModalBottle glbPath={sauce.glb} />
                    </ViewerCanvas>
                  </motion.div>
                )}
                {activeTab === 'sachet' && sauce.sachetGlb && (
                  <motion.div key="sachet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} style={{ position: 'absolute', inset: 0 }}>
                    <ViewerCanvas accent={sauce.accent}>
                      <ModalSachet glbPath={sauce.sachetGlb} />
                    </ViewerCanvas>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom facts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              {sauce.facts.map((f, i) => (
                <div key={f.label} style={{ padding: '12px 10px', textAlign: 'center', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <p style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.14em', marginBottom: 3, fontFamily: 'Work Sans, sans-serif', textTransform: 'uppercase' }}>{f.label}</p>
                  <p style={{ fontSize: 16, fontWeight: 900, color: sauce.accent, fontFamily: 'Impact, sans-serif', letterSpacing: '0.02em' }}>{f.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
