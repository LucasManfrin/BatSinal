import { delay, http, HttpResponse } from 'msw';
import { API_URL } from '../lib/api';
import { ocupacao, tendencia } from '../lib/utils';
import type {
  DetalheEstacionamento,
  Estacionamento,
  EstacionamentoResumo,
  Vaga,
  ConsultaCampus,
} from '../types';
import { heatmap, persist, store } from './seed';
import { slugValido } from '../lib/slug';
type ScopedCompany = { id: string; empresaId: string };

class MockError extends Error {
  constructor(
    public status: number,
    mensagem: string,
    public campos?: Record<string, string>,
  ) {
    super(mensagem);
  }
}
type Body = Record<string, unknown>;
function text(body: Body, key: string, min = 1) {
  const value = typeof body[key] === 'string' ? (body[key] as string).trim() : '';
  if (value.length < min)
    throw new MockError(422, 'Confira os campos informados.', {
      [key]: `Informe pelo menos ${min} caracteres.`,
    });
  return value;
}
function num(body: Body, key: string, fallback: number, min: number, max: number) {
  const value = body[key] === undefined ? fallback : Number(body[key]);
  if (!Number.isFinite(value) || value < min || value > max)
    throw new MockError(422, 'Confira os campos numéricos.', {
      [key]: `Use um número entre ${min} e ${max}.`,
    });
  return value;
}
function accessFields(body: Body, existing?: Estacionamento) {
  function optionalText(key: 'portao' | 'caminhadaDestino') {
    if (body[key] === undefined) return existing?.[key];
    if (body[key] === null || body[key] === '') return undefined;
    if (typeof body[key] !== 'string' || (body[key] as string).length > 100)
      throw new MockError(422, 'Confira os dados de acesso.', { [key]: 'Use até 100 caracteres.' });
    return (body[key] as string).trim() || undefined;
  }
  const portao = optionalText('portao');
  const caminhadaDestino = optionalText('caminhadaDestino');
  const raw = body.caminhadaMinutos;
  const caminhadaMinutos =
    raw === undefined
      ? existing?.caminhadaMinutos
      : raw === null || raw === ''
        ? undefined
        : Number(raw);
  if (
    caminhadaMinutos !== undefined &&
    (!Number.isInteger(caminhadaMinutos) || caminhadaMinutos < 1 || caminhadaMinutos > 120)
  )
    throw new MockError(422, 'Confira o tempo de caminhada.', {
      caminhadaMinutos: 'Use minutos inteiros entre 1 e 120.',
    });
  if (Boolean(caminhadaDestino) !== (caminhadaMinutos !== undefined))
    throw new MockError(422, 'Informe destino e tempo de caminhada juntos.', {
      caminhadaDestino: 'Preencha o destino e os minutos, ou deixe ambos vazios.',
    });
  return { portao, caminhadaDestino, caminhadaMinutos };
}
function email(body: Body, exceptId?: string) {
  const value = text(body, 'email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    throw new MockError(422, 'E-mail inválido.', { email: 'Informe um e-mail válido.' });
  if (Object.entries(store.contas).some(([id, u]) => u.email === value && id !== exceptId))
    throw new MockError(409, 'Este e-mail já está cadastrado.', { email: 'E-mail já cadastrado.' });
  return value;
}
function password(body: Body) {
  const value = text(body, 'senha', 8);
  return value;
}
function account(empresaId: string) {
  const company = store.empresas.find((e) => e.id === empresaId)!;
  return { ...company, email: store.contas[empresaId].email };
}
function authenticated(request: Request): ScopedCompany {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const id = token && store.sessoes[token];
  if (!id || !store.contas[id] || !store.empresas.some((e) => e.id === id))
    throw new MockError(401, 'Entre na conta da empresa para continuar.');
  return { id, empresaId: id };
}
function availableSlug(body: Body, exceptId?: string) {
  const slug = text(body, 'slug', 3);
  if (!slugValido(slug))
    throw new MockError(422, 'Confira o endereço do mapa.', {
      slug: 'Use de 3 a 60 letras minúsculas, números e hífens.',
    });
  if (store.empresas.some((e) => e.slug === slug && e.id !== exceptId))
    throw new MockError(409, 'Este endereço já está em uso.', {
      slug: 'Escolha outro endereço para o mapa.',
    });
  return slug;
}
function getLot(id: string, user: ScopedCompany): DetalheEstacionamento {
  const lot = store.estacionamentos.find((l) => l.id === id && l.empresaId === user.empresaId);
  if (!lot) throw new MockError(404, 'Estacionamento não encontrado.');
  return lot;
}
function lotStatus(lot: DetalheEstacionamento) {
  return lot.vagas.map((v) => {
    const status = store.status.find((s) => s.vagaId === v.id);
    const sensor = store.sensores.find((s) => s.vagaId === v.id);
    const offline = !sensor?.ultimoSinalEm || Date.now() - Date.parse(sensor.ultimoSinalEm) > 60000;
    return {
      vagaId: v.id,
      status: offline ? ('SEM_SINAL' as const) : (status?.status ?? ('SEM_SINAL' as const)),
      atualizadoEm: sensor?.ultimoSinalEm ?? status?.atualizadoEm ?? new Date().toISOString(),
    };
  });
}
function resumo(lot: DetalheEstacionamento): EstacionamentoResumo {
  const statuses = lotStatus(lot);
  const vagasLivres = statuses.filter((s) => s.status === 'LIVRE').length;
  const before =
    store.historico[lot.id]?.filter((p) => Date.parse(p.instante) <= Date.now() - 15 * 60000).at(-1)
      ?.livres ?? vagasLivres;
  return {
    ...lot,
    totalVagas: lot.vagas.length,
    vagasLivres,
    tendencia: tendencia(before, vagasLivres),
    livresPorTipo: {
      COMUM: lot.vagas.filter(
        (v) =>
          v.tipo === 'COMUM' && statuses.some((s) => s.vagaId === v.id && s.status === 'LIVRE'),
      ).length,
      PCD: lot.vagas.filter(
        (v) => v.tipo === 'PCD' && statuses.some((s) => s.vagaId === v.id && s.status === 'LIVRE'),
      ).length,
      MOTO: lot.vagas.filter(
        (v) => v.tipo === 'MOTO' && statuses.some((s) => s.vagaId === v.id && s.status === 'LIVRE'),
      ).length,
    },
  };
}
function publicLot(lot: DetalheEstacionamento, summary = false) {
  const { vagas, elementos, ...base } = lot;
  if (summary) {
    const { totalVagas, vagasLivres, tendencia, livresPorTipo } = resumo(lot);
    return { ...base, totalVagas, vagasLivres, tendencia, livresPorTipo };
  }
  return {
    ...base,
    elementos,
    vagas: vagas.map(({ id, estacionamentoId, rotulo, tipo, x, y, largura, altura, rotacao }) => ({
      id,
      estacionamentoId,
      rotulo,
      tipo,
      x,
      y,
      largura,
      altura,
      rotacao,
    })),
  };
}
function publicCampus(empresaId: string): ConsultaCampus {
  const mapa = store.mapas?.[empresaId] ?? null;
  const lots = store.estacionamentos.filter((lot) => lot.empresaId === empresaId);
  const slots = new Map(lots.flatMap((lot) => lot.vagas).map((v) => [v.id, v]));
  const statuses = new Map(lots.flatMap(lotStatus).map((s) => [s.vagaId, s]));
  const vagas = (mapa?.posicoes ?? []).flatMap((position) => {
    const slot = slots.get(position.vagaId);
    if (!slot) return [];
    return [
      {
        id: slot.id,
        rotulo: slot.rotulo,
        tipo: slot.tipo,
        status: statuses.get(slot.id)!.status,
        atualizadoEm: statuses.get(slot.id)!.atualizadoEm,
        areaId: position.areaId,
        ponto: position.ponto,
        rotacao: position.rotacao,
      },
    ];
  });
  return { mapa, vagas, vagasSemPosicao: slots.size - vagas.length };
}
export const handlers = [
  http.all(`${API_URL}/*`, async ({ request }) => {
    await delay(140);
    try {
      const url = new URL(request.url);
      const path = url.pathname.slice(new URL(API_URL).pathname.length).split('/').filter(Boolean);
      const method = request.method;
      const body =
        ['POST', 'PUT', 'DELETE'].includes(method) && request.headers.get('content-length') !== '0'
          ? ((await request.json().catch(() => ({}))) as Body)
          : {};
      const [resource, id, action] = path;
      let result: unknown;
      if (resource === 'publico') {
        if (method !== 'GET') throw new MockError(405, 'Consulta pública permite somente leitura.');
        if (id !== 'campi') throw new MockError(404, 'Rota não encontrada.');
        if (!action) result = store.empresas.map(({ id, nome, slug }) => ({ id, nome, slug }));
        else {
          const empresa = store.empresas.find((e) => e.slug === action);
          if (!empresa) throw new MockError(404, 'Campus não encontrado.');
          const [, , , collection, lotId, detail] = path;
          if (collection === 'mapa' && path.length === 4) result = publicCampus(empresa.id);
          else if (collection !== 'estacionamentos')
            throw new MockError(404, 'Rota não encontrada.');
          else if (!lotId)
            result = store.estacionamentos
              .filter((l) => l.empresaId === empresa.id)
              .map((l) => publicLot(l, true));
          else {
            const lot = store.estacionamentos.find(
              (l) => l.id === lotId && l.empresaId === empresa.id,
            );
            if (!lot) throw new MockError(404, 'Estacionamento não encontrado.');
            if (!detail) result = publicLot(lot);
            else if (detail === 'status' && path.length === 6) result = lotStatus(lot);
            else throw new MockError(404, 'Rota não encontrada.');
          }
        }
      } else if (resource === 'public') {
        if (method !== 'GET')
          throw new MockError(405, 'A consulta pública permite apenas leitura.');
        if (id === 'slugs' && path[3] === 'disponivel' && path.length === 4) {
          result = {
            slug: action,
            disponivel: slugValido(action ?? '') && !store.empresas.some((e) => e.slug === action),
          };
        } else if (id === 'empresas' && !action) result = store.empresas;
        else if (id === 'empresas') {
          const company = store.empresas.find((e) => e.slug === action);
          if (!company) throw new MockError(404, 'Campus não encontrado.');
          if (path.length === 3) result = { ...publicCampus(company.id), empresa: company };
          else if (path[3] === 'estacionamentos' && path.length === 4)
            result = store.estacionamentos
              .filter((l) => l.empresaId === company.id)
              .map((l) => publicLot(l, true));
          else throw new MockError(404, 'Rota não encontrada.');
        } else if (id === 'estacionamentos') {
          const lot = store.estacionamentos.find((l) => l.id === action);
          if (!lot) throw new MockError(404, 'Estacionamento não encontrado.');
          if (path.length === 3) result = publicLot(lot);
          else if (path[3] === 'status' && path.length === 4) result = lotStatus(lot);
          else throw new MockError(404, 'Rota não encontrada.');
        } else throw new MockError(404, 'Rota não encontrada.');
      } else if (resource === 'auth' && id === 'login' && method === 'POST') {
        const entry = Object.entries(store.contas).find(
          ([, c]) => c.email === String(body.email).toLowerCase() && c.senha === body.senha,
        );
        if (!entry) throw new MockError(401, 'E-mail ou senha incorretos.');
        const token = crypto.randomUUID();
        store.sessoes[token] = entry[0];
        result = { token, empresa: account(entry[0]) };
      } else if (resource === 'auth' && id === 'cadastro-empresa' && method === 'POST') {
        const nome = text(body, 'nome', 2);
        const slug = availableSlug(body);
        const userEmail = email(body);
        const senha = password(body);
        const empresa = { id: crypto.randomUUID(), nome, slug };
        store.empresas.push(empresa);
        store.contas[empresa.id] = { email: userEmail, senha };
        const token = crypto.randomUUID();
        store.sessoes[token] = empresa.id;
        result = { token, empresa: account(empresa.id) };
      } else {
        const user = authenticated(request);
        const admin = () => authenticated(request);
        if (resource === 'auth' && id === 'me' && method === 'GET') result = account(user.id);
        else if (resource === 'empresa' && id === 'senha' && method === 'PUT') {
          if (body.senhaAtual !== store.contas[user.id].senha)
            throw new MockError(422, 'A senha atual não confere.');
          store.contas[user.id].senha = password({ senha: body.novaSenha });
          const currentToken = request.headers.get('Authorization')?.replace('Bearer ', '');
          store.sessoes = Object.fromEntries(
            Object.entries(store.sessoes).filter(
              ([token, empresaId]) => empresaId !== user.id || token === currentToken,
            ),
          );
          result = null;
        } else if (resource === 'empresa' && !id) {
          if (method === 'PUT') {
            const nome = text(body, 'nome', 2);
            const slug = availableSlug(body, user.id);
            Object.assign(
              store.empresas.find((e) => e.id === user.id)!,
              { nome, slug },
            );
          } else if (method !== 'GET') throw new MockError(405, 'Método não permitido.');
          result = account(user.id);
        } else if (resource === 'estacionamentos') {
          if (!id) {
            if (method === 'GET')
              result = store.estacionamentos
                .filter((l) => l.empresaId === user.empresaId)
                .map(resumo);
            else if (method === 'POST') {
              admin();
              const lot: DetalheEstacionamento = {
                id: crypto.randomUUID(),
                empresaId: user.empresaId,
                nome: text(body, 'nome', 2),
                descricao: String(body.descricao ?? ''),
                ...accessFields(body),
                latitude: num(body, 'latitude', -22.327, -90, 90),
                longitude: num(body, 'longitude', -49.054, -180, 180),
                largura: num(body, 'largura', 780, 200, 10000),
                altura: num(body, 'altura', 680, 200, 10000),
                vagas: [],
                elementos: [],
              };
              store.estacionamentos.push(lot);
              store.historico[lot.id] = [];
              result = lot;
            }
          } else {
            const lot = getLot(id, user);
            if (!action && method === 'GET') result = lot;
            else if (action === 'status' && method === 'GET') result = lotStatus(lot);
            else if (action === 'ocupacao' && method === 'GET') {
              admin();
              const de = Date.parse(
                url.searchParams.get('de') ?? new Date(Date.now() - 86400000).toISOString(),
              );
              const ate = Date.parse(url.searchParams.get('ate') ?? new Date().toISOString());
              const gran = url.searchParams.get('granularidade') ?? 'hora';
              if (
                !Number.isFinite(de) ||
                !Number.isFinite(ate) ||
                de > ate ||
                !['hora', 'dia', '30min'].includes(gran)
              )
                throw new MockError(422, 'Período ou granularidade inválido.');
              const buckets = new Map<
                string,
                { sum: number; livres: number; n: number; instante: string }
              >();
              for (const p of store.historico[id] ?? []) {
                const t = Date.parse(p.instante);
                if (t < de || t > ate) continue;
                const step = gran === 'dia' ? 86400000 : gran === 'hora' ? 3600000 : 1800000;
                const key = String(Math.floor(t / step));
                const b = buckets.get(key) ?? {
                  sum: 0,
                  livres: 0,
                  n: 0,
                  instante: new Date(Math.floor(t / step) * step).toISOString(),
                };
                b.sum += p.ocupacao;
                b.livres += p.livres;
                b.n++;
                buckets.set(key, b);
              }
              result = [...buckets.values()].map((b) => ({
                instante: b.instante,
                ocupacao: Math.round(b.sum / b.n),
                livres: Math.round(b.livres / b.n),
              }));
            } else if (action === 'heatmap' && method === 'GET') {
              admin();
              result = heatmap(id);
            } else if (!action && method === 'PUT') {
              admin();
              Object.assign(lot, {
                nome: text(body, 'nome', 2),
                descricao: String(body.descricao ?? ''),
                ...accessFields(body, lot),
                latitude: num(body, 'latitude', lot.latitude, -90, 90),
                longitude: num(body, 'longitude', lot.longitude, -180, 180),
                largura: num(body, 'largura', lot.largura, 200, 10000),
                altura: num(body, 'altura', lot.altura, 200, 10000),
              });
              result = lot;
            } else if (!action && method === 'DELETE') {
              admin();
              const ids = new Set(lot.vagas.map((v) => v.id));
              store.sensores.forEach((sensor) => {
                if (sensor.vagaId && ids.has(sensor.vagaId)) sensor.vagaId = undefined;
              });
              store.status = store.status.filter((s) => !ids.has(s.vagaId));
              store.estacionamentos = store.estacionamentos.filter((l) => l.id !== id);
              delete store.historico[id];
              result = null;
            }
          }
        } else if (resource === 'sensores') {
          admin();
          if (method === 'GET' && !id)
            result = store.sensores.filter((s) => s.empresaId === user.empresaId);
          else if (method === 'POST' || (method === 'PUT' && id)) {
            const sensor = id
              ? store.sensores.find((s) => s.id === id && s.empresaId === user.empresaId)
              : {
                  id: crypto.randomUUID(),
                  empresaId: user.empresaId,
                  nome: '',
                  vagaId: undefined as string | undefined,
                  ultimoSinalEm: undefined as string | undefined,
                };
            if (!sensor) throw new MockError(404, 'Sensor não encontrado.');
            const nome = text(body, 'nome', 2);
            const vagaId = typeof body.vagaId === 'string' && body.vagaId ? body.vagaId : undefined;
            let vaga: Vaga | undefined;
            if (vagaId) {
              vaga = store.estacionamentos
                .filter((l) => l.empresaId === user.empresaId)
                .flatMap((l) => l.vagas)
                .find((v) => v.id === vagaId);
              if (!vaga || store.sensores.some((s) => s.vagaId === vagaId && s.id !== sensor.id))
                throw new MockError(422, 'Vaga inexistente ou já vinculada.');
            }
            store.estacionamentos
              .flatMap((l) => l.vagas)
              .filter((v) => v.sensorId === sensor.id)
              .forEach((v) => {
                v.sensorId = undefined;
              });
            Object.assign(sensor, { nome, vagaId });
            if (vaga) vaga.sensorId = sensor.id;
            if (!id) store.sensores.push(sensor);
            result = !id ? { ...sensor, deviceKey: `demo_${crypto.randomUUID()}` } : sensor;
          } else if (method === 'DELETE' && id) {
            const target = store.sensores.find(
              (s) => s.id === id && s.empresaId === user.empresaId,
            );
            if (!target) throw new MockError(404, 'Sensor não encontrado.');
            store.estacionamentos
              .flatMap((l) => l.vagas)
              .filter((v) => v.sensorId === id)
              .forEach((v) => {
                v.sensorId = undefined;
              });
            store.sensores = store.sensores.filter((s) => s.id !== id);
            result = null;
          }
        }
        if (result === undefined) throw new MockError(404, 'Rota não encontrada.');
      }
      if (method !== 'GET') persist();
      return new HttpResponse(JSON.stringify(result), {
        status: method === 'POST' ? 201 : 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      const e =
        error instanceof MockError
          ? error
          : new MockError(422, error instanceof Error ? error.message : 'Dados inválidos.');
      return HttpResponse.json(
        { status: e.status, mensagem: e.message, campos: e.campos },
        { status: e.status },
      );
    }
  }),
];

// Somente o simulador escreve no store. A interface real continua usando HTTP.
export function simulateStatus(vagaId: string, status: 'LIVRE' | 'OCUPADA' | 'SEM_SINAL') {
  const sensor = store.sensores.find((s) => s.vagaId === vagaId);
  if (!sensor) return;
  const current = store.status.find((s) => s.vagaId === vagaId);
  const now = new Date().toISOString();
  if (current) Object.assign(current, { status, atualizadoEm: now });
  sensor.ultimoSinalEm = status === 'SEM_SINAL' ? new Date(Date.now() - 61000).toISOString() : now;
  const lot = store.estacionamentos.find((l) => l.vagas.some((v) => v.id === vagaId));
  if (lot) {
    const r = resumo(lot);
    const points = store.historico[lot.id] ?? [];
    points.push({
      instante: now,
      ocupacao: ocupacao(r.totalVagas, r.vagasLivres),
      livres: r.vagasLivres,
    });
    store.historico[lot.id] = points.slice(-10000);
  }
  persist();
}
export function heartbeat() {
  store.sensores.forEach((s, index) => {
    const current = store.status.find((v) => v.vagaId === s.vagaId);
    if (current && current.status !== 'SEM_SINAL') {
      s.ultimoSinalEm = new Date(Date.now() - (2 + (index % 19)) * 1000).toISOString();
      current.atualizadoEm = s.ultimoSinalEm;
    }
  });
}
