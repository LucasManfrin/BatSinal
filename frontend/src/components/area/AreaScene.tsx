import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import type { DetalheArea } from '../../types';
import { campusStatus } from '../../lib/campus';
import { Button, Loading } from '../ui';

const AreaCanvas = lazy(() => import('./AreaCanvas'));
export interface AreaSceneProps {
  data: DetalheArea;
  modo: 'ver' | 'posicionar';
  selectedId?: string;
  onSelect: (id: string) => void;
  draggingId?: string | null;
  onGrab?: (id: string) => void;
  onPlace?: (id: string, ancoraId: string) => void;
  onCancelDrag?: () => void;
}
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export function AreaPlan({
  data,
  onSelect,
  selectedId,
}: Pick<AreaSceneProps, 'data' | 'onSelect' | 'selectedId'>) {
  const anchors = data.ancoras;
  const minX = Math.min(0, ...anchors.map((a) => a.x));
  // Empty scenes do not invent valid parking positions.
  const x = anchors.length ? Math.min(...anchors.map((a) => a.x)) - 3 : 0;
  const z = anchors.length ? Math.min(...anchors.map((a) => a.z)) - 4 : 0;
  const width = anchors.length ? Math.max(...anchors.map((a) => a.x)) - x + 4 : 20;
  const depth = anchors.length ? Math.max(...anchors.map((a) => a.z)) - z + 5 : 10;
  return (
    <svg
      className="area-plan"
      viewBox={`${x} ${z} ${width} ${depth}`}
      aria-label={`Planta 2D de ${data.area.nome}`}
    >
      <defs>
        <pattern id={`hatch-${data.area.id}`} width=".4" height=".4" patternUnits="userSpaceOnUse">
          <path d="M0 .4L.4 0" stroke="#6a645a" strokeWidth=".05" />
        </pattern>
      </defs>
      <rect
        x={x}
        y={z}
        width={width}
        height={depth}
        rx=".4"
        fill="#cfc6b2"
        stroke="#a7997b"
        strokeWidth=".15"
      />
      {anchors.map((anchor) => {
        const slot = data.vagas.find((v) => v.ancoraId === anchor.id);
        return (
          <g
            key={anchor.id}
            transform={`translate(${anchor.x} ${anchor.z}) rotate(${anchor.rotacao})`}
            role={slot ? 'button' : undefined}
            tabIndex={slot ? 0 : undefined}
            aria-label={
              slot ? `Vaga ${slot.rotulo}, ${campusStatus[slot.status]}` : `Posição ${anchor.id}`
            }
            aria-pressed={slot ? slot.id === selectedId : undefined}
            onClick={() => slot && onSelect(slot.id)}
            onKeyDown={(e) => {
              if (slot && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onSelect(slot.id);
              }
            }}
          >
            <rect
              x={-anchor.largura / 2}
              y={-anchor.profundidade / 2}
              width={anchor.largura}
              height={anchor.profundidade}
              rx=".08"
              fill={
                slot
                  ? slot.status === 'LIVRE'
                    ? '#1f8f55'
                    : slot.status === 'OCUPADA'
                      ? '#4a4741'
                      : `url(#hatch-${data.area.id})`
                  : 'transparent'
              }
              stroke={slot?.id === selectedId ? '#896500' : '#6a645a'}
              strokeWidth={slot?.id === selectedId?.toString() ? '.15' : '.06'}
              strokeDasharray={slot ? undefined : '.2 .15'}
            />
            {slot && (
              <text
                textAnchor="middle"
                y=".15"
                fontSize=".6"
                fill={slot.status === 'SEM_SINAL' ? '#1c1b18' : '#f3efe6'}
              >
                {slot.rotulo}
              </text>
            )}
          </g>
        );
      })}
      {!anchors.length && (
        <text x={minX + 1} y="5" fontSize=".6">
          Esta área ainda não tem posições mapeadas.
        </text>
      )}
    </svg>
  );
}
export function AreaScene(props: AreaSceneProps) {
  const [webgl] = useState(() => {
    if (typeof WebGLRenderingContext === 'undefined') return false;
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      if (!context) return false;
      context.getExtension('WEBGL_lose_context')?.loseContext();
      return true;
    } catch {
      return false;
    }
  });
  const [flat, setFlat] = useState(false);
  const fallback = (
    <div className="area-fallback">
      <p>
        {flat ? 'Vista 2D.' : '3D indisponível neste aparelho. Use a planta e a lista de vagas.'}
      </p>
      <AreaPlan {...props} />
    </div>
  );
  return (
    <section
      className={`area-scene area-scene-${props.modo}`}
      aria-label={`Cena da área ${props.data.area.nome}`}
    >
      <div className="area-scene-controls">
        <Button variant="secondary" aria-pressed={flat} onClick={() => setFlat(!flat)}>
          {flat ? 'Ver em 3D' : 'Ver em 2D'}
        </Button>
        <span>Maquete sem escala</span>
      </div>
      {flat || !webgl ? (
        fallback
      ) : (
        <SceneBoundary fallback={fallback}>
          <Suspense fallback={<Loading />}>
            <AreaCanvas {...props} />
          </Suspense>
        </SceneBoundary>
      )}
    </section>
  );
}
