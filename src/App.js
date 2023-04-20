import React from 'react'
import { OffscreenCanvas } from './react-three-offscreen/OffscreenCanvas'

const worker = new Worker(new URL('./worker/index.js', import.meta.url))

export default function App() {
  return <OffscreenCanvas worker={worker} />
}
