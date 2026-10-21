import { delay, http, HttpResponse } from 'msw';
import { API_URL } from '../lib/api';
import { gerarGrid, ocupacao, tendencia } from '../lib/utils';
import type {
  DetalheEstacionamento,
  EstacionamentoResumo,
  GridOptions,
  Layout,
  Role,
  Usuario,
  Vaga,
} from '../types';
import { heatmap, persist, store } from './seed';

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
function email(body: Body, exceptId?: string) {
  const value = text(body, 'email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    throw new MockError(422, 'E-mail inválido.', { email: 'Informe um e-mail válido.' });
  if (store.usuarios.some((u) => u.email === value && u.id !== exceptId))
    throw new MockError(409, 'Este e-mail já está cadastrado.', { email: 'E-mail já cadastrado.' });
  return value;
}
function password(body: Body) {
  const value = text(body, 'senha', 8);
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value))
    throw new MockError(422, 'Use uma senha com minúscula, maiúscula e número.', {
      senha: 'Senha fraca.',
    });
  return value;
}
function publicUser(user: Usuario): Usuario {
  return {
    id: user.id,
    empresaId: user.empresaId,
    nome: user.nome,
    email: user.email,
    role: user.role,
  };
}
function authenticated(request: Request, admin = false): Usuario {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const user = store.usuarios.find((u) => token && u.id === store.sessoes[token]);
  if (!user) throw new MockError(401, 'Sua sessão expirou. Entre novamente.');
  if (admin && user.role !== 'ADMIN')
    throw new MockError(403, 'Acesso exclusivo para administradores.');
  return publicUser(user);
}
function getLot(id: string, user: Usuario): DetalheEstacionamento {
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
function validateLayout(layout: Layout, lot: DetalheEstacionamento, user: Usuario) {
  if (!Array.isArray(layout.vagas) || !Array.isArray(layout.elementos))
    throw new MockError(422, 'Layout inválido.');
  const labels = new Set<string>();
  const ids = new Set<string>();
  const sensors = new Set<string>();
  for (const v of layout.vagas) {
    if (!v.rotulo?.trim() || labels.has(v.rotulo.trim().toUpperCase()))
      throw new MockError(422, 'Use rótulos únicos e não vazios.');
    labels.add(v.rotulo.trim().toUpperCase());
    if (
      !v.id ||
      ids.has(v.id) ||
      !['COMUM', 'PCD', 'MOTO'].includes(v.tipo) ||
      ![v.x, v.y, v.largura, v.altura, v.rotacao].every(Number.isFinite) ||
      v.largura < 20 ||
      v.altura < 20 ||
      v.estacionamentoId !== lot.id
    )
      throw new MockError(422, 'Uma vaga possui dimensões ou dados inválidos.');
    ids.add(v.id);
    if (v.sensorId) {
      const s = store.sensores.find((s) => s.id === v.sensorId && s.empresaId === user.empresaId);
      if (!s || sensors.has(s.id) || (s.vagaId && !lot.vagas.some((old) => old.id === s.vagaId)))
        throw new MockError(422, 'Sensor indisponível ou vinculado em outro estacionamento.');
      sensors.add(s.id);
    }
  }
  for (const e of layout.elementos) {
    if (
      !e.id ||
      ids.has(e.id) ||
      e.estacionamentoId !== lot.id ||
      !['VIA', 'ENTRADA', 'SAIDA', 'TEXTO'].includes(e.tipo) ||
      ![e.x, e.y, e.largura, e.altura, e.rotacao].every(Number.isFinite) ||
      e.largura <= 0 ||
      e.altura <= 0
    )
      throw new MockError(422, 'Um elemento decorativo é inválido.');
    ids.add(e.id);
  }
}
function saveLayout(lot: DetalheEstacionamento, layout: Layout) {
  const oldIds = new Set(lot.vagas.map((v) => v.id));
  store.status = store.status.filter(
    (s) => !oldIds.has(s.vagaId) || layout.vagas.some((v) => v.id === s.vagaId),
  );
  store.sensores
    .filter((s) => s.vagaId && oldIds.has(s.vagaId))
    .forEach((s) => {
      s.vagaId = undefined;
    });
  lot.vagas = layout.vagas;
  lot.elementos = layout.elementos;
  for (const v of layout.vagas) {
    if (!store.status.some((s) => s.vagaId === v.id))
      store.status.push({
        vagaId: v.id,
        status: 'SEM_SINAL',
        atualizadoEm: new Date().toISOString(),
      });
    const sensor = store.sensores.find((s) => s.id === v.sensorId);
    if (sensor) sensor.vagaId = v.id;
  }
}
function role(body: Body): Role {
  if (body.role !== 'USER' && body.role !== 'ADMIN') throw new MockError(422, 'Perfil inválido.');
  return body.role;
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
      if (resource === 'auth' && id === 'login' && method === 'POST') {
        const user = store.usuarios.find(
          (u) => u.email === String(body.email).toLowerCase() && u.senha === body.senha,
        );
        if (!user) throw new MockError(401, 'E-mail ou senha incorretos.');
        const token = crypto.randomUUID();
        store.sessoes[token] = user.id;
        result = { token, usuario: publicUser(user) };
      } else if (resource === 'auth' && id === 'cadastro-empresa' && method === 'POST') {
        const nomeEmpresa = text(body, 'nomeEmpresa', 2);
        const nome = text(body, 'nome', 2);
        const userEmail = email(body);
        const senha = password(body);
        const empresa = { id: crypto.randomUUID(), nome: nomeEmpresa };
        const user = {
          id: crypto.randomUUID(),
          empresaId: empresa.id,
          nome,
          email: userEmail,
          role: 'ADMIN' as const,
          senha,
        };
        store.empresas.push(empresa);
        store.usuarios.push(user);
        const token = crypto.randomUUID();
        store.sessoes[token] = user.id;
        result = { token, usuario: publicUser(user) };
      } else {
        const user = authenticated(request);
        const admin = () => authenticated(request, true);
        if (resource === 'auth' && id === 'me' && method === 'GET') result = user;
        else if (resource === 'estacionamentos') {
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
            } else if (action === 'layout-padrao' && method === 'POST') {
              admin();
              const options: GridOptions = {
                linhas: Number(body.linhas),
                colunas: Number(body.colunas),
                largura: num(body, 'largura', 53, 20, 300),
                altura: num(body, 'altura', 86, 20, 300),
                espacamento: num(body, 'espacamento', 10, 0, 200),
              };
              const vagas = gerarGrid(id, options);
              if (vagas.some((v) => v.x + v.largura > lot.largura || v.y + v.altura > lot.altura))
                throw new MockError(422, 'O grid não cabe no tamanho do estacionamento.');
              saveLayout(lot, { vagas, elementos: [] });
              result = lot;
            } else if (action === 'layout' && method === 'PUT') {
              admin();
              const layout = body as unknown as Layout;
              validateLayout(layout, lot, user);
              saveLayout(lot, layout);
              result = lot;
            } else if (!action && method === 'PUT') {
              admin();
              Object.assign(lot, {
                nome: text(body, 'nome', 2),
                descricao: String(body.descricao ?? ''),
                latitude: num(body, 'latitude', lot.latitude, -90, 90),
                longitude: num(body, 'longitude', lot.longitude, -180, 180),
                largura: num(body, 'largura', lot.largura, 200, 10000),
                altura: num(body, 'altura', lot.altura, 200, 10000),
              });
              result = lot;
            } else if (!action && method === 'DELETE') {
              admin();
              saveLayout(lot, { vagas: [], elementos: [] });
              store.estacionamentos = store.estacionamentos.filter((l) => l.id !== id);
              delete store.historico[id];
              Object.keys(store.favoritos).forEach((key) => {
                store.favoritos[key] = store.favoritos[key].filter((f) => f !== id);
              });
              result = null;
            }
          }
        } else if (resource === 'favoritos') {
          const favorites = store.favoritos[user.id] ?? [];
          if (method === 'GET') result = favorites;
          else if (method === 'POST' || method === 'DELETE') {
            const lotId = text(body, 'estacionamentoId');
            getLot(lotId, user);
            store.favoritos[user.id] =
              method === 'POST'
                ? [...new Set([...favorites, lotId])]
                : favorites.filter((f) => f !== lotId);
            result = store.favoritos[user.id];
          }
        } else if (resource === 'usuarios') {
          admin();
          if (method === 'GET' && !id)
            result = store.usuarios.filter((u) => u.empresaId === user.empresaId).map(publicUser);
          else if (method === 'POST' && !id) {
            const newUser = {
              id: crypto.randomUUID(),
              empresaId: user.empresaId,
              nome: text(body, 'nome', 2),
              email: email(body),
              role: role(body),
              senha: password(body),
            };
            store.usuarios.push(newUser);
            result = publicUser(newUser);
          } else if (id) {
            const target = store.usuarios.find(
              (u) => u.id === id && u.empresaId === user.empresaId,
            );
            if (!target) throw new MockError(404, 'Usuário não encontrado.');
            if (target.id === user.id && (method === 'DELETE' || body.role === 'USER'))
              throw new MockError(
                422,
                'Você não pode remover seu próprio acesso de administrador.',
              );
            if (method === 'PUT') {
              const changes = {
                nome: text(body, 'nome', 2),
                email: email(body, id),
                role: role(body),
                senha: body.senha ? password(body) : target.senha,
              };
              Object.assign(target, changes);
              result = publicUser(target);
            } else if (method === 'DELETE') {
              store.usuarios = store.usuarios.filter((u) => u.id !== id);
              delete store.favoritos[id];
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
  store.sensores.forEach((s) => {
    const current = store.status.find((v) => v.vagaId === s.vagaId);
    if (current && current.status !== 'SEM_SINAL') {
      s.ultimoSinalEm = new Date().toISOString();
      current.atualizadoEm = s.ultimoSinalEm;
    }
  });
}
