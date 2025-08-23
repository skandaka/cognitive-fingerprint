"use client";
import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

interface RegionPoint { id: string; position: [number, number, number]; intensity: number; label: string; }

const useRegionData = (): RegionPoint[] => {
  const [regions, setRegions] = useState<RegionPoint[]>([]);
  useEffect(()=>{
    // Generate once on client after mount to avoid SSR/client mismatch.
    const r: RegionPoint[] = [
      { id: 'motor-cortex-L', position: [-0.8,0.4,0.2], intensity: Math.random()*0.6+0.2, label: 'Motor L' },
      { id: 'motor-cortex-R', position: [0.8,0.4,0.2], intensity: Math.random()*0.6+0.2, label: 'Motor R' },
      { id: 'basal-ganglia', position: [0, -0.2, 0], intensity: Math.random()*0.8+0.2, label: 'Basal Ganglia' },
      { id: 'cerebellum', position: [0,-1.0,-0.3], intensity: Math.random()*0.5+0.1, label: 'Cerebellum' },
      { id: 'prefrontal', position: [0,0.9,0.1], intensity: Math.random()*0.7+0.1, label: 'Prefrontal' },
      { id: 'hippocampus-L', position: [-0.5,-0.1,-0.4], intensity: Math.random()*0.9+0.05, label: 'Hippocampus L' },
      { id: 'hippocampus-R', position: [0.5,-0.1,-0.4], intensity: Math.random()*0.9+0.05, label: 'Hippocampus R' }
    ];
    setRegions(r);
  }, []);
  return regions;
};

const HeatRegions = () => {
  const regions = useRegionData();
  return (
    <group>
      {regions.map(r => {
        const { id, position, intensity, label } = r;
        return <HeatPoint key={id} id={id} position={position} intensity={intensity} label={label} />;
      })}
    </group>
  );
};

// Using a relaxed prop type to avoid key prop type noise under temporary shim typings.
const HeatPoint = (props: any) => {
  const { position, intensity } = props as RegionPoint;
  const color = intensityToColor(intensity);
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.18 + intensity*0.12, 24, 24]} />
      <meshStandardMaterial emissive={color} emissiveIntensity={1.5} color={color} transparent opacity={0.85} />
    </mesh>
  );
};

function intensityToColor(v:number){
  // Blue (low) -> Cyan -> Green -> Yellow -> Orange -> Red (high)
  const stops = [
    { p:0, c:[40,60,160] },
    { p:0.25, c:[0,180,200] },
    { p:0.5, c:[0,200,120] },
    { p:0.7, c:[230,210,60] },
    { p:0.85, c:[240,120,30] },
    { p:1, c:[230,50,50] }
  ];
  for (let i=1;i<stops.length;i++){
    if (v <= stops[i].p){
      const a = stops[i-1]; const b= stops[i];
      const t = (v - a.p)/(b.p - a.p);
      const mix = a.c.map((ac,j)=> Math.round(ac + (b.c[j]-ac)*t));
      return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
    }
  }
  const last = stops[stops.length-1].c; return `rgb(${last[0]},${last[1]},${last[2]})`;
}

const Brain = () => (
  <mesh>
    <icosahedronGeometry args={[1.8, 3]} />
    <meshStandardMaterial color="#142033" wireframe opacity={0.35} transparent />
  </mesh>
);

export const BrainHeatmap = () => {
  return (
  <Canvas camera={{ position: [0,0,5] }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[5,5,5]} />
  {/* Components are lightweight; no Suspense fallback needed now */}
  <Brain />
  <HeatRegions />
      <OrbitControls enablePan={false} />
    </Canvas>
  );
};
