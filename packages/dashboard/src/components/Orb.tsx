import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface OrbProps {
  active?: boolean;
  scale?: number;
}

const SHEEN = new THREE.Color("#7C8CFF");
const DARK = new THREE.Color("#0A0C0F");

export function Orb({ active = false, scale = 1 }: OrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const light2Ref = useRef<THREE.PointLight>(null);

  const shader = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uActive: { value: 0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;
      uniform float uTime;
      uniform float uActive;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vViewDir = normalize(cameraPosition - vWorldPos);
        vec3 pos = position;
        float breathe = sin(uTime * 0.8) * 0.02 * (1.0 + uActive * 0.8);
        float pulse = sin(uTime * 2.0) * 0.005 * uActive;
        pos += normal * (breathe + pulse);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;
      uniform float uTime;
      uniform float uActive;
      void main() {
        float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), 3.0);
        float fresnelSoft = pow(1.0 - abs(dot(vNormal, vViewDir)), 1.5);

        vec3 idleColor = vec3(0.12, 0.14, 0.22);
        vec3 activeColor = vec3(0.486, 0.549, 1.0);
        vec3 color = mix(idleColor, activeColor, uActive * 0.8);

        color += activeColor * fresnel * uActive * 0.7;
        color += vec3(0.15, 0.17, 0.3) * fresnelSoft * 0.3;

        float alpha = mix(0.4, 0.85, uActive);
        alpha += fresnel * 0.4 * (0.3 + uActive * 0.7);

        float shimmer = sin(uTime * 2.5 + vWorldPos.y * 5.0) * 0.5 + 0.5;
        alpha += shimmer * 0.06 * (0.2 + uActive * 0.8);

        float innerGlow = pow(fresnelSoft, 2.0) * 0.15 * (0.3 + uActive * 0.7);
        alpha += innerGlow;

        gl_FragColor = vec4(color, alpha);
      }
    `,
  }), []);

  const ringShader = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uActive: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uActive;
      void main() {
        float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
        float dist = length(vUv - 0.5);

        float ring = smoothstep(0.48, 0.5, dist) * smoothstep(0.52, 0.5, dist);

        float sweep = sin(angle * 3.0 + uTime * 1.5) * 0.5 + 0.5;
        float sweep2 = sin(angle * 2.0 - uTime * 0.8) * 0.5 + 0.5;

        vec3 color = vec3(0.486, 0.549, 1.0);
        float alpha = ring * sweep * 0.3 * uActive;
        alpha += ring * sweep2 * 0.15 * uActive;
        alpha += ring * 0.05 * (0.3 + uActive * 0.7);

        gl_FragColor = vec4(color, alpha);
      }
    `,
  }), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    shader.uniforms.uTime.value = t;
    ringShader.uniforms.uTime.value = t;

    const target = active ? 1 : 0;
    const current = THREE.MathUtils.lerp(shader.uniforms.uActive.value, target, 0.03);
    shader.uniforms.uActive.value = current;
    ringShader.uniforms.uActive.value = current;

    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.08;
      meshRef.current.rotation.x = Math.sin(t * 0.05) * 0.05;
    }

    if (glowRef.current) {
      const s = (1.8 + Math.sin(t * 0.7) * 0.15) * (1 + current * 0.4);
      glowRef.current.scale.setScalar(s * scale);
      const m = glowRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.04 + current * 0.08 + Math.sin(t * 1.2) * 0.02 * current;
    }

    if (outerRef.current) {
      const s = (2.8 + Math.sin(t * 0.4) * 0.2) * (1 + current * 0.5);
      outerRef.current.scale.setScalar(s * scale);
      const m = outerRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.015 + current * 0.03;
    }

    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI * 0.35 + Math.sin(t * 0.3) * 0.1;
      ringRef.current.rotation.z = t * 0.15;
      const m = ringRef.current.material as THREE.ShaderMaterial;
      m.uniforms.uActive.value = current;
    }

    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = Math.PI * 0.55 + Math.cos(t * 0.2) * 0.1;
      ring2Ref.current.rotation.z = -t * 0.1;
      const m = ring2Ref.current.material as THREE.ShaderMaterial;
      m.uniforms.uActive.value = current;
    }

    if (lightRef.current) {
      lightRef.current.intensity = 0.5 + current * 2.0;
    }

    if (light2Ref.current) {
      light2Ref.current.intensity = current * 1.0;
    }
  });

  return (
    <group scale={scale}>
      {/* Core sphere */}
      <mesh ref={meshRef} material={shader as any}>
        <sphereGeometry args={[0.5, 64, 64]} />
      </mesh>

      {/* Inner glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color="#7C8CFF" transparent opacity={0.04} depthWrite={false} side={THREE.BackSide} />
      </mesh>

      {/* Outer glow */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#7C8CFF" transparent opacity={0.015} depthWrite={false} side={THREE.BackSide} />
      </mesh>

      {/* Ring 1 */}
      <mesh ref={ringRef} material={ringShader as any}>
        <ringGeometry args={[0.7, 0.85, 64]} />
      </mesh>

      {/* Ring 2 */}
      <mesh ref={ring2Ref} material={ringShader as any}>
        <ringGeometry args={[0.9, 1.0, 64]} />
      </mesh>

      {/* Lights */}
      <pointLight ref={lightRef} color="#7C8CFF" intensity={0.5} distance={8} decay={2} />
      <pointLight ref={light2Ref} color="#7C8CFF" intensity={0} distance={4} decay={2} position={[0, 0, 0]} />
    </group>
  );
}
