'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 *  OceanView — live maritime water surface with a Sea State control
 * ═══════════════════════════════════════════════════════════════
 *  Full-screen animated ocean, triggered from a maritime chokepoint
 *  or port. Real wave motion (layered Gerstner-style displacement,
 *  not a static texture), a Sea State slider (calm -> rough, moves
 *  wave height/choppiness live) and a Time of Day slider (sun angle
 *  + sky/water color), matching the reference interaction: a live
 *  meter you push, not a fixed animation.
 *
 *  Own original scene/shader — not copied code. Isolated from the
 *  tracking data pipeline: reads only `active` / `originLabel` props.
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

interface OceanViewProps {
  active: boolean;
  originLabel?: string; // e.g. "STRAIT OF HORMUZ" — which chokepoint/port opened this view
  onExit?: () => void;
}

// Sum of a few sine waves at different frequencies/directions approximates
// a Gerstner sea surface without the cost/complexity of true trochoidal
// math — this is the standard technique behind most real-time browser
// oceans (the same idea Open Sea's "Gerstner swell + FBM micro-surface"
// description points at).
const WAVE_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uSeaState; // 0..1, calm -> rough
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vHeight;

  float wave(vec2 p, vec2 dir, float freq, float speed, float amp, float t) {
    return sin(dot(p, dir) * freq + t * speed) * amp;
  }

  void main() {
    vec3 pos = position;
    float t = uTime;
    float s = uSeaState;

    float h = 0.0;
    h += wave(pos.xz, normalize(vec2(1.0, 0.3)), 0.06, 1.1, 0.35 + s * 1.6, t);
    h += wave(pos.xz, normalize(vec2(-0.6, 1.0)), 0.11, 1.6, 0.22 + s * 1.1, t);
    h += wave(pos.xz, normalize(vec2(0.4, -0.8)), 0.22, 2.3, 0.10 + s * 0.6, t);
    h += wave(pos.xz, normalize(vec2(0.9, 0.5)), 0.45, 3.1, 0.04 + s * 0.25, t);
    pos.y += h;
    vHeight = h;

    // finite-difference normal for lighting
    float eps = 0.6;
    float hX = 0.0, hZ = 0.0;
    hX += wave(pos.xz + vec2(eps, 0.0), normalize(vec2(1.0, 0.3)), 0.06, 1.1, 0.35 + s * 1.6, t);
    hX += wave(pos.xz + vec2(eps, 0.0), normalize(vec2(-0.6, 1.0)), 0.11, 1.6, 0.22 + s * 1.1, t);
    hZ += wave(pos.xz + vec2(0.0, eps), normalize(vec2(1.0, 0.3)), 0.06, 1.1, 0.35 + s * 1.6, t);
    hZ += wave(pos.xz + vec2(0.0, eps), normalize(vec2(-0.6, 1.0)), 0.11, 1.6, 0.22 + s * 1.1, t);
    vec3 tangentX = normalize(vec3(eps, hX - h, 0.0));
    vec3 tangentZ = normalize(vec3(0.0, hZ - h, eps));
    vNormal = normalize(cross(tangentZ, tangentX));

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const WAVE_FRAGMENT_SHADER = `
  uniform vec3 uSunDir;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform vec3 uSkyColor;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vHeight;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(uSunDir);

    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    float diffuse = clamp(dot(N, L), 0.0, 1.0);

    vec3 base = mix(uDeepColor, uShallowColor, clamp(vHeight * 0.5 + 0.5, 0.0, 1.0));
    vec3 color = mix(base * (0.35 + diffuse * 0.65), uSkyColor, fresnel * 0.75);

    // sun glint
    vec3 R = reflect(-L, N);
    float spec = pow(max(dot(R, V), 0.0), 220.0);
    color += vec3(1.0, 0.96, 0.85) * spec * 1.4;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function OceanView({ active, originLabel, onExit }: OceanViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [seaState, setSeaState] = useState(35); // 0-100, matches the reference slider's scale
  const [timeOfDay, setTimeOfDay] = useState(60); // 0-100 -> dawn..noon..dusk
  const seaStateRef = useRef(seaState);
  const timeRef = useRef(timeOfDay);
  seaStateRef.current = seaState;
  timeRef.current = timeOfDay;

  const stateRef = useRef({
    renderer: null as THREE.WebGLRenderer | null,
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    material: null as THREE.ShaderMaterial | null,
    sunLight: null as THREE.DirectionalLight | null,
    animFrame: 0,
    clock: new THREE.Clock(),
  });

  const applyTimeOfDay = useCallback((t01: number) => {
    const s = stateRef.current;
    if (!s.material || !s.sunLight || !s.scene) return;
    // 0 = dawn, 0.5 = noon, 1 = dusk — sun angle sweeps low -> high -> low
    const angle = Math.PI * t01; // 0..PI across the sky
    const sunDir = new THREE.Vector3(Math.cos(angle), Math.sin(angle) * 0.9 + 0.15, 0.3).normalize();
    s.sunLight.position.copy(sunDir).multiplyScalar(50);
    s.material.uniforms.uSunDir.value.copy(sunDir);

    const noonFactor = Math.sin(angle); // 0 at horizon, 1 at noon
    const sky = new THREE.Color().setHSL(0.58, 0.55, 0.25 + noonFactor * 0.35);
    const deep = new THREE.Color().setHSL(0.56, 0.6, 0.06 + noonFactor * 0.08);
    const shallow = new THREE.Color().setHSL(0.5, 0.55, 0.18 + noonFactor * 0.22);
    s.material.uniforms.uSkyColor.value.copy(sky);
    s.material.uniforms.uDeepColor.value.copy(deep);
    s.material.uniforms.uShallowColor.value.copy(shallow);
    s.scene.background = sky;
    s.scene.fog = new THREE.Fog(sky.getHex(), 60, 400);
  }, []);

  useEffect(() => {
    if (!active || !containerRef.current) return;
    const container = containerRef.current;
    const s = stateRef.current;

    const scene = new THREE.Scene();
    s.scene = scene;

    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 2000);
    // "Zooming into the water": start pulled back high above the surface and
    // tween down into the resting close-to-the-water framing over ~1.3s,
    // rather than hard-cutting straight to the final shot.
    const introFrom = new THREE.Vector3(0, 42, 95);
    const introTo = new THREE.Vector3(0, 6, 26);
    const introStart = performance.now();
    const introDuration = 1300;
    camera.position.copy(introFrom);
    camera.lookAt(0, 1, -40);
    s.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    s.renderer = renderer;

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    scene.add(sunLight);
    s.sunLight = sunLight;
    scene.add(new THREE.AmbientLight(0x334455, 0.4));

    const geo = new THREE.PlaneGeometry(400, 400, 220, 220);
    geo.rotateX(-Math.PI / 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: WAVE_VERTEX_SHADER,
      fragmentShader: WAVE_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uSeaState: { value: seaStateRef.current / 100 },
        uSunDir: { value: new THREE.Vector3(0.5, 0.6, 0.3) },
        uDeepColor: { value: new THREE.Color(0x03202b) },
        uShallowColor: { value: new THREE.Color(0x0e5a68) },
        uSkyColor: { value: new THREE.Color(0x274a6b) },
      },
    });
    s.material = material;
    const water = new THREE.Mesh(geo, material);
    scene.add(water);

    applyTimeOfDay(timeRef.current / 100);

    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      s.animFrame = requestAnimationFrame(animate);
      const t = s.clock.getElapsedTime();
      if (s.material) {
        s.material.uniforms.uTime.value = t;
        s.material.uniforms.uSeaState.value = seaStateRef.current / 100;
      }
      const introT = Math.min(1, (performance.now() - introStart) / introDuration);
      if (introT < 1) {
        const eased = 1 - Math.pow(1 - introT, 3); // ease-out-cubic, same curve used for the solar system's camera tweens
        camera.position.lerpVectors(introFrom, introTo, eased);
        camera.lookAt(0, 1, -40);
      } else {
        // gentle drifting camera sway so it doesn't feel static, scaled down in calm seas
        const sway = 0.15 + (seaStateRef.current / 100) * 0.5;
        camera.position.y = 6 + Math.sin(t * 0.3) * sway;
        camera.rotation.z = Math.sin(t * 0.22) * 0.01 * sway;
      }
      if (s.renderer && s.scene && s.camera) s.renderer.render(s.scene, s.camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(s.animFrame);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geo.dispose();
      material.dispose();
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
      s.renderer = null;
      s.scene = null;
      s.camera = null;
      s.material = null;
      s.sunLight = null;
    };
  }, [active, applyTimeOfDay]);

  useEffect(() => {
    applyTimeOfDay(timeOfDay / 100);
  }, [timeOfDay, applyTimeOfDay]);

  if (!active) return null;

  const seaStateLabel = seaState < 15 ? 'CALM' : seaState < 40 ? 'MODERATE' : seaState < 70 ? 'ROUGH' : 'STORM';
  const timeLabel = timeOfDay < 20 ? 'DAWN' : timeOfDay < 45 ? 'MORNING' : timeOfDay < 60 ? 'NOON' : timeOfDay < 85 ? 'AFTERNOON' : 'DUSK';

  return (
    <div className="absolute inset-0 z-[200]">
      <div ref={containerRef} className="w-full h-full" />

      <div className="absolute top-4 left-4 font-mono text-white/70 pointer-events-none select-none">
        <div className="text-[11px] tracking-[0.2em] uppercase text-white/35">MARITIME · LIVE WATER</div>
        <div className="text-[20px] font-semibold mt-0.5">{originLabel || 'Open Water'}</div>
      </div>

      {onExit && (
        <button
          onClick={onExit}
          className="absolute top-4 right-4 font-mono text-[12px] uppercase tracking-wider text-white/60 hover:text-white/90 border border-white/15 hover:border-white/35 rounded-lg px-3 py-2 pointer-events-auto transition-colors"
        >
          ← Back to Map
        </button>
      )}

      {/* Live controls — the meters you push, matching the reference demo */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-3 pointer-events-auto bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl px-5 py-4 min-w-[280px]">
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-white/60">
          <span>Sea State</span>
          <span className="text-white/90">{seaState} · {seaStateLabel}</span>
        </div>
        <input
          type="range" min={0} max={100} value={seaState}
          onChange={(e) => setSeaState(Number(e.target.value))}
          className="w-full accent-cyan-400"
        />
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-white/60">
          <span>Time of Day</span>
          <span className="text-white/90">{timeLabel}</span>
        </div>
        <input
          type="range" min={0} max={100} value={timeOfDay}
          onChange={(e) => setTimeOfDay(Number(e.target.value))}
          className="w-full accent-amber-400"
        />
      </div>
    </div>
  );
}
