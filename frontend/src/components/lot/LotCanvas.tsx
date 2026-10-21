import { useEffect, useRef, useState } from 'react';
import Konva from 'konva';
import { Group, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva';
import { Maximize, Minus, Plus } from 'lucide-react';
import type { Layout, StatusVagaAtual, Vaga } from '../../types';
import { snapToGrid } from '../../lib/utils';
import { Button } from '../ui';

interface Props extends Layout {
  largura: number;
  altura: number;
  mode: 'view' | 'edit';
  statuses?: StatusVagaAtual[];
  selected?: string[];
  snap?: boolean;
  overlaps?: string[];
  onSelect?: (ids: string[]) => void;
  onSpotClick?: (vaga: Vaga) => void;
  onChange?: (layout: Layout) => void;
  onDropItem?: (tipo: string, x: number, y: number) => void;
}
const colors = { LIVRE: '#7CB89D', OCUPADA: '#727B89', SEM_SINAL: '#9399A4' };
export function LotCanvas({
  vagas,
  elementos,
  largura,
  altura,
  mode,
  statuses = [],
  selected = [],
  snap = true,
  overlaps = [],
  onSelect,
  onSpotClick,
  onChange,
  onDropItem,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [width, setWidth] = useState(800);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [box, setBox] = useState<{ x: number; y: number; endX: number; endY: number } | null>(null);
  const height = Math.min(580, Math.max(330, (width * altura) / largura));
  const fit = Math.min((width - 32) / largura, (height - 32) / altura);
  const scale = fit * zoom;
  const offset = {
    x: (width - largura * scale) / 2 + position.x,
    y: (height - altura * scale) / 2 + position.y,
  };
  const previous = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const selectionKey = selected.join('|');
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !trRef.current) return;
    const nodes = selected
      .map((id) => stage.findOne<Konva.Group>((node: Konva.Node) => node.id() === id))
      .filter((node): node is Konva.Group => Boolean(node));
    trRef.current.nodes(nodes);
  }, [selectionKey, selected, vagas, elementos]);
  useEffect(() => {
    for (const status of statuses) {
      if (
        previous.current[status.vagaId] &&
        previous.current[status.vagaId] !== status.status &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        const node = stageRef.current?.findOne((node: Konva.Node) => node.id() === status.vagaId);
        if (node) {
          node.opacity(0.35);
          node.to({ opacity: 1, duration: 0.4 });
        }
      }
      previous.current[status.vagaId] = status.status;
    }
  }, [statuses]);
  const all = [...vagas, ...elementos];
  const snapValue = (value: number) => (snap ? snapToGrid(value) : Math.round(value));
  function patch(
    id: string,
    values: Partial<Pick<Vaga, 'x' | 'y' | 'largura' | 'altura' | 'rotacao'>>,
  ) {
    onChange?.({
      vagas: vagas.map((v) => (v.id === id ? { ...v, ...values } : v)),
      elementos: elementos.map((e) => (e.id === id ? { ...e, ...values } : e)),
    });
  }
  function select(id: string, shift: boolean) {
    onSelect?.(
      shift ? (selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]) : [id],
    );
  }
  function transform() {
    const changed = new Map(
      trRef.current?.nodes().map((node) => {
        const item = all.find((i) => i.id === node.id())!;
        const result = {
          x: snapValue(node.x()),
          y: snapValue(node.y()),
          largura: Math.max(20, Math.round(item.largura * node.scaleX())),
          altura: Math.max(20, Math.round(item.altura * node.scaleY())),
          rotacao: Math.round(node.rotation()),
        };
        node.scale({ x: 1, y: 1 });
        return [node.id(), result];
      }),
    );
    onChange?.({
      vagas: vagas.map((v) => ({ ...v, ...changed.get(v.id) })),
      elementos: elementos.map((e) => ({ ...e, ...changed.get(e.id) })),
    });
  }
  function logicalPointer() {
    const p = stageRef.current?.getPointerPosition();
    return p ? { x: (p.x - offset.x) / scale, y: (p.y - offset.y) / scale } : null;
  }
  return (
    <div
      className="lot-canvas-wrap"
      ref={container}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const bounds = container.current!.getBoundingClientRect();
        const tipo = e.dataTransfer.getData('batsinal/item');
        if (tipo)
          onDropItem?.(
            tipo,
            snapValue((e.clientX - bounds.left - offset.x) / scale),
            snapValue((e.clientY - bounds.top - offset.y) / scale),
          );
      }}
    >
      <div className="canvas-coordinate">
        <span className="tiny-square" />
        {mode === 'edit' ? 'ÁREA DE EDIÇÃO' : 'MAPEAMENTO EM TEMPO REAL'}
        <span>
          {largura} × {altura}
        </span>
      </div>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        x={offset.x}
        y={offset.y}
        draggable={mode === 'view'}
        onDragEnd={(e) => {
          if (e.target === e.target.getStage())
            setPosition({
              x: e.target.x() - (width - largura * scale) / 2,
              y: e.target.y() - (height - altura * scale) / 2,
            });
        }}
        onWheel={(e) => {
          e.evt.preventDefault();
          setZoom((z) => Math.max(0.5, Math.min(4, z * (e.evt.deltaY > 0 ? 0.9 : 1.1))));
        }}
        onMouseDown={(e) => {
          if (mode === 'edit' && e.target === e.target.getStage()) {
            const p = logicalPointer();
            if (p) setBox({ ...p, endX: p.x, endY: p.y });
            onSelect?.([]);
          }
        }}
        onMouseMove={() => {
          if (box) {
            const p = logicalPointer();
            if (p) setBox({ ...box, endX: p.x, endY: p.y });
          }
        }}
        onMouseUp={() => {
          if (box) {
            const x = Math.min(box.x, box.endX);
            const y = Math.min(box.y, box.endY);
            const w = Math.abs(box.endX - box.x);
            const h = Math.abs(box.endY - box.y);
            if (w > 3 && h > 3)
              onSelect?.(
                all
                  .filter((i) =>
                    Konva.Util.haveIntersection(
                      { x, y, width: w, height: h },
                      { x: i.x, y: i.y, width: i.largura, height: i.altura },
                    ),
                  )
                  .map((i) => i.id),
              );
            setBox(null);
          }
        }}
      >
        <Layer>
          <Rect
            width={largura}
            height={altura}
            stroke="#303944"
            strokeWidth={1}
            dash={[5, 6]}
            listening={false}
          />
          {Array.from({ length: Math.min(300, Math.ceil(largura / 20)) }, (_, i) => (
            <Line
              key={`x${i}`}
              points={[i * 20, 0, i * 20, altura]}
              stroke="#1b2b3b"
              strokeWidth={0.5}
              listening={false}
            />
          ))}
          {Array.from({ length: Math.min(300, Math.ceil(altura / 20)) }, (_, i) => (
            <Line
              key={`y${i}`}
              points={[0, i * 20, largura, i * 20]}
              stroke="#1b2b3b"
              strokeWidth={0.5}
              listening={false}
            />
          ))}
          {elementos.map((el) => (
            <Group
              id={el.id}
              key={el.id}
              x={el.x}
              y={el.y}
              width={el.largura}
              height={el.altura}
              rotation={el.rotacao}
              draggable={mode === 'edit'}
              onClick={(e) => select(el.id, e.evt.shiftKey)}
              onTap={() => select(el.id, false)}
              onDragEnd={(e) => {
                e.cancelBubble = true;
                patch(el.id, { x: snapValue(e.target.x()), y: snapValue(e.target.y()) });
              }}
            >
              <Rect
                width={el.largura}
                height={el.altura}
                fill={el.tipo === 'VIA' ? '#2a323d' : '#141c23'}
                stroke={selected.includes(el.id) ? '#FBBF24' : '#3b4854'}
                strokeWidth={1}
                cornerRadius={4}
              />
              <Text
                text={
                  el.texto ||
                  (el.tipo === 'ENTRADA'
                    ? 'ENTRADA →'
                    : el.tipo === 'SAIDA'
                      ? 'SAÍDA →'
                      : el.tipo === 'VIA'
                        ? '→          →'
                        : 'Texto')
                }
                width={el.largura}
                height={el.altura}
                verticalAlign="middle"
                align="center"
                fontSize={13}
                fontFamily="Inter"
                fill={el.tipo === 'VIA' ? '#76818c' : '#a6b4c1'}
              />
            </Group>
          ))}
          {vagas.map((vaga) => {
            const status = statuses.find((s) => s.vagaId === vaga.id)?.status ?? 'SEM_SINAL';
            const color = mode === 'edit' ? '#FBBF24' : colors[status];
            const w = vaga.largura;
            const h = vaga.altura;
            return (
              <Group
                id={vaga.id}
                key={vaga.id}
                x={vaga.x}
                y={vaga.y}
                width={w}
                height={h}
                rotation={vaga.rotacao}
                draggable={mode === 'edit'}
                onClick={(e) => {
                  e.cancelBubble = true;
                  if (mode === 'edit') select(vaga.id, e.evt.shiftKey);
                  else onSpotClick?.(vaga);
                }}
                onTap={() => (mode === 'edit' ? select(vaga.id, false) : onSpotClick?.(vaga))}
                onDragEnd={(e) => {
                  e.cancelBubble = true;
                  patch(vaga.id, { x: snapValue(e.target.x()), y: snapValue(e.target.y()) });
                }}
              >
                <Rect
                  width={w}
                  height={h}
                  fill={mode === 'edit' ? '#292615' : `${color}12`}
                  stroke={
                    overlaps.includes(vaga.id)
                      ? '#ff7272'
                      : selected.includes(vaga.id)
                        ? '#fff'
                        : color
                  }
                  strokeWidth={selected.includes(vaga.id) ? 2.5 : 1.2}
                  cornerRadius={5}
                />
                {mode === 'view' && status === 'SEM_SINAL' && (
                  <Group clipX={0} clipY={0} clipWidth={w} clipHeight={h}>
                    {Array.from({ length: Math.ceil((w + h) / 10) }, (_, i) => (
                      <Line
                        key={i}
                        points={[-h + i * 10, h, i * 10, 0]}
                        stroke="#6B7280"
                        opacity={0.22}
                        strokeWidth={2}
                      />
                    ))}
                  </Group>
                )}
                {mode === 'view' && status === 'LIVRE' ? (
                  <Line
                    points={[w * 0.32, h * 0.36, w * 0.46, h * 0.45, w * 0.71, h * 0.25]}
                    stroke={color}
                    strokeWidth={3}
                    lineCap="round"
                    lineJoin="round"
                  />
                ) : mode === 'view' && status === 'OCUPADA' ? (
                  <Group x={w * 0.25} y={h * 0.13}>
                    <Rect
                      width={w * 0.5}
                      height={h * 0.42}
                      fill={`${color}42`}
                      stroke={color}
                      cornerRadius={5}
                    />
                    <Rect
                      x={3}
                      y={5}
                      width={w * 0.5 - 6}
                      height={h * 0.09}
                      fill="#14181D"
                      cornerRadius={2}
                    />
                    <Line points={[3, h * 0.32, w * 0.5 - 3, h * 0.32]} stroke={color} />
                  </Group>
                ) : (
                  <Text
                    text={
                      mode === 'edit'
                        ? vaga.tipo === 'PCD'
                          ? 'PCD'
                          : vaga.tipo === 'MOTO'
                            ? 'M'
                            : 'P'
                        : '⌁ ×'
                    }
                    width={w}
                    y={h * 0.22}
                    align="center"
                    fontSize={20}
                    fill={color}
                  />
                )}
                <Text
                  text={vaga.rotulo}
                  width={w}
                  y={h - 23}
                  align="center"
                  fontSize={Math.min(12, w / 3)}
                  fontFamily="JetBrains Mono"
                  fill={color}
                />
                {vaga.tipo !== 'COMUM' && (
                  <Text
                    text={vaga.tipo}
                    x={2}
                    y={3}
                    width={w - 4}
                    fontSize={8}
                    fill={color}
                    align="right"
                  />
                )}
              </Group>
            );
          })}
          {mode === 'edit' && (
            <Transformer
              ref={trRef}
              onTransformEnd={transform}
              rotateEnabled
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
              flipEnabled={false}
              borderStroke="#FBBF24"
              anchorStroke="#FBBF24"
              anchorFill="#14181D"
              boundBoxFunc={(oldBox, newBox) =>
                newBox.width < 20 || newBox.height < 20 ? oldBox : newBox
              }
            />
          )}
          {box && (
            <Rect
              x={Math.min(box.x, box.endX)}
              y={Math.min(box.y, box.endY)}
              width={Math.abs(box.endX - box.x)}
              height={Math.abs(box.endY - box.y)}
              fill="#FBBF2420"
              stroke="#FBBF24"
              listening={false}
            />
          )}
        </Layer>
      </Stage>
      <div className="canvas-controls">
        <Button
          variant="secondary"
          aria-label="Diminuir zoom"
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
        >
          <Minus size={16} />
        </Button>
        <span>{Math.round(zoom * 100)}%</span>
        <Button
          variant="secondary"
          aria-label="Aumentar zoom"
          onClick={() => setZoom((z) => Math.min(4, z + 0.2))}
        >
          <Plus size={16} />
        </Button>
        <Button
          variant="secondary"
          aria-label="Centralizar estacionamento"
          onClick={() => {
            setZoom(1);
            setPosition({ x: 0, y: 0 });
          }}
        >
          <Maximize size={16} />
        </Button>
      </div>
    </div>
  );
}
