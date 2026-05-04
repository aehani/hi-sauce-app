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

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) +
                 (c - a) * u.y * (1.0 - u.x) +
                 (d - b) * u.x * u.y;
        }

        void main() {
          vec2 uv = vUv;
          vec2 dir = uv - u_center;
          float dist = length(dir);
          float t = u_time;

          // Viscosity — slows expansion over time so it settles naturally
          float drag = 2.5;
          float expansion = t / (1.0 + drag * t);

          // Base radius growth
          float radius = expansion * 0.6;

          // Edge breakup — irregular splatter shape using noise
          float n = noise(uv * 12.0 + t * 2.0);
          float edge = radius + (n - 0.5) * 0.08;

          // Splat mask — blob shape
          float mask = smoothstep(edge, edge - 0.02, dist);

          // Radial push — main splat motion outward
          float push = (radius - dist) * mask;

          // Thick center — viscosity feel
          float thickness = smoothstep(0.0, 0.3, radius - dist);

          // UV distortion from splat push
          uv += normalize(dir) * push * 0.25;

          // Subtle micro drips at edges
          float drip = noise(uv * 40.0) * 0.01 * thickness;
          uv += dir * drip;

          vec4 color = texture2D(u_texture, uv);

          // Sauce gloss — fake specular highlight at center
          float highlight = pow(thickness, 2.0) * 0.25;
          color.rgb += highlight;

          // Edge darkening — depth illusion
          color.rgb *= mix(0.85, 1.0, thickness);

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
    <div ref={mountRef} style={{ width: '100%', height: '100%', ...style }} />
  )
}