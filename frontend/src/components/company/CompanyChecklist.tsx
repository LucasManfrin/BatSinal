import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, Copy } from 'lucide-react';
import { useAreas, useCompany, useLots, useSensors } from '../../features/estacionamentos/queries';
import { useLocalValue } from '../../features/visitante/hooks';
import { publicCampusPath } from '../../lib/routes';
import { Button } from '../ui';

export function CompanyChecklist() {
  const company = useCompany(),
    lots = useLots(),
    sensors = useSensors(),
    areas = useAreas();
  const [copied, setCopied] = useLocalValue(`batsinal:inicio:${company.data?.id ?? ''}`, false);
  const [error, setError] = useState('');
  if (!company.data || !lots.data || !sensors.data || !areas.data) return null;
  const placed = areas.data.reduce((sum, area) => sum + (area.progresso?.posicionadas ?? 0), 0);
  const total = areas.data.reduce((sum, area) => sum + (area.progresso?.total ?? 0), 0);
  const steps = [
    {
      done: lots.data.length > 0,
      title: 'Estacionamentos',
      detail: lots.data.length
        ? `${lots.data.length} ${lots.data.length === 1 ? 'cadastrado' : 'cadastrados'}`
        : 'Cadastre o primeiro estacionamento',
      to: '/admin/estacionamentos',
    },
    {
      done: sensors.data.length > 0,
      title: 'Sensores',
      detail: sensors.data.length
        ? `${sensors.data.length} ${sensors.data.length === 1 ? 'cadastrado' : 'cadastrados'}`
        : 'Cadastre e vincule os sensores',
      to: '/admin/sensores',
    },
    {
      done: total > 0 && placed === total,
      title: 'Posicionar vagas',
      detail: total
        ? `${placed} de ${total} posicionadas`
        : 'Encaixe as vagas nas posições mapeadas',
      to: '/admin/posicionar',
    },
  ];
  if (steps.every((step) => step.done) && copied) return null;
  const completed = steps.filter((step) => step.done).length + Number(copied);
  const path = publicCampusPath(company.data.slug);
  const url = `${window.location.origin}${path}`;
  return (
    <section className="company-checklist" aria-labelledby="setup-title">
      <header className="setup-heading">
        <div>
          <p className="section-kicker">Preparação do mapa</p>
          <h2 id="setup-title">{company.data.nome}</h2>
        </div>
        <span>{completed} de 4 etapas concluídas</span>
      </header>
      <ol className="setup-steps">
        {steps.map((step, index) => (
          <li key={step.to} data-complete={step.done}>
            <Link className="setup-step" to={step.to}>
              <span className="setup-marker" aria-label={step.done ? 'Concluída' : 'Pendente'}>
                {step.done ? <Check size={17} /> : index + 1}
              </span>
              <span className="setup-step-copy">
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </span>
              <ArrowUpRight size={16} />
            </Link>
          </li>
        ))}
        <li data-complete={copied}>
          <div className="setup-step">
            <span className="setup-marker" aria-label={copied ? 'Concluída' : 'Pendente'}>
              {copied ? <Check size={17} /> : 4}
            </span>
            <span className="setup-step-copy">
              <strong>Compartilhar mapa</strong>
              <small>{copied ? 'Link público copiado' : 'Envie o endereço da consulta'}</small>
            </span>
          </div>
          <Button
            className="setup-copy"
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setError('');
              } catch {
                setError(
                  'Não consegui copiar. Selecione o endereço abaixo para compartilhar o mapa.',
                );
              }
            }}
          >
            <Copy size={15} />
            {copied ? 'Copiar novamente' : 'Copiar link público'}
          </Button>
        </li>
      </ol>
      <footer className="setup-public-link">
        <span>Consulta aberta, sem login</span>
        <a
          href={path}
          className="text-link"
          aria-label={`Abrir consulta pública de ${company.data.nome}`}
        >
          {url}
          <ArrowUpRight size={14} />
        </a>
      </footer>
      {error && (
        <p role="status" className="setup-copy-error">
          {error}
        </p>
      )}
    </section>
  );
}
