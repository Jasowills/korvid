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
  const lightRef = useRef<THREE.PointLight>(null);

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
      uniform float uTime;
      uniform float uActive;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vec3 pos = position;
        float breathe = sin(uTime * 0.8) * 0.015 * (1.0 + uActive * 0.5);
        pos += normal * breathe;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      uniform float uTime;
      uniform float uActive;
      void main() {
        float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
        vec3 idleColor = vec3(0.08, 0.09, 0.11);
        vec3 activeColor = vec3(0.486, 0.549, 1.0);
        vec3 color = mix(idleColor, activeColor, uActive * 0.7);
        color += activeColor * fresnel * uActive * 0.5;
        float alpha = mix(0.25, 0.7, uActive);
        alpha += fresnel * 0.3 * uActive;
        float shimmer = sin(uTime * 2.0 + vWorldPos.y * 4.0) * 0.5 + 0.5;
        alpha += shimmer * 0.05 * uActive;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  }), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    shader.uniforms.uTime.value = t;

    const target = active ? 1 : 0;
    shader.uniforms.uActive.value = THREE.MathUtils.lerp(
      shader.uniforms.uActive.value, target, 0.04,
    );

    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.06;
      meshRef.current.rotation.x = Math.sin(t * 0.04) * 0.04;
    }

    const act = shader.uniforms.uActive.value;

    if (glowRef.current) {
      const s = (1.5 + Math.sin(t * 0.7) * 0.1) * (1 + act * 0.3);
      glowRef.current.scale.setScalar(s * scale);
      const m = glowRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = act > 0.1
        ? 0.06 + Math.sin(t * 1.2) * 0.03
        : 0.015 + Math.sin(t * 0.2) * 0.005;
    }

    if (outerRef.current) {
      const s = (2.2 + Math.sin(t * 0.5) * 0.15) * (1 + act * 0.4);
      outerRef.current.scale.setScalar(s * scale);
      const m = outerRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = act > 0.1 ? 0.025 : 0.008;
    }

    if (lightRef.current) {
      lightRef.current.intensity = act * 1.2;
    }
  });

  return (
    <group scale={scale}>
      <mesh ref={meshRef} material={shader as any}>
        <sphereGeometry args={[0.5, 64, 64]} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color="#7C8CFF" transparent opacity={0.02} depthWrite={false} side={THREE.BackSide} />
      </mesh>
      <mesh ref={outerRef}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#7C8CFF" transparent opacity={0.008} depthWrite={false} side={THREE.BackSide} />
      </mesh>
      <pointLight ref={lightRef} color="#7C8CFF" intensity={0} distance={6} decay={2} />
    </group>
  );
}
