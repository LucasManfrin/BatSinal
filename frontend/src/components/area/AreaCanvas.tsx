import { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Instances, Instance } from '@react-three/drei';
import { Color, ExtrudeGeometry, Shape } from 'three';
import type { Ancora, PredioCampus } from '../../types';
import type { AreaSceneProps } from './AreaScene';
import { distanceCampus } from '../../lib/campus';
import { VagaTile } from './VagaTile';

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
function AnchorOutline({ anchor }: { anchor: Ancora }) {
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
    <group position={[anchor.x, 0, anchor.z]} rotation={[0, (-anchor.rotacao * Math.PI) / 180, 0]}>
      <lineLoop onUpdate={(line) => line.computeLineDistances()}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <lineDashedMaterial color="#6a645a" dashSize={0.2} gapSize={0.12} />
      </lineLoop>
    </group>
  );
}
function Scene(props: AreaSceneProps) {
  const { data, onSelect, selectedId } = props;
  const { size, camera, invalidate } = useThree();
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
        <AnchorOutline key={anchor.id} anchor={anchor} />
      ))}
      {tiles.length > 100 ? (
        <Instances geometry={geometry} limit={tiles.length}>
          <meshLambertMaterial />
          {tiles.map(({ vaga, anchor }) => (
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
            />
          ))}
        </Instances>
      ) : (
        tiles.map(({ vaga, anchor }) => (
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
                if (props.modo === 'posicionar' && props.onGrab) {
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
                  if (props.modo === 'posicionar' && props.onGrab) {
                    event.stopPropagation();
                    props.onGrab(vaga.id);
                  }
                }}
              />
            </Html>
          </group>
        ))
      )}
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping={false}
        enabled={!props.draggingId}
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
