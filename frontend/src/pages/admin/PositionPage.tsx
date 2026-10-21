import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Redo2, Undo2, Upload, WifiOff } from 'lucide-react';
import { useArea, useAreas, useLots, useSensors } from '../../features/estacionamentos/queries';
import { AreaScene } from '../../components/area/AreaScene';
import { VagaTile } from '../../components/area/VagaTile';
import { Button, Dialog, Field, Input, Select, Loading, EmptyState } from '../../components/ui';
import { api, json } from '../../lib/api';
import { progressoArea } from '../../lib/positioning';
import type { DetalheArea, TipoVaga } from '../../types';

type Positions = { vagaId: string; ancoraId: string | null }[];
type Command = { before: Positions; after: Positions };
const snapshot = (data: DetalheArea): Positions =>
  data.vagas.map((v) => ({ vagaId: v.id, ancoraId: v.ancoraId ?? null }));
const typeLabel = { COMUM: 'Comum', PCD: 'PCD', MOTO: 'Moto' };

export function PositionPage() {
  const areas = useAreas(),
    lots = useLots(),
    client = useQueryClient();
  const { id } = useParams();
  const [chosen, setChosen] = useState(''),
    [error, setError] = useState(''),
    [adding, setAdding] = useState(false),
    [saving, setSaving] = useState(false);
  const selected =
    areas.data?.find((a) => a.id === (chosen || id)) ??
    areas.data?.find((a) => a.estacionamentoId === id) ??
    areas.data?.[0];
  async function createArea(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const form = new FormData(e.currentTarget),
        file = form.get('mapa') as File;
      const anchors = file?.size ? JSON.parse(await file.text()) : [];
      const area = await api<{ id: string }>('/areas', {
        method: 'POST',
        body: json({
          nome: form.get('nome'),
          estacionamentoId: form.get('estacionamentoId'),
          ancoras: anchors,
        }),
      });
      await client.invalidateQueries({ queryKey: ['areas'] });
      setChosen(area.id);
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui cadastrar a área.');
    } finally {
      setSaving(false);
    }
  }
  if (areas.isPending || lots.isPending) return <Loading />;
  if (areas.isError || lots.isError)
    return (
      <EmptyState
        title="Não consegui carregar as áreas."
        description={(areas.error ?? lots.error)?.message}
      >
        <Button onClick={() => void Promise.all([areas.refetch(), lots.refetch()])}>
          Tentar novamente
        </Button>
      </EmptyState>
    );
  return (
    <div className="position-page">
      <header className="page-heading">
        <div>
          <h1>Posicionar vagas</h1>
          <p>Encaixe cada vaga em uma posição mapeada. As alterações são salvas ao soltar.</p>
        </div>
      </header>
      <div className="position-workspace">
        <aside className="position-areas" aria-label="Áreas do estacionamento">
          <h2>Áreas</h2>
          <Select
            className="position-area-select"
            aria-label="Escolher área"
            value={selected?.id ?? ''}
            onChange={(e) => setChosen(e.target.value)}
          >
            {areas.data?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome} · {a.progresso?.posicionadas ?? 0}/{a.progresso?.total ?? 0}
              </option>
            ))}
          </Select>
          {areas.data?.map((a) => (
            <button
              key={a.id}
              className="area-choice"
              aria-pressed={a.id === selected?.id}
              onClick={() => setChosen(a.id)}
            >
              <strong>{a.nome}</strong>
              <span>
                {a.progresso?.posicionadas ?? 0} de {a.progresso?.total ?? 0} posicionadas
              </span>
            </button>
          ))}
          <Button variant="ghost" onClick={() => setAdding(!adding)}>
            Cadastrar área
          </Button>
          {adding && (
            <form className="position-form" onSubmit={createArea}>
              <Field label="Nome da área">
                <Input name="nome" required maxLength={100} />
              </Field>
              <Field label="Estacionamento">
                <Select name="estacionamentoId" required>
                  {lots.data?.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome}
                    </option>
                  ))}
                </Select>
              </Field>
              <label className="field">
                <span>Posições já mapeadas (JSON, opcional)</span>
                <input type="file" name="mapa" accept=".json,application/json" />
              </label>
              <p className="muted">
                Importe a lista de posições do levantamento do local. Sem arquivo, a área começa
                vazia.
              </p>
              <Button disabled={saving || !lots.data?.length}>
                <Upload size={15} />
                Salvar área
              </Button>
            </form>
          )}
          {error && <p role="alert">{error}</p>}
          {!lots.data?.length && <p>Cadastre um estacionamento antes de adicionar áreas.</p>}
        </aside>
        {selected ? (
          <AreaPositioner key={selected.id} id={selected.id} />
        ) : (
          <EmptyState
            title="Nenhuma área cadastrada"
            description="Cadastre a primeira área e importe as posições levantadas no local."
          />
        )}
      </div>
    </div>
  );
}

function AreaPositioner({ id }: { id: string }) {
  const query = useArea(id),
    sensors = useSensors(),
    client = useQueryClient();
  const [selected, setSelected] = useState(''),
    [pointerDrag, setPointerDrag] = useState(false),
    [filter, setFilter] = useState('TODAS'),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(''),
    [announcement, setAnnouncement] = useState('Escolha uma vaga na bandeja ou na maquete.'),
    [restore, setRestore] = useState(false),
    [creating, setCreating] = useState(false);
  const history = useRef<{ undo: Command[]; redo: Command[] }>({ undo: [], redo: [] });
  const busy = useRef(false),
    current = useRef(query.data);
  current.current = query.data;
  const [historyTick, setHistoryTick] = useState(0);
  useEffect(() => {
    function escape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setPointerDrag(false);
        setSelected('');
        setAnnouncement('Posicionamento cancelado. A vaga permanece na origem.');
      }
    }
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);
  async function refresh() {
    await Promise.all(
      [
        'area',
        'areas',
        'mapa-campus',
        'estacionamentos',
        'estacionamento',
        'status',
        'sensores',
      ].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
  }
  async function write(path: string, method: string, body: unknown, label: string, record = true) {
    if (busy.current || !current.current) return false;
    busy.current = true;
    setSaving(true);
    setError('');
    setPointerDrag(false);
    const before = snapshot(current.current);
    try {
      const next = await api<DetalheArea>(path, { method, body: json(body) });
      client.setQueriesData<DetalheArea>({ queryKey: ['area', id] }, next);
      current.current = next;
      if (record) {
        history.current.undo.push({ before, after: snapshot(next) });
        history.current.redo = [];
        setHistoryTick((t) => t + 1);
      }
      await refresh();
      setAnnouncement(label);
      if (record)
        toast.success(label, { action: { label: 'Desfazer', onClick: () => void travel('undo') } });
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não consegui salvar. A vaga continua na origem.',
      );
      setAnnouncement('Não foi possível salvar. A vaga permanece na origem.');
      await query.refetch();
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  async function travel(direction: 'undo' | 'redo') {
    if (busy.current || !current.current) return;
    const item = history.current[direction].at(-1);
    if (!item) return;
    const expected = direction === 'undo' ? item.after : item.before;
    const present = snapshot(current.current);
    if (
      expected.length !== present.length ||
      expected.some((p) => !present.some((v) => v.vagaId === p.vagaId && v.ancoraId === p.ancoraId))
    ) {
      history.current = { undo: [], redo: [] };
      setHistoryTick((t) => t + 1);
      setError(
        'As posições mudaram fora desta operação. O histórico foi limpo para preservar o trabalho mais recente.',
      );
      return;
    }
    // O lote completo permite desfazer uma troca sem criar duas vagas na mesma âncora.
    const ok = await write(
      `/areas/${id}/posicoes`,
      'PUT',
      {
        versao: current.current.area.versao,
        posicoes: direction === 'undo' ? item.before : item.after,
      },
      direction === 'undo' ? 'Última alteração desfeita.' : 'Alteração refeita.',
      false,
    );
    if (ok) {
      history.current[direction].pop();
      history.current[direction === 'undo' ? 'redo' : 'undo'].push(item);
      setHistoryTick((t) => t + 1);
    }
  }
  function grab(slotId: string, physical = false) {
    if (busy.current) return;
    const slot = current.current?.vagas.find((v) => v.id === slotId);
    if (!slot) return;
    setSelected(slotId);
    setPointerDrag(physical);
    setAnnouncement(
      `Vaga ${slot.rotulo} selecionada. Escolha uma posição compatível na lista e pressione Enter. Escape cancela.`,
    );
  }
  function place(slotId: string, anchor: string | null) {
    const data = current.current,
      slot = data?.vagas.find((v) => v.id === slotId);
    if (!data || !slot) return;
    void write(
      `/vagas/${slotId}/posicao`,
      'PUT',
      { ancoraId: anchor, versao: data.area.versao },
      anchor ? `Vaga ${slot.rotulo} posicionada.` : `Vaga ${slot.rotulo} retirada para a bandeja.`,
    );
  }
  async function createSlot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      await api('/vagas', {
        method: 'POST',
        body: json({ areaId: id, rotulo: form.get('rotulo'), tipo: form.get('tipo') }),
      });
      history.current = { undo: [], redo: [] };
      setHistoryTick((t) => t + 1);
      await refresh();
      setCreating(false);
      setAnnouncement('Vaga cadastrada na bandeja.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui cadastrar a vaga.');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  if (query.isPending) return <Loading />;
  if (!query.data)
    return (
      <EmptyState title="Não consegui abrir esta área.">
        <Button onClick={() => void query.refetch()}>Tentar novamente</Button>
      </EmptyState>
    );
  const data = query.data,
    slot = data.vagas.find((v) => v.id === selected),
    progress = progressoArea(data.vagas, data.ancoras);
  const tray = data.vagas.filter((v) => !v.ancoraId && (filter === 'TODAS' || v.tipo === filter));
  const origin = data.ancoras.find((a) => a.id === slot?.ancoraId);
  const compatible = slot
    ? data.ancoras
        .filter((a) => a.tiposAceitos.includes(slot.tipo))
        .sort(
          (a, b) =>
            Math.hypot(a.x - (origin?.x ?? 0), a.z - (origin?.z ?? 0)) -
            Math.hypot(b.x - (origin?.x ?? 0), b.z - (origin?.z ?? 0)),
        )
    : [];
  return (
    <div className="position-editor" data-history={historyTick}>
      <section className="position-center">
        <header className="position-area-heading">
          <h2>{data.area.nome}</h2>
          <span>
            {progress.posicionadas} de {progress.total} posicionadas
          </span>
        </header>
        <AreaScene
          key={id}
          data={data}
          modo="posicionar"
          selectedId={selected}
          onSelect={(v) => grab(v)}
          draggingId={slot?.id}
          pointerDrag={pointerDrag}
          onGrab={(v) => grab(v, true)}
          onPlace={place}
          onCancelDrag={() => {
            setPointerDrag(false);
            setAnnouncement('Soltura fora de uma posição: a peça voltou à origem.');
          }}
          disabled={saving}
        />
        <div className="position-toolbar">
          <Button
            variant="secondary"
            disabled={saving || !history.current.undo.length}
            onClick={() => void travel('undo')}
          >
            <Undo2 size={16} />
            Desfazer
          </Button>
          <Button
            variant="secondary"
            disabled={saving || !history.current.redo.length}
            onClick={() => void travel('redo')}
          >
            <Redo2 size={16} />
            Refazer
          </Button>
          <Button
            variant="ghost"
            disabled={saving || !data.ancoras.some((a) => a.vagaPadraoId)}
            onClick={() => setRestore(true)}
          >
            Restaurar padrão mapeado
          </Button>
          <span role="status">
            {saving ? 'Salvando…' : error ? 'Alteração não salva' : 'Alterações salvas'}
          </span>
        </div>
        {error && (
          <p className="position-error" role="alert">
            {error} Tente a operação novamente após atualizar a área.
          </p>
        )}
        <p className="position-announcement" aria-live="polite">
          {announcement}
        </p>
        <details className="position-list" open>
          <summary>Posicionar por lista · teclado e toque</summary>
          <p>
            Escolha a vaga. Use Tab ou as setas entre as posições e Enter para encaixar. Escape
            cancela.
          </p>
          <Field label="Vaga para posicionar">
            <Select disabled={saving} value={selected} onChange={(e) => grab(e.target.value)}>
              <option value="">Escolha uma vaga</option>
              {data.vagas.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.rotulo} · {typeLabel[v.tipo]} · {v.ancoraId ? 'posicionada' : 'na bandeja'}
                </option>
              ))}
            </Select>
          </Field>
          {slot && (
            <>
              <h3>Posições para {slot.rotulo}</h3>
              <div
                className="anchor-list"
                role="group"
                aria-label="Posições compatíveis"
                onKeyDown={(e) => {
                  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
                  const buttons = Array.from(
                    e.currentTarget.querySelectorAll<HTMLButtonElement>('button'),
                  );
                  const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
                  e.preventDefault();
                  buttons[
                    (index +
                      (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) +
                      buttons.length) %
                      buttons.length
                  ]?.focus();
                }}
              >
                {compatible.map((a) => {
                  const index = data.ancoras.indexOf(a) + 1,
                    other = data.vagas.find((v) => v.ancoraId === a.id),
                    current = other?.id === slot.id;
                  const reverse = other && origin && !origin.tiposAceitos.includes(other.tipo);
                  return (
                    <button
                      key={a.id}
                      disabled={saving || current || Boolean(reverse)}
                      aria-label={`Posição ${index}${other && !current ? `, trocar com ${other.rotulo}` : current ? ', posição atual' : ', vazia'}`}
                      title={reverse ? 'A origem não aceita o tipo da outra vaga.' : undefined}
                      onClick={() => place(slot.id, a.id)}
                    >
                      <strong>{index}</strong>
                      <span>
                        {current ? 'Atual' : other ? `Trocar com ${other.rotulo}` : 'Vazia'}
                      </span>
                    </button>
                  );
                })}
              </div>
              {!compatible.length && (
                <p>Esta área não tem posições compatíveis com {typeLabel[slot.tipo]}.</p>
              )}
              {slot.ancoraId && (
                <Button variant="secondary" disabled={saving} onClick={() => place(slot.id, null)}>
                  <ArrowLeft size={16} />
                  Retirar para bandeja
                </Button>
              )}
              {!slot.sensorId && (
                <div className="sensor-inline">
                  <p>
                    <WifiOff size={15} />
                    Vaga {slot.rotulo} sem sensor
                  </p>
                  <Field label={`Sensor para ${slot.rotulo}`}>
                    <Select
                      value=""
                      disabled={saving}
                      onChange={async (e) => {
                        const sensor = sensors.data?.find((s) => s.id === e.target.value);
                        if (!sensor) return;
                        busy.current = true;
                        setSaving(true);
                        setError('');
                        try {
                          await api(`/sensores/${sensor.id}`, {
                            method: 'PUT',
                            body: json({ nome: sensor.nome, vagaId: slot.id }),
                          });
                          await refresh();
                          setAnnouncement(`Sensor ${sensor.nome} vinculado à vaga ${slot.rotulo}.`);
                        } catch (err) {
                          setError(
                            err instanceof Error ? err.message : 'Não consegui vincular o sensor.',
                          );
                        } finally {
                          busy.current = false;
                          setSaving(false);
                        }
                      }}
                    >
                      <option value="">Vincular sensor livre</option>
                      {sensors.data
                        ?.filter((s) => !s.vagaId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nome}
                          </option>
                        ))}
                    </Select>
                  </Field>
                </div>
              )}
            </>
          )}
        </details>
      </section>
      <aside className="position-tray" aria-label="Bandeja de vagas">
        <h2>Sem posição</h2>
        <Field label="Tipo de vaga na bandeja">
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="TODAS">Todos os tipos</option>
            {Object.entries(typeLabel).map(([type, name]) => (
              <option key={type} value={type}>
                {name}
              </option>
            ))}
          </Select>
        </Field>
        <p>Arraste para a maquete ou selecione para posicionar por lista.</p>
        <div className="tray-pieces">
          {tray.map((v) => (
            <VagaTile
              key={v.id}
              vaga={v}
              status={v.status}
              selected={selected === v.id}
              disabled={saving}
              aria-label={`Pegar vaga ${v.rotulo}, ${typeLabel[v.tipo]}`}
              onClick={() => grab(v.id)}
              onPointerDown={(e) => {
                if (e.button === 0) {
                  e.stopPropagation();
                  grab(v.id, true);
                }
              }}
            />
          ))}
        </div>
        {!tray.length && (
          <p className="muted">
            {filter === 'TODAS'
              ? 'Todas as vagas desta área estão posicionadas.'
              : 'Nenhuma vaga deste tipo na bandeja.'}
          </p>
        )}
        <Button variant="ghost" onClick={() => setCreating(!creating)}>
          Cadastrar vaga
        </Button>
        {creating && (
          <form className="position-form" onSubmit={createSlot}>
            <Field label="Rótulo da vaga">
              <Input name="rotulo" required maxLength={100} />
            </Field>
            <Field label="Tipo da nova vaga">
              <Select name="tipo">
                {Object.entries(typeLabel).map(([type, name]) => (
                  <option key={type} value={type as TipoVaga}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
            <Button disabled={saving}>Adicionar à bandeja</Button>
          </form>
        )}
      </aside>
      <Dialog
        destructive
        open={restore}
        onOpenChange={setRestore}
        title="Restaurar o padrão mapeado?"
        description="As vagas voltam às posições do levantamento original desta área. Você poderá desfazer esta alteração."
      >
        <Button
          variant="danger"
          disabled={saving}
          onClick={async () => {
            const ok = await write(
              `/areas/${id}/restaurar-padrao`,
              'POST',
              { versao: current.current?.area.versao },
              'Padrão mapeado restaurado.',
            );
            if (ok) setRestore(false);
          }}
        >
          Restaurar posições
        </Button>
        <Button variant="secondary" onClick={() => setRestore(false)}>
          Cancelar
        </Button>
      </Dialog>
    </div>
  );
}
