import React, { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { ContactShadows, Environment } from '@react-three/drei'

function Cube(props) {
  const mesh = useRef()
  const [hovered, setHover] = useState(false)
  const [active, setActive] = useState(false)
  useFrame((state, delta) => {
    mesh.current.rotation.x += delta
    mesh.current.rotation.y += delta
  })
  return (
    <mesh
      {...props}
      ref={mesh}
      scale={active ? 1.25 : 1}
      onClick={(e) => (e.stopPropagation(), setActive(!active))}
      onPointerOver={(e) => (e.stopPropagation(), setHover(true))}
      onPointerOut={(e) => setHover(false)}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  )
}

export default function App() {
  return (
    <>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Cube />      
      <ContactShadows position={[0, -1.25, 0]} blur={3} opacity={0.75} />
      <Environment preset='city' />
    </>
  )
}
