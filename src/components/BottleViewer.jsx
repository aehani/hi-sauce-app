import { Suspense, useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Environment, Float } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'

function TransparentBackground() {
  const { gl } = useThree()
  useEffect(() => { gl.setClearColor(0x000000, 0) }, [gl])
  return null
}

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

function enhanceMaterials(scene) {
  scene.traverse((child) => {
    if (child.isMesh && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      mats.forEach(mat => {
        if (mat.name?.toLowerCase().includes('glass') || mat.name?.toLowerCase().includes('body')) {
          mat.transparent = true; mat.opacity = 0.38; mat.roughness = 0.0; mat.envMapIntensity = 2.5
          if (mat.isMeshPhysicalMaterial) { mat.transmission = 0.85; mat.ior = 1.5; mat.thickness = 0.5 }
        }
        if (mat.name?.toLowerCase().includes('sauce')) { mat.roughness = 0.05; mat.envMapIntensity = 1.8 }
        mat.needsUpdate = true
      })
    }
  })
}

function BottleModel({ glbPath }) {
  const { scene } = useGLTF(glbPath)
  const groupRef = useRef()
  useEffect(() => {
    if (!scene) return
    fitByHeight(scene, 2.4)
    enhanceMaterials(scene)
  }, [scene])
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.4
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.018
    }
  })
  return (
    <Float speed={1.4} floatIntensity={0.25} rotationIntensity={0.03}>
      <group ref={groupRef}><primitive object={scene} /></group>
    </Float>
  )
}

function SachetModel({ glbPath }) {
  const { scene } = useGLTF(glbPath)
  const spinRef = useRef()

  useEffect(() => {
    if (!scene) return
    // Same approach as working BottleModal: fitByHeight + scene.rotation.set(0, PI/2, 0)
    fitByHeight(scene, 2.2)
    scene.rotation.set(0, Math.PI / 2, 0)
  }, [scene])

  useFrame((state) => {
    if (spinRef.current) {
      spinRef.current.rotation.y = state.clock.elapsedTime * 0.35
    }
  })

  return (
    <Float speed={1.4} floatIntensity={0.2} rotationIntensity={0}>
      <group ref={spinRef}>
        <primitive object={scene} />
      </group>
    </Float>
  )
}

// Single shared scene — swaps content based on activeTab
// ONE Canvas, no context switching, no context loss
function SceneContent({ sauce, activeTab }) {
  return (
    <>
      <TransparentBackground />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 6, 4]} intensity={2.5} color="#fff8f0" />
      <directionalLight position={[-4, 2, -3]} intensity={1.8} color={sauce.accent} />
      <pointLight position={[0, -2, 2]} intensity={0.7} />
      <pointLight position={[0, 4, 0]} intensity={1.0} />
      <Environment preset="studio" />
      <Suspense fallback={null}>
        {activeTab === 'bottle'
          ? <BottleModel glbPath={sauce.glb} />
          : <SachetModel glbPath={sauce.sachetGlb} />
        }
      </Suspense>
    </>
  )
}

export default function BottleViewer({ sauce, onClick }) {
  const [activeTab, setActiveTab] = useState('bottle')
  useEffect(() => { setActiveTab('bottle') }, [sauce?.id])

  const hasSachet = !!sauce.sachetGlb

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'transparent', display: 'flex', flexDirection: 'column' }}>

      {/* Tab pills */}
      {hasSachet && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px 0', position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          {[{ id: 'bottle', label: '🍶 Bottle' }, { id: 'sachet', label: '📦 Sachet' }].map(tab => (
            <button
              key={tab.id}
              onClick={(e) => { e.stopPropagation(); setActiveTab(tab.id) }}
              style={{
                padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontFamily: 'Work Sans, sans-serif', fontSize: 11, fontWeight: 700,
                transition: 'all 0.22s',
                background: activeTab === tab.id ? sauce.accent : 'rgba(0,0,0,0.55)',
                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.45)',
                backdropFilter: 'blur(10px)',
                boxShadow: activeTab === tab.id ? `0 0 14px ${sauce.accent}66` : '0 2px 8px rgba(0,0,0,0.4)',
                outline: `1px solid ${activeTab === tab.id ? sauce.accent : 'rgba(255,255,255,0.1)'}`,
              }}
            >{tab.label}</button>
          ))}
        </div>
      )}

      {/* Single Canvas — no tab switching = no context loss */}
      <div style={{ flex: 1, position: 'relative', cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
        <Canvas
          camera={{ position: [0, 0.1, 4.2], fov: 42 }}
          gl={{ antialias: true, alpha: true, premultipliedAlpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
          dpr={[1, 2]}
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        >
          <SceneContent sauce={sauce} activeTab={activeTab} />
        </Canvas>

        {onClick && (
          <div style={{
            position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
            fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.14em', zIndex: 5, pointerEvents: 'none',
            padding: '4px 12px', borderRadius: 20,
            background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)',
          }}>TAP TO EXPLORE</div>
        )}
      </div>
    </div>
  )
}

useGLTF.preload('/assets/bottles/buffalo.glb')
useGLTF.preload('/assets/bottles/bbq.glb')
useGLTF.preload('/assets/bottles/burn.glb')
useGLTF.preload('/assets/sachets/buffalo.glb')
useGLTF.preload('/assets/sachets/bbq.glb')
useGLTF.preload('/assets/sachets/burn.glb')