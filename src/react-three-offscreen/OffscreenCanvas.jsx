import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import mitt from 'mitt'
import { extend, createRoot, createEvents } from '@react-three/fiber'

const DOM_EVENTS = {
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

export function OffscreenCanvas({ worker, ...props }) {
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
              button: event.button,
              buttons: event.buttons,
              altKey: event.altKey,
              ctrlKey: event.ctrlKey,
              metaKey: event.metaKey,
              shiftKey: event.shiftKey,
              movementX: event.movementX,
              movementY: event.movementY,
              clientX: event.clientX,
              clientY: event.clientY,
              offsetX: event.offsetX,
              offsetY: event.offsetY,
              pageX: event.pageX,
              pageY: event.pageY,
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
  }, [worker, props])

  return <canvas ref={canvasRef} />
}

export function render(children) {
  extend(THREE)

  let root
  let dpr = [1, 2]
  let size = { width: 0, height: 0, updateStyle: false }
  const emitter = mitt()

  const handleInit = (payload) => {
    const { props, drawingSurface: canvas, width, height, pixelRatio } = payload
    root = createRoot(canvas)
    root.configure({
      events: createPointerEvents,
      size: size = { width, height, updateStyle: false },
      dpr: (dpr = Math.min(Math.max(1, pixelRatio), 2)),
      ...props,
    })
    root.render(children)
  }

  const handleResize = ({ width, height }) => {
    if (!root) return
    root.configure({ size: size = { width, height, updateStyle: false }, dpr })
  }

  const handleEvents = (payload) => {
    emitter.emit(payload.eventName, payload)
    emitter.on('disconnect', () => self.postMessage({ type: 'dom_events_disconnect' }))
  }

  const handleProps = (payload) => {
    if (!root) return
    if (payload.dpr) dpr = payload.dpr
    root.configure({ size, dpr, ...payload })
  }

  const handlerMap = {
    resize: handleResize,
    init: handleInit,
    dom_events: handleEvents,
    props: handleProps,
  }

  self.onmessage = (event) => {
    const { type, payload } = event.data
    const handler = handlerMap[type]
    if (handler) handler(payload)
  }

  self.window = {}

  /** R3F event manager for web offscreen canvas */
  function createPointerEvents(store) {
    const { handlePointer } = createEvents(store)

    return {
      priority: 1,
      enabled: true,
      compute(event, state) {
        // https://github.com/pmndrs/react-three-fiber/pull/782
        // Events trigger outside of canvas when moved, use offsetX/Y by default and allow overrides
        state.pointer.set((event.offsetX / state.size.width) * 2 - 1, -(event.offsetY / state.size.height) * 2 + 1)
        state.raycaster.setFromCamera(state.pointer, state.camera)
      },

      connected: undefined,
      handlers: Object.keys(DOM_EVENTS).reduce((acc, key) => ({ ...acc, [key]: handlePointer(key) }), {}),
      connect: (target) => {
        const { set, events } = store.getState()
        events.disconnect?.()
        set((state) => ({ events: { ...state.events, connected: target } }))
        Object.entries(events?.handlers ?? []).forEach(([name, event]) => {
          const [eventName] = DOM_EVENTS[name]
          emitter.on(eventName, event)
        })
      },
      disconnect: () => {
        const { set, events } = store.getState()
        if (events.connected) {
          Object.entries(events.handlers ?? []).forEach(([name, event]) => {
            const [eventName] = DOM_EVENTS[name]
            emitter.off(eventName, event)
          })
          emitter.emit('disconnect')
          set((state) => ({ events: { ...state.events, connected: undefined } }))
        }
      },
    }
  }
}
