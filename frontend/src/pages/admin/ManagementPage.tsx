import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Edit3, Map, Plus, Radio, Search, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError, json } from '../../lib/api';
import { mensagemErro, tempoDesde } from '../../lib/utils';
import type { DetalheEstacionamento, EstacionamentoResumo, Sensor, Usuario } from '../../types';
import { useLots } from '../../features/estacionamentos/queries';
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LiveDot,
  Loading,
  Select,
} from '../../components/ui';
import { CampusMap } from '../../components/lot/CampusMap';

type Resource = 'estacionamentos' | 'sensores' | 'usuarios';
type Row = EstacionamentoResumo | Sensor | Usuario;
type Form = Record<string, string>;
const labels = {
  estacionamentos: [
    'Estacionamentos',
    'estacionamento',
    'Organize os espaços e os acessos do seu campus.',
  ],
  sensores: ['Sensores', 'sensor', 'Cada leitura conecta uma vaga a uma decisão melhor.'],
  usuarios: ['Usuários', 'usuário', 'As pessoas que fazem parte do seu campus.'],
};
const defaults: Record<Resource, Form> = {
  estacionamentos: {
    nome: '',
    descricao: '',
    latitude: '-22.327',
    longitude: '-49.054',
    largura: '780',
    altura: '680',
  },
  sensores: { nome: '', vagaId: '' },
  usuarios: { nome: '', email: '', role: 'USER', senha: '' },
};
export function ManagementPage({ resource }: { resource: Resource }) {
  const client = useQueryClient();
  const lots = useLots();
  const query = useQuery({
    queryKey: ['management', resource],
    queryFn: () => api<Row[]>(`/${resource}`),
    refetchInterval: resource === 'sensores' ? 3000 : false,
  });
  const details = useQuery({
    queryKey: ['all-layouts', lots.data?.map((l) => l.id).join('|')],
    queryFn: () =>
      Promise.all(
        (lots.data ?? []).map((l) => api<DetalheEstacionamento>(`/estacionamentos/${l.id}`)),
      ),
    enabled: resource === 'sensores' && Boolean(lots.data),
  });
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [form, setForm] = useState<Form>(defaults[resource]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState('');
  const [search, setSearch] = useState('');
  const [title, singular, description] = labels[resource];
  function edit(row?: Row) {
    setForm(
      row
        ? {
            ...defaults[resource],
            ...Object.fromEntries(
              Object.entries(row)
                .filter(([, v]) => typeof v !== 'object' && v !== undefined)
                .map(([k, v]) => [k, String(v)]),
            ),
            senha: '',
          }
        : { ...defaults[resource] },
    );
    setErrors({});
    setEditing(row ?? 'new');
  }
  async function refresh() {
    await client.invalidateQueries();
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (form.nome.trim().length < 2) next.nome = 'Use pelo menos 2 caracteres.';
    if (resource === 'usuarios') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Informe um e-mail válido.';
      if (
        (editing === 'new' || form.senha) &&
        (form.senha.length < 8 ||
          !/[A-Z]/.test(form.senha) ||
          !/[a-z]/.test(form.senha) ||
          !/\d/.test(form.senha))
      )
        next.senha = 'Use 8 caracteres, maiúscula, minúscula e número.';
    }
    if (resource === 'estacionamentos')
      for (const name of ['latitude', 'longitude', 'largura', 'altura'])
        if (!form[name] || !Number.isFinite(Number(form[name])))
          next[name] = 'Informe um número válido.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const payload =
        resource === 'estacionamentos'
          ? {
              ...form,
              latitude: Number(form.latitude),
              longitude: Number(form.longitude),
              largura: Number(form.largura),
              altura: Number(form.altura),
            }
          : form;
      const result = await api<Row & { deviceKey?: string }>(
        `/${resource}${editing && editing !== 'new' ? `/${editing.id}` : ''}`,
        { method: editing === 'new' ? 'POST' : 'PUT', body: json(payload) },
      );
      setEditing(null);
      toast.success(`${singular[0].toUpperCase() + singular.slice(1)} salvo com sucesso.`);
      if (result.deviceKey) setKey(result.deviceKey);
      await refresh();
    } catch (e) {
      setErrors({ ...(e instanceof ApiError ? e.details.campos : {}), geral: mensagemErro(e) });
      toast.error(mensagemErro(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/${resource}/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      toast.success(`${singular} removido.`);
      await refresh();
    } catch (e) {
      toast.error(mensagemErro(e));
    } finally {
      setBusy(false);
    }
  }
  function field(name: string, label: string, type = 'text') {
    return (
      <Field key={name} label={label} error={errors[name]}>
        <Input
          name={name}
          type={type}
          step={type === 'number' ? 'any' : undefined}
          value={form[name] ?? ''}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          autoComplete={name === 'senha' ? 'new-password' : undefined}
          aria-invalid={Boolean(errors[name])}
        />
      </Field>
    );
  }
  const rows =
    query.data?.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())) ??
    [];
  const vagas = details.data?.flatMap((l) => l.vagas.map((v) => ({ ...v, lotName: l.nome }))) ?? [];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">GERENCIAMENTO DO CAMPUS</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <Button onClick={() => edit()}>
          <Plus size={17} />
          {resource === 'usuarios' ? 'Convidar usuário' : `Novo ${singular}`}
        </Button>
      </div>
      <Card className="management-card">
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={16} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={`Buscar ${singular}`}
              placeholder={`Buscar ${singular}…`}
            />
          </div>
          <span className="muted">{rows.length} registros</span>
          {resource === 'sensores' && <LiveDot />}
        </div>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState retry={() => void query.refetch()} />
        ) : !rows.length ? (
          <EmptyState
            title={`Nenhum ${singular} encontrado`}
            description={`Cadastre o primeiro ${singular} ou ajuste sua busca.`}
          >
            <Button onClick={() => edit()}>
              <Plus size={16} />
              Cadastrar {singular}
            </Button>
          </EmptyState>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  {resource === 'estacionamentos' ? (
                    <>
                      <th>Vagas livres</th>
                      <th>Capacidade</th>
                      <th>Layout</th>
                    </>
                  ) : resource === 'sensores' ? (
                    <>
                      <th>Vaga vinculada</th>
                      <th>Última leitura</th>
                      <th>Status</th>
                    </>
                  ) : (
                    <>
                      <th>E-mail</th>
                      <th>Perfil</th>
                    </>
                  )}
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="table-name">
                        <span className="table-icon">
                          {resource === 'estacionamentos' ? (
                            <Map size={17} />
                          ) : resource === 'sensores' ? (
                            <Radio size={17} />
                          ) : (
                            <Users size={17} />
                          )}
                        </span>
                        <strong>{row.nome}</strong>
                      </div>
                    </td>
                    {'totalVagas' in row ? (
                      <>
                        <td className="mono green-text">{row.vagasLivres}</td>
                        <td className="mono">{row.totalVagas}</td>
                        <td>
                          <Link className="table-link" to={`/admin/editor/${row.id}`}>
                            Editar layout <Edit3 size={13} />
                          </Link>
                        </td>
                      </>
                    ) : 'empresaId' in row && 'role' in row ? (
                      <>
                        <td>{row.email}</td>
                        <td>
                          <Badge>{row.role === 'ADMIN' ? 'Administrador' : 'Usuário'}</Badge>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          {vagas.find((v) => v.id === (row as Sensor).vagaId)?.rotulo ??
                            'Não vinculado'}
                        </td>
                        <td>{tempoDesde((row as Sensor).ultimoSinalEm)}</td>
                        <td>
                          <Badge
                            className={
                              (row as Sensor).ultimoSinalEm &&
                              Date.now() - Date.parse((row as Sensor).ultimoSinalEm!) <= 60000
                                ? 'badge-green'
                                : 'badge-red'
                            }
                          >
                            {(row as Sensor).ultimoSinalEm &&
                            Date.now() - Date.parse((row as Sensor).ultimoSinalEm!) <= 60000
                              ? 'Conectado'
                              : 'Sem sinal'}
                          </Badge>
                        </td>
                      </>
                    )}
                    <td>
                      <div className="table-actions">
                        <Button
                          variant="ghost"
                          aria-label={`Editar ${row.nome}`}
                          onClick={() => edit(row)}
                        >
                          <Edit3 size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          aria-label={`Excluir ${row.nome}`}
                          onClick={() => setDeleting(row)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title={`${editing === 'new' ? 'Novo' : 'Editar'} ${singular}`}
        description={
          resource === 'usuarios'
            ? 'A senha inicial será informada ao usuário pelo administrador.'
            : 'Preencha os dados para salvar.'
        }
        wide={resource === 'estacionamentos'}
      >
        <form onSubmit={save} noValidate className="form-stack">
          {field('nome', resource === 'usuarios' ? 'Nome completo' : 'Nome')}
          {resource === 'estacionamentos' && (
            <>
              {field('descricao', 'Descrição')}
              <CampusMap
                point={[Number(form.latitude) || -22.327, Number(form.longitude) || -49.054]}
                onPick={(latitude, longitude) =>
                  setForm((old) => ({
                    ...old,
                    latitude: latitude.toFixed(6),
                    longitude: longitude.toFixed(6),
                  }))
                }
              />
              <div className="form-grid">
                {field('latitude', 'Latitude', 'number')}
                {field('longitude', 'Longitude', 'number')}
                {field('largura', 'Largura do canvas', 'number')}
                {field('altura', 'Altura do canvas', 'number')}
              </div>
            </>
          )}
          {resource === 'usuarios' && (
            <>
              {field('email', 'E-mail', 'email')}
              <Field label="Perfil">
                <Select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="USER">Usuário</option>
                  <option value="ADMIN">Administrador</option>
                </Select>
              </Field>
              {field(
                'senha',
                editing === 'new' ? 'Senha inicial' : 'Nova senha (opcional)',
                'password',
              )}
            </>
          )}
          {resource === 'sensores' && (
            <Field label="Vaga vinculada">
              <Select
                value={form.vagaId ?? ''}
                onChange={(e) => setForm({ ...form, vagaId: e.target.value })}
              >
                <option value="">Não vincular agora</option>
                {vagas
                  .filter(
                    (v) =>
                      !v.sensorId || (editing !== 'new' && editing && v.sensorId === editing.id),
                  )
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.lotName} · {v.rotulo}
                    </option>
                  ))}
              </Select>
            </Field>
          )}
          {errors.geral && (
            <p role="alert" className="form-error">
              {errors.geral}
            </p>
          )}
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button disabled={busy} type="submit">
              {busy ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={`Excluir ${singular}?`}
        description={`“${deleting?.nome}” será removido. Esta ação não pode ser desfeita.`}
      >
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Cancelar
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => void remove()}>
            {busy ? 'Excluindo…' : 'Confirmar exclusão'}
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={Boolean(key)}
        onOpenChange={(open) => {
          if (!open) setKey('');
        }}
        title="Chave do dispositivo"
        description="Esta chave de demonstração aparece uma única vez. Copie antes de fechar."
      >
        <code className="device-key">{key}</code>
        <div className="modal-actions">
          <Button
            variant="secondary"
            onClick={() =>
              void navigator.clipboard
                .writeText(key)
                .then(() => toast.success('Chave copiada.'))
                .catch(() => toast.error('Selecione e copie a chave manualmente.'))
            }
          >
            <Copy size={16} />
            Copiar
          </Button>
          <Button onClick={() => setKey('')}>Guardei a chave</Button>
        </div>
      </Dialog>
    </>
  );
}
