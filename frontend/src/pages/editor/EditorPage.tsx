import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Copy,
  CornerDownRight,
  Grid2X2,
  Hand,
  Plus,
  Redo2,
  Save,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEditor } from '../../features/editor/store';
import { useLot, useLots, useSensors } from '../../features/estacionamentos/queries';
import { api, json } from '../../lib/api';
import { gerarGrid, mensagemErro, sobrepoe } from '../../lib/utils';
import type {
  DetalheEstacionamento,
  ElementoLayout,
  GridOptions,
  TipoVaga,
  Vaga,
} from '../../types';
import { LotCanvas } from '../../components/lot/LotCanvas';
import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Loading,
  Select,
  Switch,
  Tooltip,
} from '../../components/ui';

const palette = [
  { tipo: 'COMUM', label: 'Vaga comum', icon: Plus },
  { tipo: 'PCD', label: 'Vaga PCD', icon: Plus },
  { tipo: 'MOTO', label: 'Vaga moto', icon: Plus },
  { tipo: 'VIA', label: 'Via de circulação', icon: Hand },
  { tipo: 'ENTRADA', label: 'Entrada', icon: CornerDownRight },
  { tipo: 'SAIDA', label: 'Saída', icon: CornerDownRight },
  { tipo: 'TEXTO', label: 'Texto livre', icon: Type },
];
export function EditorPage() {
  const { id: routeId } = useParams();
  const lots = useLots();
  const id = routeId ?? lots.data?.[0]?.id ?? '';
  const lot = useLot(id);
  const sensors = useSensors();
  const client = useQueryClient();
  const navigate = useNavigate();
  const editor = useEditor();
  const { load } = editor;
  const loaded = useRef('');
  const [gridOpen, setGridOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [grid, setGrid] = useState<GridOptions>({
    linhas: 4,
    colunas: 10,
    largura: 53,
    altura: 86,
    espacamento: 10,
  });
  const dirty = JSON.stringify(editor.layout) !== editor.baseline;
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (lot.data && loaded.current !== lot.data.id) {
      load({ vagas: lot.data.vagas, elementos: lot.data.elementos });
      loaded.current = lot.data.id;
    }
  }, [lot.data, load]);
  useEffect(
    () => () => {
      loaded.current = '';
    },
    [],
  );
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, [dirty]);
  const removeSelected = useCallback(() => {
    const { layout, selected, commit, select } = useEditor.getState();
    commit({
      vagas: layout.vagas.filter((v) => !selected.includes(v.id)),
      elementos: layout.elementos.filter((e) => !selected.includes(e.id)),
    });
    select([]);
  }, []);
  const duplicate = useCallback(() => {
    const { layout, selected, commit, select } = useEditor.getState();
    const newIds: string[] = [];
    const labels = new Set(layout.vagas.map((v) => v.rotulo));
    const vagas = layout.vagas
      .filter((v) => selected.includes(v.id))
      .map((v) => {
        let label = `${v.rotulo}-2`;
        let i = 2;
        while (labels.has(label)) label = `${v.rotulo}-${++i}`;
        labels.add(label);
        const id = crypto.randomUUID();
        newIds.push(id);
        return { ...v, id, rotulo: label, x: v.x + 20, y: v.y + 20, sensorId: undefined };
      });
    const elementos = layout.elementos
      .filter((e) => selected.includes(e.id))
      .map((e) => {
        const id = crypto.randomUUID();
        newIds.push(id);
        return { ...e, id, x: e.x + 20, y: e.y + 20 };
      });
    commit({ vagas: [...layout.vagas, ...vagas], elementos: [...layout.elementos, ...elementos] });
    select(newIds);
  }, []);
  const move = useCallback((dx: number, dy: number) => {
    const { layout, selected, commit } = useEditor.getState();
    commit({
      vagas: layout.vagas.map((v) =>
        selected.includes(v.id) ? { ...v, x: v.x + dx, y: v.y + dy } : v,
      ),
      elementos: layout.elementos.map((e) =>
        selected.includes(e.id) ? { ...e, x: e.x + dx, y: e.y + dy } : e,
      ),
    });
  }, []);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement).closest(
          'input,select,textarea,[contenteditable=true],[role=dialog]',
        )
      )
        return;
      const state = useEditor.getState();
      const ctrl = event.ctrlKey || event.metaKey;
      if (ctrl && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) state.redo();
        else state.undo();
      } else if (ctrl && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicate();
      } else if (event.key === 'Delete') {
        event.preventDefault();
        removeSelected();
      } else if (event.key.startsWith('Arrow') && state.selected.length) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        move(
          event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0,
          event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0,
        );
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [duplicate, removeSelected, move]);
  if (lots.isPending || (id && lot.isPending)) return <Loading />;
  if (lots.isError || (id && lot.isError))
    return (
      <ErrorState
        retry={() => {
          void lots.refetch();
          void lot.refetch();
        }}
      />
    );
  if (!id || !lot.data)
    return (
      <EmptyState
        title="Primeiro, crie um estacionamento"
        description="Depois você poderá desenhar cada espaço do campus."
      >
        <Button onClick={() => navigate('/admin/estacionamentos')}>Criar estacionamento</Button>
      </EmptyState>
    );
  const all = [...editor.layout.vagas, ...editor.layout.elementos];
  const selected = all.find((i) => i.id === editor.selected[0]);
  const duplicates = editor.layout.vagas.filter(
    (v, i, arr) =>
      !v.rotulo.trim() ||
      arr.findIndex(
        (other) => other.rotulo.trim().toUpperCase() === v.rotulo.trim().toUpperCase(),
      ) !== i,
  );
  const overlaps = editor.layout.vagas
    .filter((v, i, arr) => arr.some((other, j) => i !== j && sobrepoe(v, other)))
    .map((v) => v.id);
  let preview: Vaga[] = [];
  let gridError = '';
  try {
    preview = gerarGrid(id, grid);
    if (
      preview.some((v) => v.x + v.largura > lot.data!.largura || v.y + v.altura > lot.data!.altura)
    )
      gridError = 'O grid não cabe no canvas. Reduza as dimensões ou o número de vagas.';
  } catch (e) {
    gridError = mensagemErro(e);
  }
  function add(tipo: string, x = 60, y = 60) {
    const newId = crypto.randomUUID();
    if (['COMUM', 'PCD', 'MOTO'].includes(tipo)) {
      let n = editor.layout.vagas.length + 1;
      while (editor.layout.vagas.some((v) => v.rotulo === `V${n}`)) n++;
      const vaga: Vaga = {
        id: newId,
        estacionamentoId: id,
        rotulo: `V${n}`,
        tipo: tipo as TipoVaga,
        x,
        y,
        largura: 53,
        altura: 86,
        rotacao: 0,
      };
      editor.commit({ ...editor.layout, vagas: [...editor.layout.vagas, vaga] });
    } else {
      const elemento: ElementoLayout = {
        id: newId,
        estacionamentoId: id,
        tipo: tipo as ElementoLayout['tipo'],
        x,
        y,
        largura: tipo === 'VIA' ? 220 : 140,
        altura: tipo === 'VIA' ? 48 : 30,
        rotacao: 0,
        texto:
          tipo === 'ENTRADA'
            ? 'ENTRADA →'
            : tipo === 'SAIDA'
              ? 'SAÍDA →'
              : tipo === 'TEXTO'
                ? 'Novo texto'
                : '→       →',
      };
      editor.commit({ ...editor.layout, elementos: [...editor.layout.elementos, elemento] });
    }
    editor.select([newId]);
  }
  function updateSelected(values: Partial<Vaga> | Partial<ElementoLayout>) {
    if (!selected) return;
    editor.commit({
      vagas: editor.layout.vagas.map((v) =>
        v.id === selected.id ? ({ ...v, ...values } as Vaga) : v,
      ),
      elementos: editor.layout.elementos.map((e) =>
        e.id === selected.id ? ({ ...e, ...values } as ElementoLayout) : e,
      ),
    });
  }
  async function save() {
    if (duplicates.length) {
      toast.error('Corrija os rótulos vazios ou duplicados antes de salvar.');
      return;
    }
    setBusy(true);
    try {
      await api(`/estacionamentos/${id}/layout`, { method: 'PUT', body: json(editor.layout) });
      editor.markSaved();
      await client.invalidateQueries();
      toast.success('Layout salvo com sucesso.');
    } catch (e) {
      toast.error(mensagemErro(e));
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    if (gridError) return;
    setBusy(true);
    try {
      const result = await api<DetalheEstacionamento>(`/estacionamentos/${id}/layout-padrao`, {
        method: 'POST',
        body: json(grid),
      });
      editor.load({ vagas: result.vagas, elementos: result.elementos });
      await client.invalidateQueries();
      setGridOpen(false);
      toast.success('Layout padrão gerado e salvo. Vincule os sensores às novas vagas.');
    } catch (e) {
      toast.error(mensagemErro(e));
    } finally {
      setBusy(false);
    }
  }
  function numeric(key: 'x' | 'y' | 'largura' | 'altura' | 'rotacao', label: string) {
    return (
      <Field key={key} label={label}>
        <Input
          type="number"
          value={selected?.[key] ?? 0}
          step="1"
          onChange={(e) => updateSelected({ [key]: Number(e.target.value) })}
        />
      </Field>
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Configuração do estacionamento</div>
          <h1>Editor de layout</h1>
          <p>Posicione as vagas, configure os elementos e vincule os sensores.</p>
        </div>
        <Select
          aria-label="Estacionamento para editar"
          value={id}
          onChange={(e) => navigate(`/admin/editor/${e.target.value}`)}
        >
          {lots.data?.map((l) => (
            <option value={l.id} key={l.id}>
              {l.nome}
            </option>
          ))}
        </Select>
      </div>
      <div className="editor-toolbar">
        <div>
          <Button variant="secondary" onClick={() => setGridOpen(true)}>
            <Grid2X2 size={16} />
            Gerar layout padrão
          </Button>
          <Tooltip text="Desfazer · Ctrl+Z">
            <Button
              variant="ghost"
              disabled={!editor.past.length}
              onClick={editor.undo}
              aria-label="Desfazer"
            >
              <Undo2 size={17} />
            </Button>
          </Tooltip>
          <Tooltip text="Refazer · Ctrl+Shift+Z">
            <Button
              variant="ghost"
              disabled={!editor.future.length}
              onClick={editor.redo}
              aria-label="Refazer"
            >
              <Redo2 size={17} />
            </Button>
          </Tooltip>
          <Tooltip text="Duplicar · Ctrl+D">
            <Button
              variant="ghost"
              disabled={!editor.selected.length}
              onClick={duplicate}
              aria-label="Duplicar selecionados"
            >
              <Copy size={17} />
            </Button>
          </Tooltip>
          <Button
            variant="ghost"
            disabled={!editor.selected.length}
            onClick={removeSelected}
            aria-label="Excluir selecionados"
          >
            <Trash2 size={17} />
          </Button>
        </div>
        <Switch checked={editor.snap} onCheckedChange={editor.setSnap} label="Ajustar à grade" />
      </div>
      <div className="editor-workspace">
        <aside className="editor-palette">
          <h3>Adicionar ao mapa</h3>
          <p>Arraste ou clique para inserir.</p>
          {palette.map(({ tipo, label, icon: Icon }) => (
            <button
              key={tipo}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('batsinal/item', tipo)}
              onClick={() => add(tipo)}
            >
              <Icon size={16} />
              {label}
              <Plus size={12} />
            </button>
          ))}
          <div className="editor-shortcuts">
            <strong>ATALHOS ÚTEIS</strong>
            <p>Shift + clique: selecionar mais</p>
            <p>Arrastar no fundo: selecionar área</p>
            <p>Setas: mover 1 unidade</p>
            <p>Shift + setas: mover 10</p>
            <p>Ctrl+D: duplicar</p>
            <p>Delete: excluir</p>
          </div>
        </aside>
        <div className="editor-stage">
          <div className="editor-stage-heading">
            <strong>{lot.data.nome}</strong>
            <Badge>{editor.layout.vagas.length} vagas</Badge>
          </div>
          <LotCanvas
            mode="edit"
            largura={lot.data.largura}
            altura={lot.data.altura}
            {...editor.layout}
            selected={editor.selected}
            snap={editor.snap}
            overlaps={overlaps}
            onSelect={editor.select}
            onChange={editor.commit}
            onDropItem={add}
          />
          <div className="editor-validation" aria-live="polite">
            {duplicates.length > 0 && (
              <p className="field-error">{duplicates.length} rótulo(s) vazio(s) ou duplicado(s).</p>
            )}
            {overlaps.length > 0 && (
              <p className="warning-text">
                Atenção: {overlaps.length} vagas com sobreposição. Revise as bordas em vermelho.
              </p>
            )}
            {!duplicates.length && !overlaps.length && <p>✓ Layout sem conflitos detectados</p>}
          </div>
        </div>
        <aside className="editor-properties">
          <h3>Propriedades</h3>
          {selected ? (
            <div className="form-stack">
              {editor.selected.length > 1 && (
                <Badge>{editor.selected.length} selecionados · editando o primeiro</Badge>
              )}
              {'rotulo' in selected ? (
                <>
                  <Field label="Rótulo da vaga">
                    <Input
                      value={selected.rotulo}
                      onChange={(e) => updateSelected({ rotulo: e.target.value })}
                    />
                  </Field>
                  <Field label="Tipo de vaga">
                    <Select
                      value={selected.tipo}
                      onChange={(e) => updateSelected({ tipo: e.target.value as TipoVaga })}
                    >
                      <option value="COMUM">Comum</option>
                      <option value="PCD">PCD</option>
                      <option value="MOTO">Moto</option>
                    </Select>
                  </Field>
                </>
              ) : (
                <Field label="Texto do elemento">
                  <Input
                    value={selected.texto ?? ''}
                    onChange={(e) => updateSelected({ texto: e.target.value })}
                  />
                </Field>
              )}
              <div className="form-grid">
                {numeric('x', 'Posição X')}
                {numeric('y', 'Posição Y')}
                {numeric('largura', 'Largura')}
                {numeric('altura', 'Altura')}
              </div>
              {numeric('rotacao', 'Rotação (graus)')}
              {'rotulo' in selected && (
                <Field label="Sensor vinculado">
                  <Select
                    value={selected.sensorId ?? ''}
                    onChange={(e) => updateSelected({ sensorId: e.target.value || undefined })}
                  >
                    <option value="">Sem sensor</option>
                    {sensors.data
                      ?.filter(
                        (s) =>
                          (!s.vagaId || lot.data!.vagas.some((v) => v.id === s.vagaId)) &&
                          !editor.layout.vagas.some(
                            (v) => v.id !== selected.id && v.sensorId === s.id,
                          ),
                      )
                      .map((s) => (
                        <option value={s.id} key={s.id}>
                          {s.nome}
                        </option>
                      ))}
                  </Select>
                </Field>
              )}
              <div className="move-controls">
                <Button
                  variant="secondary"
                  onClick={() => move(-1, 0)}
                  aria-label="Mover para esquerda"
                >
                  <ArrowLeft size={16} />
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => move(0, -1)}
                  aria-label="Mover para cima"
                >
                  <ArrowUp size={16} />
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => move(0, 1)}
                  aria-label="Mover para baixo"
                >
                  <ArrowDown size={16} />
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => move(1, 0)}
                  aria-label="Mover para direita"
                >
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="properties-empty">
              <Hand size={28} />
              <p>Selecione uma vaga ou um elemento para ajustar os detalhes.</p>
            </div>
          )}
          <details className="editor-object-list">
            <summary>Selecionar pela lista</summary>
            {all.map((item) => (
              <label key={item.id}>
                <input
                  type="checkbox"
                  checked={editor.selected.includes(item.id)}
                  onChange={(e) =>
                    editor.select(
                      e.target.checked
                        ? [...editor.selected, item.id]
                        : editor.selected.filter((id) => id !== item.id),
                    )
                  }
                />
                {'rotulo' in item ? `Vaga ${item.rotulo}` : `${item.tipo}: ${item.texto ?? ''}`}
              </label>
            ))}
          </details>
        </aside>
      </div>
      <div className="editor-save-bar">
        <span>
          <span className={dirty ? 'unsaved-dot' : 'saved-dot'} />
          {dirty ? 'Alterações não salvas' : 'Todas as alterações salvas'}
        </span>
        <div>
          <Button variant="secondary" disabled={!dirty} onClick={() => setDiscardOpen(true)}>
            Descartar
          </Button>
          <Button
            disabled={!dirty || busy || Boolean(duplicates.length)}
            onClick={() => void save()}
          >
            <Save size={16} />
            {busy ? 'Salvando…' : 'Salvar layout'}
          </Button>
        </div>
      </div>
      <Dialog
        open={gridOpen}
        onOpenChange={setGridOpen}
        title="Gerar layout padrão"
        description="Confira a prévia. Gerar e salvar substitui o layout atual e desvincula os sensores das vagas antigas."
        wide
      >
        <div className="form-grid">
          {(Object.keys(grid) as (keyof GridOptions)[]).map((key) => (
            <Field
              label={
                {
                  linhas: 'Linhas',
                  colunas: 'Colunas',
                  largura: 'Largura da vaga',
                  altura: 'Altura da vaga',
                  espacamento: 'Espaçamento',
                }[key]
              }
              key={key}
            >
              <Input
                type="number"
                min={key === 'espacamento' ? 0 : 1}
                value={grid[key]}
                onChange={(e) => setGrid({ ...grid, [key]: Number(e.target.value) })}
              />
            </Field>
          ))}
        </div>
        {gridError ? (
          <p role="alert" className="form-error">
            {gridError}
          </p>
        ) : (
          <LotCanvas
            mode="view"
            vagas={preview}
            elementos={[]}
            largura={lot.data.largura}
            altura={lot.data.altura}
          />
        )}
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setGridOpen(false)}>
            Cancelar
          </Button>
          <Button disabled={busy || Boolean(gridError)} onClick={() => void generate()}>
            Confirmar substituição e salvar
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Descartar alterações?"
        description="O layout voltará à última versão salva."
      >
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setDiscardOpen(false)}>
            Continuar editando
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              editor.discard();
              setDiscardOpen(false);
            }}
          >
            Descartar
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') blocker.reset();
        }}
        title="Você tem alterações não salvas"
        description="Ao sair, as alterações no layout serão descartadas."
      >
        <div className="modal-actions">
          <Button
            variant="secondary"
            onClick={() => {
              if (blocker.state === 'blocked') blocker.reset();
            }}
          >
            Continuar editando
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              editor.discard();
              if (blocker.state === 'blocked') blocker.proceed();
            }}
          >
            Descartar e sair
          </Button>
        </div>
      </Dialog>
    </>
  );
}
