import * as THREE from 'three'
import React, { forwardRef, createContext, useMemo, useContext, useState, useRef, useLayoutEffect } from 'react'
import { extend, useFrame } from '@react-three/fiber'
import mergeRefs from 'react-merge-refs'
import { Position } from './Position'

const context = createContext(null)
const v = new THREE.Vector3()
const c = new THREE.Color()
let i

function Points({ children, range, limit = 1000, ...props }) {
  const ref = useRef(null)
  const [refs, setRefs] = useState([])
  const [[positions, colors]] = useState(() => {
    const positions = [...new Array(limit * 3)].map(() => 0)
    const colors = [...new Array(limit * 3)].map(() => 1)
    return [new Float32Array(positions), new Float32Array(colors)]
  })

  useLayoutEffect(
    () =>
      void (ref.current.geometry.drawRange.count = Math.min(limit, range !== undefined ? range : limit, refs.length)),
    [refs, range],
  )

  useFrame(() => {
    for (i = 0; i < refs.length; i++) {
      refs[i].current.updateMatrix()
      refs[i].current.matrixWorldNeedsUpdate = false
      refs[i].current.getWorldPosition(v)
      if (v.x !== positions[i * 3] || v.y !== positions[i * 3 + 1] || v.z !== positions[i * 3 + 2]) {
        v.toArray(positions, i * 3)
        ref.current.geometry.attributes.position.needsUpdate = true
      }
      if (!refs[i].current.color.equals(c.fromArray(colors, i * 3))) {
        refs[i].current.color.toArray(colors, i * 3)
        ref.current.geometry.attributes.color.needsUpdate = true
      }
    }
  })

  const events = useMemo(() => {
    const events = {}
    for (i = 0; i < refs.length; i++) Object.assign(events, refs[i].current.__r3f.handlers)
    return Object.keys(events).reduce(
      (prev, key) => ({ ...prev, [key]: (e) => refs[e.index].current?.__r3f?.handlers?.[key](e) }),
      {},
    )
  }, [refs])

  const api = useMemo(
    () => ({
      subscribe: (ref) => {
        setRefs((refs) => [...refs, ref])
        return () => setRefs((refs) => refs.filter((item) => item.current !== ref.current))
      },
    }),
    [],
  )

  return (
    <points ref={ref} {...events} {...props}>
      <bufferGeometry>
        <bufferAttribute
          attachObject={['attributes', 'position']}
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute attachObject={['attributes', 'color']} count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <context.Provider value={api}>{children}</context.Provider>
    </points>
  )
}

const Point = forwardRef(({ children, position, v = new THREE.Vector3(), ...props }, ref) => {
  useMemo(() => extend({ Position }), [])
  const group = useRef()
  const { subscribe } = useContext(context)
  useLayoutEffect(() => subscribe(group), [])
  return (
    <position matrixAutoUpdate={false} position={position} ref={mergeRefs([ref, group])} {...props}>
      {children}
    </position>
  )
})

export { Points, Point }
