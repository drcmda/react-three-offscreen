import * as THREE from 'three'
import mitt from 'mitt'
import { extend, createRoot, createEvents } from '@react-three/fiber'
import { DOM_EVENTS } from '../OffscreenCanvas'
import Scene from './Scene'

extend(THREE)

let root
const emitter = mitt()

const handleInit = (payload) => {
  const { props, drawingSurface: canvas, width, height, pixelRatio } = payload
  root = createRoot(canvas)
  root.configure({
    events: createPointerEvents,
    size: { width, height, updateStyle: false },
    dpr: Math.min(Math.max(1, pixelRatio), 2),
    ...props,
  })
  root.render(<Scene />)
}

const handleResize = ({ width, height }) => {
  if (!root) return
  root.configure({ size: { width, height, updateStyle: false } })
}

const handleEvents = (payload) => {
  emitter.emit(payload.eventName, payload)
  emitter.on('disconnect', () => self.postMessage({ type: 'dom_events_disconnect' }))
}

const handleProps = (payload) => {
  emitter.emit('props', payload)
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
