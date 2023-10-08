import React, { useMemo, useRef, useState, useLayoutEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { MapControls } from '@react-three/drei'
import { useControls } from 'leva'
import { Instances, Instance } from './drei/Instances'
import * as THREE from 'three'

const baseColors = ['#ff7675', '#74b9ff', '#26de81', '#F79F1F']

export default function App() {
  const { range } = useControls({ range: { value: 400, min: 0, max: 2500 } })

  const [colors, positions] = useMemo(() => {
    const num = 50
    const colors = []
    const positions = []
    for (let x = 0; x < num; x++)
      for (let y = 0; y < num; y++) {
        positions.push([x, y, 0])
        colors.push(baseColors[Math.floor(Math.random() * baseColors.length)])
      }
    return [colors, positions]
  }, [])

  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 30], up: [0, 0, 1] }}>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 5]} />
      <Controls makeDefault enableDamping={false} />

      <Instances limit={2500} range={range}>
        <boxGeometry />
        <meshStandardMaterial />
        {positions.map((pos, i) => (
          <DraggableInstance key={i} color={colors[i]} position={pos} scale={0.8} />
        ))}
      </Instances>
    </Canvas>
  )
}

function Controls({ makeDefault, ...props }) {
  const set = useThree(({ set }) => set)
  const controlsRef = useRef()

  useLayoutEffect(() => {
    if (makeDefault && controlsRef.current) {
      set(() => ({ controls: controlsRef.current }))
      return () => set(() => ({ controls: undefined }))
    }
  }, [controlsRef, makeDefault, set])

  return <MapControls ref={controlsRef} {...props} />
}

const position = new THREE.Vector3()
const plane = new THREE.Plane()
const planeUp = new THREE.Vector3(0, 0, 1)
const matrix = new THREE.Matrix4()
const intersection = new THREE.Vector3()
const offset = new THREE.Vector3()
const inverseMatrix = new THREE.Matrix4()

function DraggableInstance({ ...props }) {
  const ref = useRef()
  const [dragging, setDragging] = useState(false)
  const get = useThree((state) => state.get)

  useFrame(() => {
    if (dragging) {
      // Check and update intersection
      if (get().raycaster.ray.intersectPlane(plane, intersection)) {
        // Update instance position
        ref.current.position.copy(intersection.sub(offset).applyMatrix4(inverseMatrix))
      }
    }
  })

  const events = useMemo(
    () => ({
      onPointerDown: (e) => {
        e.stopPropagation()
        // Store current instance matrix into matrix
        e.object.getMatrixAt(e.instanceId, matrix)
        // Store current instance position
        position.setFromMatrixPosition(matrix)
        // Update drag-plane s.t. it is flat and at the same height as the instance
        plane.setFromNormalAndCoplanarPoint(planeUp, position)
        // Find point of intersection with ray.
        e.ray.intersectPlane(plane, intersection)
        // Store inverse matrix
        inverseMatrix.copy(e.object.matrixWorld).invert()
        // Evaluate the offset from the instance position and the ray intersection
        offset.copy(intersection).sub(position)
        // Disable controls
        get().controls.enabled = false
        setDragging(true)
        // Set cursor
        get().gl.domElement.style.cursor = 'grabbing'
      },
      onPointerUp: () => {
        get().controls.enabled = true
        setDragging(false)
        get().gl.domElement.style.cursor = 'auto'
      },
    }),
    [],
  )

  return <Instance ref={ref} {...events} {...props} />
}
