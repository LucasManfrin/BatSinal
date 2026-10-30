import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { advertisingPath } from '../../lib/routes';
import { campanhaAtiva, destinoSeguro } from './config';

function AdvertiserIdentity({ nome, imagem }: { nome: string; imagem?: string }) {
  const [failed, setFailed] = useState(false);
  const src =
    imagem?.startsWith('/') && !imagem.startsWith('//') ? imagem : destinoSeguro(imagem ?? '');
  return (
    <div className="advertising-identity" aria-hidden="true">
      {src && !failed ? (
        <img src={src} alt="" width="112" height="80" onError={() => setFailed(true)} />
      ) : (
        <span>{nome.trim().slice(0, 2).toLocaleUpperCase('pt-BR')}</span>
      )}
    </div>
  );
}

export function AdvertisingBanner({ campusSlug }: { campusSlug: string }) {
  const [now, setNow] = useState(Date.now);
  const location = useLocation();
  // Reavalia a janela inclusive quando a consulta fica aberta por muito tempo.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const campanha = campanhaAtiva(campusSlug, now);
  return (
    <aside
      className="advertising-banner"
      aria-label={campanha ? 'Publicidade' : 'Espaço publicitário'}
    >
      {campanha && (
        <AdvertiserIdentity
          key={`${campusSlug}:${campanha.anunciante}:${campanha.imagem}`}
          nome={campanha.anunciante}
          imagem={campanha.imagem}
        />
      )}
      <div className="advertising-copy">
        <p className="advertising-label">{campanha ? 'Publicidade' : 'Espaço publicitário'}</p>
        <h2>{campanha?.anunciante ?? 'Sua marca pode estar aqui'}</h2>
        <p>{campanha?.texto ?? 'Divulgue seus produtos e serviços para quem passa pelo campus.'}</p>
      </div>
      {campanha ? (
        <a className="btn btn-primary" href={destinoSeguro(campanha.destino)} rel="sponsored">
          {campanha.botao} <ExternalLink size={16} aria-hidden="true" />
        </a>
      ) : (
        <Link
          className="btn btn-primary"
          to={`${advertisingPath(campusSlug)}${location.search}${location.hash}`}
        >
          Anuncie aqui <ArrowRight size={16} aria-hidden="true" />
        </Link>
      )}
    </aside>
  );
}
