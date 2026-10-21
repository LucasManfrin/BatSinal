import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceDot,
} from 'recharts';
import { ArrowRight } from 'lucide-react';
import {
  useLot,
  useLots,
  useSensors,
  useStatuses,
  useAreas,
  useArea,
} from '../../features/estacionamentos/queries';
import { CompanyChecklist } from '../../components/company/CompanyChecklist';
import { AreaScene } from '../../components/area/AreaScene';
import { api } from '../../lib/api';
import { ocupacao } from '../../lib/utils';
import { EmptyState, ErrorState, Loading, Select, UpdatedAt } from '../../components/ui';
import type { PontoOcupacao, CelulaHeatmap } from '../../types';
export function DashboardPage() {
  const lots = useLots();
  const sensors = useSensors();
  const areas = useAreas();
  const [selected, setSelected] = useState('');
  const [chosen, setChosen] = useState('');
  const [period, setPeriod] = useState('hoje');
  const id = lots.data?.some((l) => l.id === chosen) ? chosen : (lots.data?.[0]?.id ?? '');
  const areaId = areas.data?.find((a) => a.estacionamentoId === id)?.id ?? '';
  const area = useArea(areaId);
  const lot = useLot(id);
  const statuses = useStatuses(id);
  const today = useQuery({
    queryKey: ['pico-hoje', id],
    enabled: Boolean(id),
    queryFn: () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return api<PontoOcupacao[]>(
        `/estacionamentos/${id}/ocupacao?de=${start.toISOString()}&ate=${new Date().toISOString()}&granularidade=30min`,
      );
    },
    refetchInterval: 30000,
  });
  const history = useQuery({
    queryKey: ['ocupacao', id, period],
    enabled: Boolean(id),
    queryFn: () => {
      const start = new Date();
      if (period === 'hoje') start.setHours(0, 0, 0, 0);
      else start.setDate(start.getDate() - Number(period));
      return api<PontoOcupacao[]>(
        `/estacionamentos/${id}/ocupacao?de=${start.toISOString()}&ate=${new Date().toISOString()}&granularidade=${period === 'hoje' ? 'hora' : 'dia'}`,
      );
    },
    refetchInterval: 30000,
  });
  const heat = useQuery({
    queryKey: ['heatmap', id],
    enabled: Boolean(id),
    queryFn: () => api<CelulaHeatmap[]>(`/estacionamentos/${id}/heatmap`),
  });
  if (lots.isPending) return <Loading />;
  if (lots.isError) return <ErrorState retry={() => void lots.refetch()} />;
  if (!lots.data.length) return <CompanyChecklist />;
  const current = lots.data.find((l) => l.id === id)!;
  const free = statuses.isError
    ? null
    : (statuses.data?.filter((s) => s.status === 'LIVRE').length ?? current.vagasLivres);
  const peak = today.data?.reduce<PontoOcupacao | null>(
    (best, p) => (!best || p.ocupacao > best.ocupacao ? p : best),
    null,
  );
  const chartPeak = history.data?.reduce<PontoOcupacao | null>(
    (best, p) => (!best || p.ocupacao > best.ocupacao ? p : best),
    null,
  );
  const related = sensors.data?.filter((s) => lot.data?.vagas.some((v) => v.id === s.vagaId)) ?? [];
  const offline = related.filter(
    (s) => !s.ultimoSinalEm || Date.now() - Date.parse(s.ultimoSinalEm) > 60000,
  ).length;
  const hottest = heat.data?.reduce<CelulaHeatmap | null>(
    (best, p) => (!best || p.ocupacao > best.ocupacao ? p : best),
    null,
  );
  const days = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
  return (
    <>
      <CompanyChecklist />
      <div className="page-heading">
        <h1>Visão geral</h1>
        <Select
          aria-label="Estacionamento do painel"
          value={id}
          onChange={(e) => setChosen(e.target.value)}
        >
          {lots.data.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nome}
            </option>
          ))}
        </Select>
      </div>
      <p className="dashboard-summary">
        {free === null ? (
          'Leitura de vagas indisponível'
        ) : (
          <>
            <strong>{free} vagas livres</strong> de {current.totalVagas}
          </>
        )}{' '}
        em {current.nome}.
        {peak ? (
          <>
            {' '}
            Hoje o pico foi {peak.ocupacao}%, às{' '}
            {new Date(peak.instante).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            .
          </>
        ) : (
          ' Ainda sem histórico de hoje.'
        )}
      </p>
      <div className="dashboard-primary">
        <section>
          <div className="card-heading">
            <h2>Posições mapeadas</h2>
            <Link className="btn btn-primary" to={`/admin/posicionar/${id}`}>
              Posicionar vagas <ArrowRight size={16} />
            </Link>
          </div>
          <p className="small-note">
            {area.data?.area.nome ?? 'Esta empresa ainda não tem área mapeada.'}
          </p>
          {area.data ? (
            <AreaScene data={area.data} modo="ver" selectedId={selected} onSelect={setSelected} />
          ) : (
            <EmptyState title="A área precisa de posições mapeadas antes de receber peças." />
          )}
          <p aria-live="polite">
            {selected
              ? `Vaga ${area.data?.vagas.find((v) => v.id === selected)?.rotulo ?? ''}`
              : 'Escolha uma peça para conferir a vaga.'}
          </p>
        </section>
        <aside>
          <h2>Vagas e sensores</h2>
          <dl className="dashboard-facts">
            <div>
              <dt>Ocupação</dt>
              <dd>{free === null ? '—' : `${ocupacao(current.totalVagas, free)}%`}</dd>
            </div>
            <div>
              <dt>Vagas sem sinal</dt>
              <dd>{statuses.data?.filter((s) => s.status === 'SEM_SINAL').length ?? '—'}</dd>
            </div>
            <div>
              <dt>Sensores vinculados</dt>
              <dd>{related.length}</dd>
            </div>
          </dl>
          {sensors.isError ? (
            <ErrorState retry={() => void sensors.refetch()} />
          ) : (
            <p>
              {offline
                ? `${offline} ${offline === 1 ? 'sensor do estacionamento não respondeu' : 'sensores do estacionamento não responderam'} no último minuto.`
                : related.length
                  ? `Os ${related.length} sensores responderam no último minuto.`
                  : 'Nenhum sensor neste estacionamento. Cadastre o primeiro e ligue a uma vaga.'}
            </p>
          )}
          <Link className="text-link" to="/admin/sensores">
            Conferir sensores <ArrowRight size={16} />
          </Link>
          <UpdatedAt at={statuses.dataUpdatedAt} />
        </aside>
      </div>
      <div className="dashboard-charts">
        <section className="card">
          <div className="card-heading">
            <h2>Ocupação de {current.nome}</h2>
            <Select
              aria-label="Período do gráfico"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="hoje">Hoje</option>
              <option value="7">7 dias</option>
              <option value="14">14 dias</option>
            </Select>
          </div>
          {history.isError ? (
            <ErrorState retry={() => void history.refetch()} />
          ) : history.isPending ? (
            <Loading />
          ) : !history.data.length ? (
            <EmptyState title="Ainda sem leituras neste período" />
          ) : (
            <div
              className="occupancy-chart"
              role="img"
              aria-label={`Ocupação; pico de ${chartPeak?.ocupacao}%`}
            >
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={history.data} margin={{ top: 25, right: 45, bottom: 10, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="instante"
                    tickFormatter={(value) =>
                      new Date(String(value)).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    }
                    minTickGap={40}
                    tick={{ fill: 'var(--muted)', fontSize: 13 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    width={35}
                    tick={{ fill: 'var(--muted)', fontSize: 13 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                    }}
                    labelFormatter={(value) => new Date(String(value)).toLocaleString('pt-BR')}
                    formatter={(value) => [`${value}%`, 'Ocupação']}
                  />
                  <Line
                    dataKey="ocupacao"
                    stroke="#896500"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  {chartPeak && (
                    <ReferenceDot
                      x={chartPeak.instante}
                      y={chartPeak.ocupacao}
                      r={4}
                      fill="#896500"
                      label={{
                        value: `Pico ${chartPeak.ocupacao}%`,
                        position: 'top',
                        fill: 'var(--text)',
                        fontSize: 14,
                      }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section className="card">
          <h2>Quando costuma encher</h2>
          {heat.isError ? (
            <ErrorState retry={() => void heat.refetch()} />
          ) : heat.isPending ? (
            <Loading />
          ) : (
            <>
              <div
                className="heatmap"
                role="img"
                aria-label="Ocupação média por dia e hora nos últimos 14 dias"
              >
                {days.map((day, d) => (
                  <div key={day} style={{ display: 'contents' }}>
                    <span>{day.slice(0, 3)}</span>
                    {Array.from({ length: 24 }, (_, h) => {
                      const value =
                        heat.data.find((c) => c.dia === d && c.hora === h)?.ocupacao ?? 0;
                      return (
                        <span
                          key={h}
                          title={`${day}, ${h}h: ${value}%`}
                          style={{ background: `rgba(137,101,0,${0.08 + (value / 100) * 0.7})` }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              {hottest && (
                <p>
                  No histórico demonstrativo, o maior valor médio foi {hottest.ocupacao}%:{' '}
                  {days[hottest.dia]}, às {hottest.hora}h.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
