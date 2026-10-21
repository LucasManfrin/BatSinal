import type { Ancora, AreaEstacionamento, TipoVaga, Vaga } from '../types';
import { progressoArea } from '../lib/positioning';
import { store } from './seed';
import { MockError } from './errors';
type Body = Record<string, unknown>;
const tipos: TipoVaga[] = ['COMUM', 'PCD', 'MOTO'];
function label(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || value.length > 100)
    throw new MockError(422, 'Informe um nome ou rótulo de até 100 caracteres.');
  return value.trim();
}
function slotType(value: unknown): TipoVaga {
  if (!tipos.includes(value as TipoVaga)) throw new MockError(422, 'Tipo de vaga inválido.');
  return value as TipoVaga;
}
export function ownArea(id: string, company: string) {
  const area = store.areas.find((a) => a.id === id && a.empresaId === company);
  if (!area) throw new MockError(404, 'Área não encontrada.');
  return area;
}
export function areaSlots(area: AreaEstacionamento) {
  return store.estacionamentos
    .find((l) => l.id === area.estacionamentoId)!
    .vagas.filter((v) => v.areaId === area.id);
}
export function areaSummary(area: AreaEstacionamento) {
  return {
    ...area,
    progresso: progressoArea(
      areaSlots(area),
      store.ancoras.filter((a) => a.areaId === area.id),
    ),
  };
}
function version(area: AreaEstacionamento, body: Body) {
  if (body.versao !== undefined && body.versao !== area.versao)
    throw new MockError(
      409,
      'Esta área mudou em outra janela. Atualize antes de tentar novamente.',
    );
}
function assign(area: AreaEstacionamento, positions: Map<string, string | undefined>) {
  const slots = areaSlots(area),
    anchors = store.ancoras.filter((a) => a.areaId === area.id),
    used = new Set<string>();
  if (positions.size !== slots.length || slots.some((v) => !positions.has(v.id)))
    throw new MockError(422, 'Informe todas as vagas desta área uma única vez.');
  for (const slot of slots) {
    const id = positions.get(slot.id);
    if (!id) continue;
    const a = anchors.find((a) => a.id === id);
    if (!a || !a.tiposAceitos.includes(slot.tipo) || used.has(id))
      throw new MockError(422, 'Posição incompatível, repetida ou fora desta área.');
    used.add(id);
  }
  // Valida a operação inteira antes de alterar qualquer peça (inclusive trocas e desfazer).
  slots.forEach((v) => {
    v.ancoraId = positions.get(v.id);
  });
  area.versao++;
}
export function changePosition(company: string, id: string, body: Body) {
  const slot = store.estacionamentos
    .filter((l) => l.empresaId === company)
    .flatMap((l) => l.vagas)
    .find((v) => v.id === id);
  if (!slot) throw new MockError(404, 'Vaga não encontrada.');
  const area = ownArea(slot.areaId, company);
  version(area, body);
  if (body.ancoraId !== null && typeof body.ancoraId !== 'string')
    throw new MockError(422, 'Informe a posição ou null para retirar a peça.');
  const positions = new Map(areaSlots(area).map((v) => [v.id, v.ancoraId]));
  const target = body.ancoraId as string | null;
  const displaced = target && areaSlots(area).find((v) => v.ancoraId === target && v.id !== id);
  if (displaced) positions.set(displaced.id, slot.ancoraId);
  positions.set(id, target || undefined);
  assign(area, positions);
  return area.id;
}
export function changeArea(
  company: string,
  method: string,
  id: string | undefined,
  action: string | undefined,
  body: Body,
) {
  if (method === 'POST' && !id) {
    const lot = store.estacionamentos.find(
      (l) => l.id === body.estacionamentoId && l.empresaId === company,
    );
    if (!lot) throw new MockError(404, 'Estacionamento não encontrado.');
    const area: AreaEstacionamento = {
      id: crypto.randomUUID(),
      empresaId: company,
      estacionamentoId: lot.id,
      nome: label(body.nome),
      contorno: [],
      versao: 1,
    };
    const raw = body.ancoras ?? [];
    if (!Array.isArray(raw) || raw.length > 2000)
      throw new MockError(422, 'Envie até 2000 posições mapeadas.');
    const anchors: Ancora[] = raw.map((value) => {
      if (!value || typeof value !== 'object')
        throw new MockError(422, 'Posição mapeada inválida.');
      const a = value as Record<string, unknown>;
      if (
        ['x', 'z', 'rotacao', 'largura', 'profundidade'].some(
          (k) => typeof a[k] !== 'number' || !Number.isFinite(a[k]),
        ) ||
        Number(a.largura) <= 0 ||
        Number(a.profundidade) <= 0 ||
        !Array.isArray(a.tiposAceitos) ||
        !a.tiposAceitos.length ||
        a.tiposAceitos.some((t) => !tipos.includes(t))
      )
        throw new MockError(422, 'Confira coordenadas, dimensões e tipos das posições mapeadas.');
      return {
        id: crypto.randomUUID(),
        areaId: area.id,
        x: Number(a.x),
        z: Number(a.z),
        rotacao: Number(a.rotacao),
        largura: Number(a.largura),
        profundidade: Number(a.profundidade),
        tiposAceitos: a.tiposAceitos as TipoVaga[],
      };
    });
    store.areas.push(area);
    store.ancoras.push(...anchors);
    return area;
  }
  if (!id) throw new MockError(404, 'Área não encontrada.');
  const area = ownArea(id, company);
  version(area, body);
  if (method === 'PUT' && action === 'posicoes') {
    if (!Array.isArray(body.posicoes)) throw new MockError(422, 'Informe as posições da área.');
    const positions = new Map<string, string | undefined>();
    for (const item of body.posicoes) {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof item.vagaId !== 'string' ||
        (item.ancoraId !== null && typeof item.ancoraId !== 'string') ||
        positions.has(item.vagaId)
      )
        throw new MockError(422, 'Lista de posições inválida.');
      positions.set(item.vagaId, item.ancoraId ?? undefined);
    }
    assign(area, positions);
    return area;
  }
  if (method === 'POST' && action === 'restaurar-padrao') {
    const anchors = store.ancoras.filter((a) => a.areaId === id);
    assign(
      area,
      new Map(areaSlots(area).map((v) => [v.id, anchors.find((a) => a.vagaPadraoId === v.id)?.id])),
    );
    return area;
  }
  if (method === 'PUT' && !action) {
    area.nome = label(body.nome);
    area.versao++;
    return area;
  }
  if (method === 'DELETE' && !action) {
    if (areaSlots(area).length)
      throw new MockError(409, 'Remova as vagas antes de excluir esta área.');
    store.areas = store.areas.filter((a) => a.id !== id);
    store.ancoras = store.ancoras.filter((a) => a.areaId !== id);
    return null;
  }
  throw new MockError(404, 'Rota não encontrada.');
}
export function changeSlot(company: string, method: string, id: string | undefined, body: Body) {
  if (method === 'POST' && !id) {
    const area = ownArea(String(body.areaId), company),
      lot = store.estacionamentos.find((l) => l.id === area.estacionamentoId)!;
    const rotulo = label(body.rotulo),
      tipo = slotType(body.tipo);
    if (lot.vagas.some((v) => v.rotulo.toLowerCase() === rotulo.toLowerCase()))
      throw new MockError(409, 'Este rótulo já existe no estacionamento.');
    const slot: Vaga = {
      id: crypto.randomUUID(),
      areaId: area.id,
      estacionamentoId: lot.id,
      rotulo,
      tipo,
    };
    lot.vagas.push(slot);
    area.versao++;
    return slot;
  }
  const lot = store.estacionamentos.find(
      (l) => l.empresaId === company && l.vagas.some((v) => v.id === id),
    ),
    slot = lot?.vagas.find((v) => v.id === id);
  if (!slot || !lot) throw new MockError(404, 'Vaga não encontrada.');
  const area = ownArea(slot.areaId, company);
  if (method === 'GET') return slot;
  if (method === 'PUT') {
    const rotulo = label(body.rotulo),
      tipo = slotType(body.tipo),
      anchor = store.ancoras.find((a) => a.id === slot.ancoraId);
    if (anchor && !anchor.tiposAceitos.includes(tipo))
      throw new MockError(422, 'Retire a vaga da posição antes de mudar seu tipo.');
    if (lot.vagas.some((v) => v.id !== id && v.rotulo.toLowerCase() === rotulo.toLowerCase()))
      throw new MockError(409, 'Este rótulo já existe no estacionamento.');
    Object.assign(slot, { rotulo, tipo });
    area.versao++;
    return slot;
  }
  if (method === 'DELETE') {
    store.sensores.forEach((s) => {
      if (s.vagaId === id) s.vagaId = undefined;
    });
    store.status = store.status.filter((s) => s.vagaId !== id);
    lot.vagas = lot.vagas.filter((v) => v.id !== id);
    area.versao++;
    return null;
  }
  throw new MockError(404, 'Rota não encontrada.');
}
