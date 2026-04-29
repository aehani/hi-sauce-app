import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function LiquidSplash({ src, style = {} }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const w = el.clientWidth || 600
    const h = el.clientHeight || 600

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    camera.position.z = 1

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)

    const texture = new THREE.TextureLoader().load(src)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping

    const uniforms = {
      u_time:       { value: 0 },
      u_texture:    { value: texture },
      u_resolution: { value: new THREE.Vector2(w, h) },
      u_center:     { value: new THREE.Vector2(0.5, 0.45) },
    }

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float u_time;
        uniform sampler2D u_texture;
        uniform vec2 u_center;
        varying vec2 vUv;

        void main() {
          vec2 uv = vUv;
          vec2 dir = uv - u_center;
          float dist = length(dir);

          // Outward ripple wave — sauce spreading from center
          float frequency = 18.0;
          float speed = 2.2;
          float amplitude = 0.018;
          // Fade ripple near edges and center
          float falloff = smoothstep(0.0, 0.08, dist) * smoothstep(0.8, 0.4, dist);
          float ripple = sin(dist * frequency - u_time * speed) * falloff;
          uv += normalize(dir) * ripple * amplitude;

          // Secondary slower wobble — gives organic sloshing feel
          float wobbleFreq = 8.0;
          float wobbleAmp = 0.008;
          uv.x += sin(uv.y * wobbleFreq + u_time * 1.4) * wobbleAmp;
          uv.y += cos(uv.x * wobbleFreq - u_time * 1.1) * wobbleAmp;

          vec4 color = texture2D(u_texture, uv);

          // Boost brightness of the sauce color slightly
          color.rgb *= 1.15;

          gl_FragColor = color;
        }
      `,
      transparent: true,
    })

    const geometry = new THREE.PlaneGeometry(2, 2)
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const clock = new THREE.Clock()
    let animId

    const animate = () => {
      animId = requestAnimationFrame(animate)
      uniforms.u_time.value = clock.getElapsedTime()
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      const nw = el.clientWidth
      const nh = el.clientHeight
      renderer.setSize(nw, nh)
      uniforms.u_resolution.value.set(nw, nh)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      material.dispose()
      geometry.dispose()
      texture.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [src])

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', ...style }}
    />
  )
}