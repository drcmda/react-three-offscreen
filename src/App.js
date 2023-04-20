import React from 'react'
import { OffscreenCanvas } from './react-three-offscreen/OffscreenCanvas'

export default function App() {
  const [worker] = React.useState(() => new Worker(new URL('./worker/index.js', import.meta.url)))
  return <OffscreenCanvas camera={{ position: [0, 0, 20], fov: 25 }} worker={worker} />
}
