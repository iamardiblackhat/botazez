'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 *  SolarSystemView — click-to-focus solar system explorer
 * ═══════════════════════════════════════════════════════════════
 *  Zoom out from the globe -> full solar system, planets laid out
 *  at (visually-compressed) real distances. Click any planet ->
 *  camera flies to a full-screen close-up, drag to spin it freely.
 *  Zoom back out (scroll/pinch) -> shrinks back into the system
 *  view. Click a different planet -> flies straight to it.
 *
 *  Own original scene, own camera/transition logic, own UI chrome.
 *  Real NASA-sourced planet photography (public domain / CC-BY,
 *  self-hosted in /public/textures/planets — see README there for
 *  sourcing). Earth intentionally has NO texture here — it keeps
 *  the site's existing brand Earth treatment, wired in by the
 *  parent instead of this component inventing its own.
 *
 *  Isolated from the data/tracking pipeline, same pattern as
 *  SpaceCanvas.tsx — this only reads the `active` prop.
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type PlanetKey =
  | 'mercury' | 'venus' | 'earth' | 'mars'
  | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto'
  | 'blackhole';

interface PlanetDef {
  key: PlanetKey;
  name: string;
  radius: number;      // scene units — visually scaled, NOT real ratio
                        // (real ratios put Mercury at ~1/3 of a pixel next to Jupiter)
  distance: number;    // scene units from the Sun — log-compressed for visibility
  orbitalPeriod: number; // relative speed of revolution around the sun (arbitrary units) — 0 = static body, doesn't revolve
  textureUrl?: string;   // undefined => procedural color material (Earth, Pluto)
  color: string;          // base tint / fallback while texture loads
  rotationSpeed: number;  // idle self-rotation, radians/frame
  hasRing?: boolean;
  isBlackHole?: boolean;  // Gargantua-style easter egg body, built with custom shaders instead of a textured sphere
}

const PLANETS: PlanetDef[] = [
  { key: 'mercury', name: 'Mercury', radius: 0.6,  distance: 11, orbitalPeriod: 4.1, textureUrl: '/textures/planets/2k_mercury.jpg',       color: '#9c9188', rotationSpeed: 0.0015 },
  { key: 'venus',   name: 'Venus',   radius: 0.95, distance: 15, orbitalPeriod: 3.2, textureUrl: '/textures/planets/2k_venus_surface.jpg', color: '#c9a76a', rotationSpeed: 0.0008 },
  { key: 'earth',   name: 'Earth',   radius: 1.0,  distance: 20, orbitalPeriod: 2.6, textureUrl: undefined, color: '#2b5d8a', rotationSpeed: 0.006 },
  { key: 'mars',    name: 'Mars',    radius: 0.7,  distance: 25, orbitalPeriod: 2.1, textureUrl: '/textures/planets/2k_mars.jpg',          color: '#a1543a', rotationSpeed: 0.0058 },
  { key: 'jupiter', name: 'Jupiter', radius: 3.1,  distance: 37, orbitalPeriod: 0.85, textureUrl: '/textures/planets/2k_jupiter.jpg',       color: '#c9a978', rotationSpeed: 0.014 },
  { key: 'saturn',  name: 'Saturn',  radius: 2.7,  distance: 49, orbitalPeriod: 0.62, textureUrl: '/textures/planets/2k_saturn.jpg',        color: '#d9c48f', rotationSpeed: 0.013, hasRing: true },
  { key: 'uranus',  name: 'Uranus',  radius: 1.8,  distance: 60, orbitalPeriod: 0.41, textureUrl: '/textures/planets/2k_uranus.jpg',        color: '#a6d9d9', rotationSpeed: 0.009 },
  { key: 'neptune', name: 'Neptune', radius: 1.75, distance: 69, orbitalPeriod: 0.31, textureUrl: '/textures/planets/2k_neptune.jpg',       color: '#3e5fc9', rotationSpeed: 0.009 },
  { key: 'pluto',   name: 'Pluto',   radius: 0.35, distance: 77, orbitalPeriod: 0.24, textureUrl: undefined, color: '#c9b8a3', rotationSpeed: 0.003 },
];

// Gargantua — deep-space easter egg, sitting off on its own well past the
// outer planets. NOT part of the solar orbit (orbitalPeriod 0 = static).
// Same click -> fly-in -> spin-freely -> scroll-out-to-return mechanism as
// every planet — it's just a body with a custom shader look instead of a
// photographic texture.
const BLACK_HOLE: PlanetDef = {
  key: 'blackhole', name: 'Gargantua', radius: 6.5, distance: 165, orbitalPeriod: 0,
  textureUrl: undefined, color: '#000000', rotationSpeed: 0, isBlackHole: true,
};

const ALL_BODIES: PlanetDef[] = [...PLANETS, BLACK_HOLE];

const SUN_RADIUS = 5.5;

// Cheap, GPU-light accretion-disk look: a radial color ramp (white-hot inner
// edge -> orange -> deep red -> fades to nothing) computed from local-space
// radius, plus a faint rotating band pattern for a "flowing plasma" feel.
// No ray-marched lensing — two rings at different tilts (one flat like
// Saturn's, one near-vertical hugging the horizon) is the standard cheap
// trick for evoking the Interstellar look without full GR raytracing.
const DISK_VERTEX_SHADER = `
  varying vec2 vLocalPos;
  void main() {
    vLocalPos = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const DISK_FRAGMENT_SHADER = `
  uniform float uInner;
  uniform float uOuter;
  uniform float uTime;
  varying vec2 vLocalPos;
  void main() {
    float r = length(vLocalPos);
    float t = clamp((r - uInner) / max(0.001, uOuter - uInner), 0.0, 1.0);
    vec3 c1 = vec3(1.0, 1.0, 1.0);
    vec3 c2 = vec3(1.0, 0.75, 0.35);
    vec3 c3 = vec3(1.0, 0.35, 0.08);
    vec3 c4 = vec3(0.35, 0.05, 0.02);
    vec3 color = mix(c1, c2, smoothstep(0.0, 0.25, t));
    color = mix(color, c3, smoothstep(0.2, 0.55, t));
    color = mix(color, c4, smoothstep(0.5, 0.9, t));
    float band = sin(atan(vLocalPos.y, vLocalPos.x) * 18.0 + uTime * 1.5) * 0.5 + 0.5;
    color += band * 0.08 * (1.0 - t);
    float alpha = 1.0 - smoothstep(0.72, 1.0, t);
    gl_FragColor = vec4(color, alpha * 0.95);
  }
`;

function createGlowTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,215,150,0.9)');
  grad.addColorStop(0.35, 'rgba(255,140,60,0.35)');
  grad.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

type Mode = 'overview' | 'transitioning' | 'focus';

interface SolarSystemViewProps {
  active: boolean;
  onExit?: () => void; // called if the user explicitly backs all the way out (e.g. presses Escape / back button) to hand control back to the globe
  earthMaterial?: THREE.Material; // brand Earth material, supplied by the parent so this component never invents its own Earth look
}

export default function SolarSystemView({ active, onExit, earthMaterial }: SolarSystemViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [focusedName, setFocusedName] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('overview');

  const stateRef = useRef({
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    controls: null as OrbitControls | null,
    planetMeshes: new Map<PlanetKey, THREE.Mesh>(),
    planetGroups: new Map<PlanetKey, THREE.Group>(), // orbital pivot per planet
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
    mode: 'overview' as Mode,
    focusKey: null as PlanetKey | null,
    animFrame: 0,
    clock: new THREE.Clock(),
    bhTime: 0,
    bhDiskMats: [] as THREE.ShaderMaterial[],
    transition: null as null | {
      fromPos: THREE.Vector3; toPos: THREE.Vector3;
      fromTarget: THREE.Vector3; toTarget: THREE.Vector3;
      start: number; duration: number;
      onDone?: () => void;
    },
  });

  const beginTransition = useCallback((toPos: THREE.Vector3, toTarget: THREE.Vector3, duration = 1.4, onDone?: () => void) => {
    const s = stateRef.current;
    if (!s.camera || !s.controls) return;
    s.mode = 'transitioning';
    setMode('transitioning');
    s.transition = {
      fromPos: s.camera.position.clone(),
      toPos,
      fromTarget: s.controls.target.clone(),
      toTarget,
      start: performance.now(),
      duration: duration * 1000,
      onDone,
    };
  }, []);

  const focusPlanet = useCallback((key: PlanetKey) => {
    const s = stateRef.current;
    const group = s.planetGroups.get(key);
    const mesh = s.planetMeshes.get(key);
    if (!group || !mesh) return;
    const def = ALL_BODIES.find(p => p.key === key)!;
    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);
    const camDist = def.radius * 4.2;
    const camPos = worldPos.clone().add(new THREE.Vector3(camDist * 0.6, camDist * 0.35, camDist * 0.7));
    s.focusKey = key;
    setFocusedName(def.name);
    beginTransition(camPos, worldPos, 1.3, () => {
      s.mode = 'focus';
      setMode('focus');
      if (s.controls) {
        s.controls.minDistance = def.radius * 1.8;
        s.controls.maxDistance = def.radius * 6; // past this, we snap back to overview
      }
    });
  }, [beginTransition]);

  const returnToOverview = useCallback(() => {
    const s = stateRef.current;
    if (!s.camera) return;
    s.focusKey = null;
    setFocusedName(null);
    const overviewPos = new THREE.Vector3(0, 55, 130);
    beginTransition(overviewPos, new THREE.Vector3(0, 0, 0), 1.3, () => {
      s.mode = 'overview';
      setMode('overview');
      if (s.controls) {
        s.controls.minDistance = 20;
        s.controls.maxDistance = 220;
      }
    });
  }, [beginTransition]);

  useEffect(() => {
    if (!active || !containerRef.current) return;
    const container = containerRef.current;
    const s = stateRef.current;

    const scene = new THREE.Scene();
    s.scene = scene;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 4000);
    camera.position.set(0, 55, 130);
    s.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    s.renderer = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 20;
    controls.maxDistance = 220;
    controls.target.set(0, 0, 0);
    s.controls = controls;

    // Starfield backdrop — real Milky Way photo on a large inverted sphere
    const loader = new THREE.TextureLoader();
    const starGeo = new THREE.SphereGeometry(1800, 64, 64);
    const starTex = loader.load('/textures/planets/2k_stars_milky_way.jpg');
    starTex.colorSpace = THREE.SRGBColorSpace;
    const starMat = new THREE.MeshBasicMaterial({ map: starTex, side: THREE.BackSide });
    scene.add(new THREE.Mesh(starGeo, starMat));

    // Sun — emissive, lights the scene
    const sunTex = loader.load('/textures/planets/2k_sun.jpg');
    sunTex.colorSpace = THREE.SRGBColorSpace;
    const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(SUN_RADIUS, 48, 48), sunMat);
    scene.add(sunMesh);
    const sunLight = new THREE.PointLight(0xfff4e0, 3.2, 0, 0.15);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0x556, 0.25)); // faint fill so night-sides aren't pure black

    // Planets, each on its own orbital pivot group so revolution is just a rotation of the pivot
    ALL_BODIES.forEach((def) => {
      const pivot = new THREE.Group();
      pivot.rotation.y = def.isBlackHole ? -2.3 : Math.random() * Math.PI * 2; // black hole sits fixed off to its own side; planets stagger randomly
      scene.add(pivot);
      s.planetGroups.set(def.key, pivot);

      if (def.isBlackHole) {
        // Custom body: invisible generous hit-sphere (click target + world-position
        // anchor), a pure-black event horizon, an additive glow sprite behind it,
        // and two shader-ramp rings (one flat, one near-vertical) standing in for
        // the accretion disk + lensed light without full GR raytracing.
        const anchor = new THREE.Group();
        anchor.position.set(def.distance, 8, 0); // slight elevation — reads as "its own patch of space", not on the ecliptic
        pivot.add(anchor);

        const glowTex = createGlowTexture();
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
        glow.scale.set(20, 20, 1);
        glow.renderOrder = 0;

        const horizon = new THREE.Mesh(new THREE.SphereGeometry(2.0, 48, 48), new THREE.MeshBasicMaterial({ color: 0x000000 }));
        horizon.renderOrder = 1;

        const diskMat = new THREE.ShaderMaterial({
          vertexShader: DISK_VERTEX_SHADER,
          fragmentShader: DISK_FRAGMENT_SHADER,
          uniforms: { uInner: { value: 2.6 }, uOuter: { value: 8.5 }, uTime: { value: 0 } },
          transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
        });
        const disk = new THREE.Mesh(new THREE.RingGeometry(2.6, 8.5, 96, 1), diskMat);
        disk.rotation.x = Math.PI / 2 - 0.35;
        disk.renderOrder = 2;

        const lensMat = new THREE.ShaderMaterial({
          vertexShader: DISK_VERTEX_SHADER,
          fragmentShader: DISK_FRAGMENT_SHADER,
          uniforms: { uInner: { value: 2.3 }, uOuter: { value: 4.6 }, uTime: { value: 0 } },
          transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
        });
        const lensRing = new THREE.Mesh(new THREE.RingGeometry(2.3, 4.6, 96, 1), lensMat);
        lensRing.rotation.z = Math.PI / 2;
        lensRing.rotation.y = 0.2;
        lensRing.renderOrder = 3;

        s.bhDiskMats.push(diskMat, lensMat);

        const hitArea = new THREE.Mesh(new THREE.SphereGeometry(8.5, 16, 16), new THREE.MeshBasicMaterial({ visible: false }));
        hitArea.userData.planetKey = def.key;

        anchor.add(glow, horizon, disk, lensRing, hitArea);
        s.planetMeshes.set(def.key, hitArea);
        return; // no texture material, no ring code, no orbit path for the black hole
      }

      let mat: THREE.Material;
      if (def.key === 'earth' && earthMaterial) {
        mat = earthMaterial;
      } else if (def.textureUrl) {
        const tex = loader.load(def.textureUrl);
        tex.colorSpace = THREE.SRGBColorSpace;
        mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.0 });
      } else {
        mat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.95 });
      }

      const mesh = new THREE.Mesh(new THREE.SphereGeometry(def.radius, 48, 48), mat);
      mesh.position.set(def.distance, 0, 0);
      mesh.userData.planetKey = def.key;
      pivot.add(mesh);
      s.planetMeshes.set(def.key, mesh);

      if (def.hasRing) {
        const ringTex = loader.load('/textures/planets/2k_saturn_ring_alpha.png');
        const ringGeo = new THREE.RingGeometry(def.radius * 1.3, def.radius * 2.3, 64);
        const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, side: THREE.DoubleSide, transparent: true });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2 - 0.35;
        mesh.add(ring);
      }

      // faint orbit path so the layout reads clearly, not just floating dots
      const orbitGeo = new THREE.RingGeometry(def.distance - 0.02, def.distance + 0.02, 128);
      const orbitMat = new THREE.MeshBasicMaterial({ color: 0x3a4a5c, side: THREE.DoubleSide, transparent: true, opacity: 0.35 });
      const orbitRing = new THREE.Mesh(orbitGeo, orbitMat);
      orbitRing.rotation.x = Math.PI / 2;
      scene.add(orbitRing);
    });

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    const handleClick = (ev: MouseEvent) => {
      if (s.mode !== 'overview') return; // only pick planets from the overview
      const rect = renderer.domElement.getBoundingClientRect();
      s.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      s.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      s.raycaster.setFromCamera(s.pointer, camera);
      const hits = s.raycaster.intersectObjects(Array.from(s.planetMeshes.values()), false);
      if (hits.length > 0) {
        const key = hits[0].object.userData.planetKey as PlanetKey;
        focusPlanet(key);
      }
    };
    renderer.domElement.addEventListener('click', handleClick);

    // Zoom-out-to-return: once focused, going past maxDistance on the
    // controls means "let go" of the planet -> snap back to the system view.
    const handleControlsChange = () => {
      if (s.mode !== 'focus' || !s.focusKey || !s.camera) return;
      const def = ALL_BODIES.find(p => p.key === s.focusKey)!;
      const dist = s.camera.position.distanceTo(s.controls!.target);
      if (dist >= def.radius * 5.7) {
        returnToOverview();
      }
    };
    controls.addEventListener('change', handleControlsChange);

    const animate = () => {
      s.animFrame = requestAnimationFrame(animate);
      const dt = s.clock.getDelta();

      // Revolve + self-rotate planets (paused while a planet is focused, so
      // spinning it to look around doesn't fight its own orbital motion).
      // Static bodies (orbitalPeriod 0, e.g. the black hole) never revolve.
      if (s.mode !== 'focus') {
        ALL_BODIES.forEach((def) => {
          if (def.orbitalPeriod === 0) return;
          const pivot = s.planetGroups.get(def.key);
          if (pivot) pivot.rotation.y += dt * def.orbitalPeriod * 0.05;
        });
      }
      s.planetMeshes.forEach((mesh, key) => {
        const def = ALL_BODIES.find(p => p.key === key)!;
        mesh.rotation.y += def.rotationSpeed;
      });
      sunMesh.rotation.y += 0.0006;

      // Accretion disk plasma animation
      s.bhTime += dt;
      s.bhDiskMats.forEach((m) => { m.uniforms.uTime.value = s.bhTime; });

      // Camera transition tween
      if (s.transition && s.camera && s.controls) {
        const t = Math.min(1, (performance.now() - s.transition.start) / s.transition.duration);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out-cubic
        s.camera.position.lerpVectors(s.transition.fromPos, s.transition.toPos, eased);
        s.controls.target.lerpVectors(s.transition.fromTarget, s.transition.toTarget, eased);
        if (t >= 1) {
          const done = s.transition.onDone;
          s.transition = null;
          done?.();
        }
      }

      s.controls?.update();
      if (s.renderer && s.scene && s.camera) s.renderer.render(s.scene, s.camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(s.animFrame);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      controls.removeEventListener('change', handleControlsChange);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
      s.planetMeshes.clear();
      s.planetGroups.clear();
      s.bhDiskMats = [];
      s.bhTime = 0;
      s.scene = null;
      s.camera = null;
      s.renderer = null;
      s.controls = null;
      s.transition = null;
      s.mode = 'overview';
      setMode('overview');
      setFocusedName(null);
    };
  }, [active, earthMaterial, focusPlanet, returnToOverview]);

  if (!active) return null;

  return (
    <div className="absolute inset-0 z-[200]">
      <div ref={containerRef} className="w-full h-full" />

      {/* Always-visible readout: what you're looking at + how to get back,
          so this never feels like an unlabeled toy. */}
      <div className="absolute top-4 left-4 font-mono text-white/70 pointer-events-none select-none">
        <div className="text-[11px] tracking-[0.2em] uppercase text-white/35">
          {mode === 'overview' ? 'SOLAR SYSTEM' : mode === 'focus' ? 'FOCUSED ON' : 'TRANSITIONING'}
        </div>
        {focusedName && (
          <div className="text-[20px] font-semibold mt-0.5">{focusedName}</div>
        )}
      </div>

      {mode === 'focus' && (
        <button
          onClick={returnToOverview}
          className="absolute top-4 right-4 font-mono text-[12px] uppercase tracking-wider text-white/60 hover:text-white/90 border border-white/15 hover:border-white/35 rounded-lg px-3 py-2 pointer-events-auto transition-colors"
        >
          ← Solar System
        </button>
      )}

      {mode === 'overview' && onExit && (
        <button
          onClick={onExit}
          className="absolute top-4 right-4 font-mono text-[12px] uppercase tracking-wider text-white/60 hover:text-white/90 border border-white/15 hover:border-white/35 rounded-lg px-3 py-2 pointer-events-auto transition-colors"
        >
          ← Back to Earth
        </button>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[11px] uppercase tracking-wider text-white/30 pointer-events-none select-none">
        {mode === 'overview' ? 'Click a planet to zoom in · drag to look around' : 'Drag to spin · scroll out to return'}
      </div>
    </div>
  );
}
