import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, Radio, RefreshCw, X } from 'lucide-react';
import { useLot, useLots, useStatuses } from '../estacionamentos/queries';
import { Button, Select, SpotStatusBadge, Switch } from '../../components/ui';
import type { StatusVaga } from '../../types';
import { api, json, USE_MOCK } from '../../lib/api';

// Com o mock, escreve no store local; com a API real, usa o endpoint de demonstração
// /simulador/leituras (habilitado por BATSINAL_SIMULADOR=true no backend).
async function simulateStatus(vagaId: string, status: StatusVaga) {
  if (USE_MOCK) {
    const handlers = await import('../../mocks/handlers');
    handlers.simulateStatus(vagaId, status);
    return;
  }
  await api('/simulador/leituras', { method: 'POST', body: json({ vagaId, status }) });
}

export function Simulator() {
  const [open, setOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const [id, setId] = useState('');
  const lots = useLots();
  const selectedId = id || lots.data?.[0]?.id || '';
  const lot = useLot(selectedId);
  const statuses = useStatuses(selectedId);
  const client = useQueryClient();
  async function change(vagaId: string, status: StatusVaga) {
    await simulateStatus(vagaId, status).catch(() => undefined);
    await client.invalidateQueries({ queryKey: ['status'] });
    await client.invalidateQueries({ queryKey: ['estacionamentos'] });
    await client.invalidateQueries({ queryKey: ['sensores'] });
  }
  useEffect(() => {
    if (!moving || !lot.data) return;
    const vagas = lot.data.vagas.filter((v) => v.sensorId);
    const interval = window.setInterval(() => {
      if (!vagas.length) return;
      const vaga = vagas[Math.floor(Math.random() * vagas.length)];
      void simulateStatus(vaga.id, Math.random() > 0.5 ? 'LIVRE' : 'OCUPADA')
        .catch(() => undefined)
        .then(() => {
          void client.invalidateQueries({ queryKey: ['status'] });
          void client.invalidateQueries({ queryKey: ['estacionamentos'] });
        });
    }, 2500);
    return () => window.clearInterval(interval);
  }, [moving, lot.data, client]);
  return (
    <div className="simulator">
      {open && (
        <section className="simulator-panel" aria-label="Simulador de sensores">
          <header>
            <div>
              <Radio size={18} />
              <strong>Simulador de sensores</strong>
            </div>
            <button
              className="icon-button"
              aria-label="Fechar simulador"
              onClick={() => setOpen(false)}
            >
              <X size={17} />
            </button>
          </header>
          <p>Plano B da apresentação. Representa as leituras enviadas pelo hardware à API.</p>
          <Select
            aria-label="Estacionamento do simulador"
            value={selectedId}
            onChange={(e) => setId(e.target.value)}
          >
            {lots.data?.map((l) => (
              <option value={l.id} key={l.id}>
                {l.nome}
              </option>
            ))}
          </Select>
          <Switch
            checked={moving}
            onCheckedChange={setMoving}
            label="Simular movimento a cada 2,5 s"
          />
          <div className="simulator-spots">
            {lot.data?.vagas.map((vaga) => {
              const status =
                statuses.data?.find((s) => s.vagaId === vaga.id)?.status ?? 'SEM_SINAL';
              return (
                <div key={vaga.id}>
                  <strong>{vaga.rotulo}</strong>
                  <SpotStatusBadge status={status} />
                  <Select
                    aria-label={`Simular status da vaga ${vaga.rotulo}`}
                    disabled={!vaga.sensorId}
                    value={status}
                    onChange={(e) => void change(vaga.id, e.target.value as StatusVaga)}
                  >
                    <option value="LIVRE">Livre</option>
                    <option value="OCUPADA">Ocupada</option>
                    <option value="SEM_SINAL">Sem sinal</option>
                  </Select>
                </div>
              );
            })}
          </div>
          {!lot.data?.vagas.length && (
            <p>
              Nenhuma vaga para simular. Cadastre uma vaga e vincule um sensor em Posicionar vagas.
            </p>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              void Promise.all(
                (lot.data?.vagas ?? [])
                  .filter((v) => v.sensorId)
                  .map((v) => simulateStatus(v.id, 'OCUPADA').catch(() => undefined)),
              ).then(() => {
                void client.invalidateQueries({ queryKey: ['status'] });
                void client.invalidateQueries({ queryKey: ['estacionamentos'] });
                void client.invalidateQueries({ queryKey: ['sensores'] });
              });
            }}
          >
            <RefreshCw size={15} />
            Lotar para testar alerta
          </Button>
          <small>Vagas sem sensor permanecem sem sinal.</small>
        </section>
      )}
      <Button
        className={`simulator-trigger ${moving ? 'simulator-running' : ''}`}
        variant="secondary"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Fechar simulador' : 'Simulador'}
      >
        <Activity size={17} />
        <span className="simulator-trigger-label">{open ? 'Fechar simulador' : 'Simulador'}</span>
        {moving && <span className="status-led" />}
      </Button>
    </div>
  );
}
