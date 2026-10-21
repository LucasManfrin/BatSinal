import { Link } from 'react-router-dom';
import { Check, Copy } from 'lucide-react';
import { useAreas, useCompany, useLots, useSensors } from '../../features/estacionamentos/queries';
import { useLocalValue } from '../../features/visitante/hooks';
import { Button } from '../ui';
import { useState } from 'react';
export function CompanyChecklist() {
  const company = useCompany();
  const lots = useLots();
  const sensors = useSensors();
  const areas = useAreas();
  const [copied, setCopied] = useLocalValue(`batsinal:inicio:${company.data?.id ?? ''}`, false);
  const [error, setError] = useState('');
  if (!company.data || !lots.data || !sensors.data) return null;
  const steps = [
    {
      done: lots.data.length > 0,
      label: 'Cadastrar um estacionamento',
      to: '/admin/estacionamentos',
    },
    { done: sensors.data.length > 0, label: 'Cadastrar sensores', to: '/admin/sensores' },
    {
      done:
        Boolean(areas.data?.some((a) => a.progresso && a.progresso.posicionadas > 0)) &&
        areas.data?.every((a) => a.progresso?.posicionadas === a.progresso?.total),
      label: 'Posicionar as vagas',
      to: '/admin/posicionar',
    },
  ];
  if (steps.every((s) => s.done) && copied) return null;
  const url = `${window.location.origin}/c/${company.data.slug}`;
  return (
    <section className="company-checklist">
      <h2>Prepare o mapa de {company.data.nome}</h2>
      <p>Quatro passos para mostrar as vagas no endereço público.</p>
      <ol>
        {steps.map((step) => (
          <li key={step.to}>
            {step.done && <Check size={16} />}
            <Link to={step.to}>{step.label}</Link>
          </li>
        ))}
        <li>
          {copied && <Check size={16} />}
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setError('');
              } catch {
                setError('Copie o endereço abaixo para compartilhar o mapa.');
              }
            }}
          >
            <Copy size={16} />
            {copied ? 'Link copiado' : 'Copiar link público'}
          </Button>
          <a href={url}>{url}</a>
        </li>
      </ol>
      {error && <p role="status">{error}</p>}
    </section>
  );
}
