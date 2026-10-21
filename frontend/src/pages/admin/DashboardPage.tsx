import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  CircleParking,
  Clock3,
  MapPin,
  Radio,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useLot, useLots, useSensors, useStatuses } from '../../features/estacionamentos/queries';
import { api } from '../../lib/api';
import { ocupacao, tempoDesde } from '../../lib/utils';
import type { CelulaHeatmap, PontoOcupacao } from '../../types';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Legend,
  LiveDot,
  Loading,
  Select,
} from '../../components/ui';
import { LotCanvas } from '../../components/lot/LotCanvas';

export function DashboardPage() {
  const { user } = useAuth();
  const lots = useLots();
  const sensors = useSensors();
  const [chosen, setChosen] = useState('');
  const [period, setPeriod] = useState('hoje');
  const id = chosen || lots.data?.[0]?.id || '';
  const lot = useLot(id);
  const statuses = useStatuses(id);
  // A chave muda com o período. O histórico permanece no cache ao trocar a seleção.
  const analytics = useQuery({
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
  const today = useQuery({
    queryKey: ['pico-hoje', id],
    enabled: Boolean(id),
    queryFn: () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return api<PontoOcupacao[]>(
        `/estacionamentos/${id}/ocupacao?de=${d.toISOString()}&ate=${new Date().toISOString()}&granularidade=30min`,
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
  if (!lots.data.length)
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">Administração</div>
            <h1>Olá, {user?.nome.split(' ')[0]}.</h1>
          </div>
        </div>
        <EmptyState
          title="Nenhum estacionamento cadastrado"
          description="Cadastre um estacionamento e gere o layout para começar a conectar seus sensores."
        >
          <Link className="btn btn-primary" to="/admin/estacionamentos">
            Cadastrar estacionamento <ArrowRight size={16} />
          </Link>
        </EmptyState>
      </>
    );
  const current = lots.data.find((l) => l.id === id)!;
  const free = statuses.data?.filter((s) => s.status === 'LIVRE').length ?? current.vagasLivres;
  const total = current.totalVagas;
  const percentage = ocupacao(total, free);
  const related = sensors.data?.filter((s) => lot.data?.vagas.some((v) => v.id === s.vagaId)) ?? [];
  const offline = related.filter(
    (s) => !s.ultimoSinalEm || Date.now() - Date.parse(s.ultimoSinalEm) > 60000,
  ).length;
  const peak = today.data?.length ? Math.max(...today.data.map((p) => p.ocupacao)) : null;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Administração do campus</div>
          <h1>Visão geral</h1>
          <p>Disponibilidade, ocupação e leituras dos sensores.</p>
        </div>
        <div className="dashboard-select">
          <MapPin size={16} />
          <Select
            value={id}
            aria-label="Selecionar estacionamento do painel"
            onChange={(e) => setChosen(e.target.value)}
          >
            {lots.data.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="dashboard-welcome">
        <div>
          <LiveDot />
          <span className="muted">Monitoramento automático ativo</span>
        </div>
        <span>
          <Clock3 size={13} />
          {new Date().toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </span>
      </div>
      <div className="kpi-grid">
        <Metric
          title="Ocupação atual"
          value={`${percentage}%`}
          icon={<ChartNoAxesCombined size={19} />}
          detail={`${total - free} de ${total} vagas indisponíveis`}
          accent="yellow"
        >
          <span className="metric-inline">
            <span className="status-led" />
            Dados em tempo real
          </span>
        </Metric>
        <Metric
          title="Vagas livres"
          value={String(free).padStart(2, '0')}
          icon={<CircleParking size={19} />}
          detail="Disponíveis no estacionamento selecionado"
          accent="green"
        >
          <span className="metric-inline green-text">
            <ArrowUpRight size={13} />
            {total
              ? `${Math.round((free / total) * 100)}% da capacidade disponível`
              : 'Aguardando layout'}
          </span>
        </Metric>
        <Metric
          title="Pico de hoje"
          value={peak === null ? '—' : `${peak}%`}
          icon={<Clock3 size={19} />}
          detail="Maior ocupação registrada no dia"
          accent="blue"
        >
          <span className="metric-inline">
            {today.isError ? 'Histórico indisponível' : 'Histórico de leituras dos sensores'}
          </span>
        </Metric>
        <Metric
          title="Sensores sem sinal"
          value={String(offline).padStart(2, '0')}
          icon={<WifiOff size={19} />}
          detail={`de ${related.length} sensores vinculados`}
          accent="red"
        >
          <span className="metric-inline warning-text">
            {offline ? 'Verifique os dispositivos' : 'Todos os dispositivos em dia'}
          </span>
        </Metric>
      </div>
      <div className="dashboard-chart-grid">
        <Card className="chart-card">
          <div className="card-heading">
            <div>
              <h2>Histórico de ocupação</h2>
              <p>Ocupação ao longo do tempo</p>
            </div>
            <Select
              aria-label="Período do gráfico"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="hoje">Hoje</option>
              <option value="7">Últimos 7 dias</option>
              <option value="14">Últimos 14 dias</option>
            </Select>
          </div>
          <div className="chart-key">
            <span />
            Ocupação <span className="muted">(%)</span>
          </div>
          {analytics.isError ? (
            <ErrorState retry={() => void analytics.refetch()} />
          ) : analytics.isPending ? (
            <Loading />
          ) : !analytics.data.length ? (
            <EmptyState title="Nenhuma leitura neste período" />
          ) : (
            <div
              className="occupancy-chart"
              role="img"
              aria-label={`Gráfico de ocupação: ${analytics.data.map((p) => `${new Date(p.instante).toLocaleString('pt-BR')}: ${p.ocupacao}%`).join('; ')}`}
            >
              <ResponsiveContainer width="100%" height={235}>
                <AreaChart
                  data={analytics.data}
                  margin={{ top: 15, left: -25, right: 8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9CA5B3" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#9CA5B3" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
                  <XAxis
                    dataKey="instante"
                    minTickGap={25}
                    tickFormatter={(value) =>
                      period === 'hoje'
                        ? `${new Date(String(value)).getHours()}h`
                        : new Date(String(value)).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                          })
                    }
                    tick={{ fill: 'var(--muted)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tick={{ fill: 'var(--muted)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      color: 'var(--text)',
                    }}
                    labelFormatter={(value) => new Date(String(value)).toLocaleString('pt-BR')}
                    formatter={(value) => [`${value}%`, 'Ocupação']}
                  />
                  <Area
                    dataKey="ocupacao"
                    type="monotone"
                    stroke="#9CA5B3"
                    strokeWidth={2.5}
                    fill="url(#occupancyGradient)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card className="availability-card">
          <div className="card-heading">
            <div>
              <h2>Estado das vagas</h2>
              <p>Disponibilidade agora</p>
            </div>
            <Radio size={18} className="muted" />
          </div>
          <div className="operation-summary">
            <strong>
              {related.length - offline}
              <span> / {related.length}</span>
            </strong>
            <p>sensores com leitura recente</p>
            <Link to="/admin/sensores">
              Gerenciar sensores <ArrowRight size={14} />
            </Link>
          </div>
          <div className="availability-detail">
            <span>
              <i className="green-bg" />
              Livres<strong>{free}</strong>
            </span>
            <span>
              <i className="red-bg" />
              Ocupadas
              <strong>{statuses.data?.filter((s) => s.status === 'OCUPADA').length ?? '—'}</strong>
            </span>
            <span>
              <i className="gray-bg" />
              Sem sinal
              <strong>
                {statuses.data?.filter((s) => s.status === 'SEM_SINAL').length ?? '—'}
              </strong>
            </span>
          </div>
        </Card>
      </div>
      <div className="dashboard-bottom-grid">
        <Card className="live-map-card">
          <div className="card-heading">
            <div>
              <h2>Layout e disponibilidade</h2>
              <p>{current.nome}</p>
            </div>
            <Link className="table-link" to={`/admin/editor/${id}`}>
              Editar layout <ArrowRight size={15} />
            </Link>
          </div>
          <Legend />
          {lot.data && statuses.data ? (
            <LotCanvas mode="view" {...lot.data} statuses={statuses.data} />
          ) : (
            <Loading />
          )}
          <Link className="dashboard-detail-link" to={`/admin/consulta/${id}`}>
            Abrir mapa interativo <ArrowRight size={15} />
          </Link>
        </Card>
        <Card className="heatmap-card">
          <div className="card-heading">
            <div>
              <h2>Ocupação por dia e hora</h2>
              <p>Ocupação média · últimos 14 dias</p>
            </div>
            <Badge>14 dias</Badge>
          </div>
          {heat.isError ? (
            <ErrorState retry={() => void heat.refetch()} />
          ) : heat.isPending ? (
            <Loading />
          ) : (
            <>
              <div className="heatmap">
                <div className="heatmap-axis">
                  <span />
                  <span>0h</span>
                  <span>6h</span>
                  <span>12h</span>
                  <span>18h</span>
                </div>
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, index) => (
                  <div className="heatmap-row" key={day}>
                    <span>{day}</span>
                    {heat.data
                      .filter((c) => c.dia === index)
                      .map((cell) => (
                        <span
                          key={cell.hora}
                          className="heatmap-cell"
                          role="img"
                          title={`${day} ${cell.hora}h: ${cell.ocupacao}%`}
                          aria-label={`${day}, ${cell.hora} horas: ${cell.ocupacao}% de ocupação`}
                          style={{
                            background: `rgba(156,165,179,${0.08 + (cell.ocupacao / 100) * 0.92})`,
                          }}
                        />
                      ))}
                  </div>
                ))}
              </div>
              <div className="heatmap-legend">
                <span>Menos movimento</span>
                {[0.1, 0.3, 0.5, 0.7, 1].map((opacity) => (
                  <i key={opacity} style={{ background: `rgba(156,165,179,${opacity})` }} />
                ))}
                <span>Mais</span>
              </div>
              <div className="heatmap-tip">
                <Clock3 size={19} />
                <p>
                  Como ler este mapa
                  <span>
                    As cores mais claras indicam os horários de maior movimento no campus.
                  </span>
                </p>
              </div>
            </>
          )}
        </Card>
      </div>
      <Card className="dashboard-sensors">
        <div className="card-heading">
          <div>
            <h2>Leituras dos sensores</h2>
            <p>Últimas leituras dos dispositivos</p>
          </div>
          <Link className="table-link" to="/admin/sensores">
            Todos os sensores <ArrowRight size={15} />
          </Link>
        </div>
        {sensors.isError ? (
          <ErrorState retry={() => void sensors.refetch()} />
        ) : !related.length ? (
          <EmptyState
            title="Nenhum sensor vinculado"
            description="Vincule o primeiro sensor no editor de layout."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Dispositivo</th>
                  <th>Vaga</th>
                  <th>Última leitura</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {related.slice(0, 5).map((sensor) => (
                  <tr key={sensor.id}>
                    <td>
                      <div className="table-name">
                        <Radio size={15} />
                        <strong>{sensor.nome}</strong>
                      </div>
                    </td>
                    <td className="mono">
                      {lot.data?.vagas.find((v) => v.id === sensor.vagaId)?.rotulo}
                    </td>
                    <td>
                      <RefreshCw size={12} className="inline-icon" />
                      {tempoDesde(sensor.ultimoSinalEm)}
                    </td>
                    <td>
                      <Badge
                        className={
                          sensor.ultimoSinalEm &&
                          Date.now() - Date.parse(sensor.ultimoSinalEm) <= 60000
                            ? 'badge-green'
                            : 'badge-red'
                        }
                      >
                        {sensor.ultimoSinalEm &&
                        Date.now() - Date.parse(sensor.ultimoSinalEm) <= 60000
                          ? 'Conectado'
                          : 'Sem sinal'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
function Metric({
  title,
  value,
  icon,
  detail,
  children,
  accent,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  detail: string;
  children: React.ReactNode;
  accent: string;
}) {
  return (
    <Card className={`metric-card metric-${accent}`}>
      <div>
        <span>{title}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <strong className="metric-value" aria-live={title === 'Vagas livres' ? 'polite' : 'off'}>
        {value}
      </strong>
      <p>{detail}</p>
      <footer>{children}</footer>
    </Card>
  );
}
