import { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Instances, Instance } from '@react-three/drei';
import { Color, ExtrudeGeometry, Shape, Plane, Vector2, Vector3, Group } from 'three';
import type { Ancora, PredioCampus } from '../../types';
import type { AreaSceneProps } from './AreaScene';
import { distanceCampus } from '../../lib/campus';
import { VagaTile } from './VagaTile';
import { calcularIma } from '../../lib/magnet';

function Building({ building }: { building: PredioCampus }) {
  const geometry = useMemo(() => {
    const shape = new Shape();
    building.contorno.forEach(([x, z], i) => {
      if (i === 0) shape.moveTo(x / 10, -z / 10);
      else shape.lineTo(x / 10, -z / 10);
    });
    shape.closePath();
    return new ExtrudeGeometry(shape, {
      depth: (building.altura / 10) * 0.55,
      bevelEnabled: false,
    });
  }, [building]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshLambertMaterial color="#d9cdb6" flatShading />
    </mesh>
  );
}
function AnchorOutline({
  anchor,
  state = 'normal',
}: {
  anchor: Ancora;
  state?: 'normal' | 'compatible' | 'incompatible' | 'target';
}) {
  const group = useRef<Group>(null),
    pulse = useRef<number | null>(null),
    { invalidate } = useThree();
  useEffect(() => {
    if (
      state === 'compatible' &&
      !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      pulse.current = performance.now();
      invalidate();
    }
  }, [state, invalidate]);
  useFrame(() => {
    if (pulse.current === null || !group.current) return;
    const t = Math.min(1, (performance.now() - pulse.current) / 180);
    group.current.scale.setScalar(1 + 0.08 * (1 - t) ** 3);
    if (t === 1) pulse.current = null;
    else invalidate();
  });
  const positions = useMemo(
    () =>
      new Float32Array([
        -anchor.largura / 2,
        0.025,
        -anchor.profundidade / 2,
        anchor.largura / 2,
        0.025,
        -anchor.profundidade / 2,
        anchor.largura / 2,
        0.025,
        anchor.profundidade / 2,
        -anchor.largura / 2,
        0.025,
        anchor.profundidade / 2,
        -anchor.largura / 2,
        0.025,
        -anchor.profundidade / 2,
      ]),
    [anchor.largura, anchor.profundidade],
  );
  return (
    <group
      ref={group}
      position={[anchor.x, 0, anchor.z]}
      rotation={[0, (-anchor.rotacao * Math.PI) / 180, 0]}
    >
      <lineLoop onUpdate={(line) => line.computeLineDistances()}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <lineDashedMaterial
          color={state === 'target' || state === 'compatible' ? '#896500' : '#6a645a'}
          transparent
          opacity={state === 'incompatible' ? 0.25 : 1}
          dashSize={state === 'target' ? 1 : 0.2}
          gapSize={state === 'target' ? 0 : 0.12}
        />
      </lineLoop>
      {(state === 'target' || state === 'compatible') && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
          <planeGeometry args={[anchor.largura, anchor.profundidade]} />
          <meshBasicMaterial
            color="#f2b705"
            transparent
            opacity={state === 'target' ? 0.4 : 0.15}
          />
        </mesh>
      )}
      {state === 'incompatible' && (
        <Html center position={[0, 0.08, 0]} zIndexRange={[2, 0]}>
          <span
            className="anchor-incompatible"
            title={`Esta posição aceita só ${anchor.tiposAceitos.join(' ou ').toLowerCase()}.`}
            aria-label={`Posição incompatível: aceita ${anchor.tiposAceitos.join(' ou ')}`}
          >
            /
          </span>
        </Html>
      )}
    </group>
  );
}
function MovingPiece({
  geometry,
  position,
  rotation,
  width,
  depth,
  label,
  settling = false,
}: {
  geometry: ExtrudeGeometry;
  position: [number, number, number];
  rotation: number;
  width: number;
  depth: number;
  label: string;
  settling?: boolean;
}) {
  const group = useRef<Group>(null),
    { invalidate } = useThree();
  const initial = useRef(position),
    initialRotation = useRef(rotation);
  const animation = useRef<{
    from: Vector3;
    to: Vector3;
    fromRotation: number;
    toRotation: number;
    start: number;
  } | null>(null);
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [x, y, z] = position;
  useEffect(() => {
    if (!group.current) return;
    if (reduced) {
      group.current.position.set(x, y, z);
      group.current.rotation.y = rotation;
    } else
      animation.current = {
        from: group.current.position.clone(),
        to: new Vector3(x, y, z),
        fromRotation: group.current.rotation.y,
        toRotation: rotation,
        start: performance.now(),
      };
    invalidate();
  }, [x, y, z, rotation, reduced, invalidate]);
  useFrame(() => {
    const a = animation.current;
    if (!a || !group.current) return;
    const t = Math.min(1, (performance.now() - a.start) / 180),
      e = 1 - (1 - t) ** 3;
    group.current.position.lerpVectors(a.from, a.to, e);
    group.current.rotation.y = a.fromRotation + (a.toRotation - a.fromRotation) * e;
    group.current.scale.setScalar(settling ? 1 + 0.04 * (1 - e) : 1);
    if (t === 1) animation.current = null;
    else invalidate();
  });
  return (
    <group ref={group} position={initial.current} rotation={[0, initialRotation.current, 0]}>
      <mesh geometry={geometry} scale={[width, 1, depth]}>
        <meshLambertMaterial color="#f2b705" flatShading />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -y + 0.04, 0]}>
        <planeGeometry args={[width * 1.12, depth * 1.12]} />
        <meshBasicMaterial color="#6a645a" transparent opacity={0.18} />
      </mesh>
      <Html center position={[0, 0.25, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <strong className="magnetic-label">{label}</strong>
      </Html>
    </group>
  );
}
function Scene(props: AreaSceneProps) {
  const { data, onSelect, selectedId } = props;
  const { size, camera, invalidate, gl, raycaster } = useThree();
  type Preview = {
    x: number;
    z: number;
    rotation: number;
    anchor: string | null;
    locked: boolean;
    settling?: boolean;
    slotId: string;
  };
  const [preview, setPreview] = useState<Preview | null>(null);
  const drag = useRef<Preview | null>(null),
    locked = useRef<string | null>(null),
    finished = useRef<ReturnType<typeof setTimeout>>();
  const callbacks = useRef(props);
  callbacks.current = props;
  const latestData = useRef(data);
  latestData.current = data;
  const dragged = data.vagas.find((v) => v.id === (preview?.slotId ?? props.draggingId));
  useEffect(() => {
    if (!props.pointerDrag || !props.draggingId || props.disabled) return;
    const data = latestData.current;
    const slot = data.vagas.find((v) => v.id === props.draggingId);
    if (!slot) return;
    const source = data.ancoras.find((a) => a.id === slot.ancoraId);
    locked.current = source?.id ?? null;
    drag.current = null;
    clearTimeout(finished.current);
    const plane = new Plane(new Vector3(0, 1, 0), -0.15),
      hit = new Vector3(),
      pointer = new Vector2();
    function move(event: PointerEvent) {
      const box = gl.domElement.getBoundingClientRect();
      if (
        event.clientX < box.left ||
        event.clientX > box.right ||
        event.clientY < box.top ||
        event.clientY > box.bottom
      ) {
        locked.current = null;
        drag.current = null;
        setPreview(null);
        return;
      }
      pointer.set(
        ((event.clientX - box.left) / box.width) * 2 - 1,
        -((event.clientY - box.top) / box.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      if (!raycaster.ray.intersectPlane(plane, hit)) return;
      const occupancy = Object.fromEntries(
        data.vagas.filter((v) => v.id !== slot!.id && v.ancoraId).map((v) => [v.ancoraId!, v.id]),
      );
      const anchors = data.ancoras.filter((a) => {
        const other = data.vagas.find((v) => v.id === occupancy[a.id]);
        return !other || !source || source.tiposAceitos.includes(other.tipo);
      });
      const result = calcularIma({
        ponteiro: { x: hit.x, z: hit.z },
        vaga: slot!,
        ancoras: anchors,
        ocupadas: occupancy,
        ancoraTravada: locked.current,
      });
      locked.current = result.travada ? result.ancoraAlvo : null;
      const anchor = anchors.find((a) => a.id === result.ancoraAlvo);
      const next = {
        ...result.posicao,
        rotation:
          (source?.rotacao ?? 0) +
          ((anchor?.rotacao ?? source?.rotacao ?? 0) - (source?.rotacao ?? 0)) * result.forca,
        anchor: result.ancoraAlvo,
        locked: result.travada,
        slotId: slot!.id,
      };
      drag.current = next;
      setPreview(next);
      invalidate();
    }
    function finish(event: PointerEvent) {
      move(event);
      const last = drag.current;
      if (last?.locked && last.anchor) {
        setPreview({ ...last, settling: true });
        callbacks.current.onPlace?.(slot!.id, last.anchor);
      } else {
        if (last && source)
          setPreview({
            ...last,
            x: source.x,
            z: source.z,
            rotation: source.rotacao,
            settling: true,
          });
        else setPreview(null);
        callbacks.current.onCancelDrag?.();
      }
      finished.current = setTimeout(() => {
        setPreview(null);
        invalidate();
      }, 200);
    }
    function cancel() {
      setPreview(null);
      callbacks.current.onCancelDrag?.();
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', cancel, { once: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', cancel);
    };
  }, [
    props.pointerDrag,
    props.draggingId,
    props.disabled,
    data.area.id,
    data.area.versao,
    gl,
    camera,
    raycaster,
    invalidate,
  ]);
  useEffect(() => () => clearTimeout(finished.current), []);
  const controls = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const approach = useRef<{ from: number; to: number; start: number } | null>(null);
  useFrame(() => {
    if (!approach.current || !('zoom' in camera)) return;
    const progress = Math.min(1, (performance.now() - approach.current.start) / 500);
    camera.zoom =
      approach.current.from +
      (approach.current.to - approach.current.from) * (1 - (1 - progress) ** 3);
    camera.updateProjectionMatrix();
    if (progress >= 1) approach.current = null;
    else invalidate();
  });
  const anchors = data.ancoras;
  const bounds = useMemo(() => {
    const xs = anchors.map((a) => a.x),
      zs = anchors.map((a) => a.z);
    const minX = xs.length ? Math.min(...xs) : 0,
      maxX = xs.length ? Math.max(...xs) : 15,
      minZ = zs.length ? Math.min(...zs) : 0,
      maxZ = zs.length ? Math.max(...zs) : 10;
    return {
      cx: (minX + maxX) / 2,
      cz: (minZ + maxZ) / 2,
      w: Math.max(12, maxX - minX + 10),
      d: Math.max(12, maxZ - minZ + 10),
    };
  }, [anchors]);
  useEffect(() => {
    camera.position.set(bounds.cx - 30, 30, bounds.cz + 30);
    camera.lookAt(bounds.cx, 0, bounds.cz);
    if ('zoom' in camera) {
      const targetZoom = Math.min(
        size.width / (bounds.w * 1.2),
        size.height / (Math.max(bounds.w, bounds.d) * 0.7 + 8),
      );
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      camera.zoom = targetZoom * (reduced ? 1 : 0.65);
      approach.current = reduced
        ? null
        : { from: camera.zoom, to: targetZoom, start: performance.now() };
      camera.updateProjectionMatrix();
    }
    controls.current?.target.set(bounds.cx, 0, bounds.cz);
    controls.current?.update();
    invalidate();
  }, [bounds.cx, bounds.cz, bounds.w, bounds.d, camera, size.width, size.height, invalidate]);
  const neighbors =
    data.mapa?.predios.filter(
      (b) => distanceCampus([bounds.cx * 10, bounds.cz * 10], b.entrada) < 230,
    ) ?? [];
  const tiles = data.vagas.flatMap((vaga) => {
    const anchor = anchors.find((a) => a.id === vaga.ancoraId);
    return anchor ? [{ vaga, anchor }] : [];
  });
  const geometry = useMemo(() => {
    const shape = new Shape();
    const outline = [
      [-0.44, -0.5],
      [0.44, -0.5],
      [0.5, -0.44],
      [0.5, 0.44],
      [0.44, 0.5],
      [-0.44, 0.5],
      [-0.5, 0.44],
      [-0.5, -0.44],
    ];
    outline.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    shape.closePath();
    const geo = new ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -0.08, 0);
    return geo;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const colorOf = (status: string) =>
    status === 'LIVRE' ? '#1f8f55' : status === 'OCUPADA' ? '#4a4741' : '#cfc6b2';
  return (
    <>
      <ambientLight intensity={1.3} />
      <directionalLight position={[-10, 35, 15]} intensity={2} />
      <mesh position={[bounds.cx, -0.3, bounds.cz]}>
        <boxGeometry args={[bounds.w, 0.6, bounds.d]} />
        <meshLambertMaterial color="#b6a88a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bounds.cx, 0.005, bounds.cz]}>
        <planeGeometry args={[bounds.w - 0.3, bounds.d - 0.3]} />
        <meshLambertMaterial color="#d9d0bc" />
      </mesh>
      {neighbors.map((building) => (
        <Building key={building.id} building={building} />
      ))}
      {anchors.map((anchor) => (
        <AnchorOutline
          key={anchor.id}
          anchor={anchor}
          state={
            preview?.anchor === anchor.id
              ? 'target'
              : props.draggingId
                ? data.vagas.find((v) => v.id === props.draggingId) &&
                  anchor.tiposAceitos.includes(
                    data.vagas.find((v) => v.id === props.draggingId)!.tipo,
                  )
                  ? 'compatible'
                  : 'incompatible'
                : 'normal'
          }
        />
      ))}
      {tiles.length > 100 ? (
        <Instances geometry={geometry} limit={tiles.length}>
          <meshLambertMaterial />
          {tiles
            .filter(({ vaga }) => vaga.id !== preview?.slotId)
            .map(({ vaga, anchor }) => (
              <Instance
                key={vaga.id}
                position={[anchor.x, 0.16, anchor.z]}
                rotation={[0, (-anchor.rotacao * Math.PI) / 180, 0]}
                scale={[anchor.largura, 0.9, anchor.profundidade]}
                color={new Color(colorOf(vaga.status))}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(vaga.id);
                }}
                onPointerDown={(event) => {
                  if (props.modo === 'posicionar' && !props.disabled) {
                    event.stopPropagation();
                    props.onGrab?.(vaga.id);
                  }
                }}
              />
            ))}
        </Instances>
      ) : (
        tiles
          .filter(({ vaga }) => vaga.id !== preview?.slotId)
          .map(({ vaga, anchor }) => (
            <group
              key={vaga.id}
              position={[anchor.x, 0.17, anchor.z]}
              rotation={[0, (-anchor.rotacao * Math.PI) / 180, 0]}
            >
              <mesh
                geometry={geometry}
                scale={[anchor.largura, 1, anchor.profundidade]}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(vaga.id);
                }}
                onPointerDown={(event) => {
                  if (props.modo === 'posicionar' && props.onGrab && !props.disabled) {
                    event.stopPropagation();
                    props.onGrab(vaga.id);
                  }
                }}
              >
                <meshLambertMaterial color={colorOf(vaga.status)} flatShading />
              </mesh>
              <Html center position={[0, 0.2, 0]} distanceFactor={undefined} zIndexRange={[3, 0]}>
                <VagaTile
                  key={vaga.status}
                  vaga={vaga}
                  status={vaga.status}
                  compact
                  selected={vaga.id === selectedId}
                  onClick={() => onSelect(vaga.id)}
                  onPointerDown={(event) => {
                    if (props.modo === 'posicionar' && props.onGrab && !props.disabled) {
                      event.stopPropagation();
                      props.onGrab(vaga.id);
                    }
                  }}
                />
              </Html>
            </group>
          ))
      )}
      {preview && dragged && (
        <MovingPiece
          geometry={geometry}
          position={[preview.x, preview.settling ? 0.17 : 0.85, preview.z]}
          rotation={(-preview.rotation * Math.PI) / 180}
          width={anchors.find((a) => a.id === preview.anchor)?.largura ?? 1.2}
          depth={anchors.find((a) => a.id === preview.anchor)?.profundidade ?? 2.8}
          label={dragged.rotulo}
          settling={preview.settling}
        />
      )}
      {preview?.anchor && (
        <Html
          position={[bounds.cx, 0, bounds.cz + bounds.d / 2]}
          center
          zIndexRange={[4, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <span className="magnetic-message">
            {data.vagas.find((v) => v.ancoraId === preview.anchor && v.id !== dragged?.id)
              ? `Trocar com ${data.vagas.find((v) => v.ancoraId === preview.anchor)?.rotulo}`
              : preview.locked
                ? 'Encaixada · solte para salvar'
                : 'Aproximando da posição'}
          </span>
        </Html>
      )}
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping={false}
        enabled={!props.pointerDrag && !props.disabled}
        minPolarAngle={Math.PI / 2 - (35 * Math.PI) / 180}
        maxPolarAngle={Math.PI / 2 - (35 * Math.PI) / 180}
        minAzimuthAngle={-Math.PI / 4 - (25 * Math.PI) / 180}
        maxAzimuthAngle={-Math.PI / 4 + (25 * Math.PI) / 180}
        minZoom={3}
        maxZoom={80}
      />
    </>
  );
}
export default function AreaCanvas(props: AreaSceneProps) {
  return (
    <div className="area-webgl">
      <Canvas
        orthographic
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ near: 0.1, far: 1000, position: [-30, 30, 30], zoom: 15 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene {...props} />
      </Canvas>
      <p className="area-camera-note">
        Arraste para girar · botão direito para mover · rolagem para aproximar
      </p>
    </div>
  );
}
