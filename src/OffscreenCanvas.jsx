import React, { useEffect, useRef } from 'react'

export const DOM_EVENTS = {
  onClick: ['click', false],
  onContextMenu: ['contextmenu', false],
  onDoubleClick: ['dblclick', false],
  onWheel: ['wheel', true],
  onPointerDown: ['pointerdown', true],
  onPointerUp: ['pointerup', true],
  onPointerLeave: ['pointerleave', true],
  onPointerMove: ['pointermove', true],
  onPointerCancel: ['pointercancel', true],
  onLostPointerCapture: ['lostpointercapture', true],
}

export default function OffscreenCanvas({ worker, ...props }) {
  const canvasRef = useRef()

  useEffect(() => {
    if (!worker) return

    const canvas = canvasRef.current
    const offscreen = canvasRef.current.transferControlToOffscreen()

    worker.postMessage(
      {
        type: 'init',
        payload: {
          props,
          drawingSurface: offscreen,
          width: canvas.clientWidth,
          height: canvas.clientHeight,
          pixelRatio: window.devicePixelRatio,
        },
      },
      [offscreen],
    )

    Object.values(DOM_EVENTS).forEach(([eventName, passive]) => {
      canvas.addEventListener(
        eventName,
        (event) => {
          worker.postMessage({
            type: 'dom_events',
            payload: {
              eventName,
              clientX: event.clientX,
              clientY: event.clientY,
              offsetX: event.offsetX,
              offsetY: event.offsetY,
              x: event.x,
              y: event.y,
            },
          })
        },
        { passive },
      )
    })

    const handleResize = () => {
      worker.postMessage({
        type: 'resize',
        payload: { width: canvas.clientWidth, height: canvas.clientHeight },
      })
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [worker])

  useEffect(() => {
    if (!worker) return
    worker.postMessage({ type: 'props', payload: props })
  }, [props])

  return <canvas ref={canvasRef} />
}
