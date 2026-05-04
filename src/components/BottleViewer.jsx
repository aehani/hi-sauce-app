import { Suspense, useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Environment, Float } from '@react-three/drei'
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

// Visibility toggle — keeps both models mounted, just hides the inactive one
// This avoids destroying/recreating GPU resources when switching tabs
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
        {/* Keep both mounted — just toggle visibility to avoid GPU context churn on iPad */}
        <group visible={activeTab === 'bottle'}>
          <BottleModel glbPath={sauce.glb} />
        </group>
        <group visible={activeTab === 'sachet'}>
          {sauce.sachetGlb && <SachetModel glbPath={sauce.sachetGlb} />}
        </group>
      </Suspense>
    </>
  )
}

export default function BottleViewer({ sauce, onClick, activeTab = 'bottle' }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'transparent', display: 'flex', flexDirection: 'column' }}>

      {/* Single persistent Canvas — never unmounts, never recreates WebGL context */}
      <div style={{ flex: 1, position: 'relative', cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
        <Canvas
          camera={{ position: [0, 0.1, 4.2], fov: 42 }}
          gl={{
            antialias: true,
            alpha: true,
            premultipliedAlpha: false,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
            // iPad-safe settings — reduce memory pressure
            powerPreference: 'low-power',
            failIfMajorPerformanceCaveat: false,
          }}
          dpr={Math.min(window.devicePixelRatio, 1.5)} // Cap at 1.5 for iPad — 2x causes OOM
          style={{ width: '100%', height: '100%', background: 'transparent' }}
          onCreated={({ gl }) => {
            // Tell the browser this canvas can be discarded under memory pressure
            gl.getContext().canvas.style.willChange = 'auto'
          }}
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

// Preload all GLBs upfront so switching is instant and doesn't spike memory
useGLTF.preload('/assets/bottles/buffalo.glb')
useGLTF.preload('/assets/bottles/bbq.glb')
useGLTF.preload('/assets/bottles/burn.glb')
useGLTF.preload('/assets/sachets/buffalo.glb')
useGLTF.preload('/assets/sachets/bbq.glb')
useGLTF.preload('/assets/sachets/burn.glb')