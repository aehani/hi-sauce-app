import { useRef, Suspense, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, MeshTransmissionMaterial, Environment, Float, useTexture } from '@react-three/drei'
import * as THREE from 'three'

// Background plane inside the scene — shows the bg image so lens can refract it
function BackgroundPlane({ bgTexture }) {
  return (
    <mesh position={[0, 0, -2]} scale={[10, 6, 1]}>
      <planeGeometry />
      <meshBasicMaterial map={bgTexture} side={THREE.DoubleSide} />
    </mesh>
  )
}

function LensModel({ lensProps, bgTexture }) {
  const { nodes } = useGLTF('/assets/3d/lens.glb')
  const ref = useRef()

  const meshNode = Object.values(nodes).find(n => n.isMesh)

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.06
    }
  })

  if (!meshNode) return null

  return (
    <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.25}>
      <mesh
        ref={ref}
        geometry={meshNode.geometry}
        scale={lensProps.scale || 0.25}
      >
        <MeshTransmissionMaterial
          backside
          samples={16}
          resolution={512}
          transmission={lensProps.transmission ?? 1}
          roughness={lensProps.roughness ?? 0}
          ior={lensProps.ior ?? 1.15}
          thickness={lensProps.thickness ?? 5}
          chromaticAberration={lensProps.chromaticAberration ?? 0.1}
          anisotropy={lensProps.anisotropy ?? 0.01}
          distortion={0.5}
          distortionScale={0.4}
          temporalDistortion={0.2}
          color="#ffffff"
        />
      </mesh>
    </Float>
  )
}

function Scene({ lensProps, bgImageUrl }) {
  // Load background as a texture so the lens can refract it
  const bgTexture = useTexture(bgImageUrl || '/background.png')

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 4, 3]} intensity={1.5} color="#fff8f0" />
      <directionalLight position={[-3, -2, -2]} intensity={0.6} color="#ff6020" />
      <pointLight position={[0, 2, 2]} intensity={0.8} />
      <Environment preset="sunset" />
      <BackgroundPlane bgTexture={bgTexture} />
      <Suspense fallback={null}>
        <LensModel lensProps={lensProps} bgTexture={bgTexture} />
      </Suspense>
    </>
  )
}

export default function FluidGlass({
  mode = 'lens',
  lensProps = {},
  bgImageUrl = '/background.png',
  style = {},
}) {
  const props = {
    scale: 0.25,
    ior: 1.15,
    thickness: 5,
    chromaticAberration: 0.1,
    anisotropy: 0.01,
    roughness: 0,
    transmission: 1,
    ...lensProps,
  }

  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%', ...style }}
    >
      <Scene lensProps={props} bgImageUrl={bgImageUrl} />
    </Canvas>
  )
}

useGLTF.preload('/assets/3d/lens.glb')