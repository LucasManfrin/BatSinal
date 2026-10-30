import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useCampusSlug } from '../../features/estacionamentos/useCampusSlug';
import { usePublicCampi } from '../../features/estacionamentos/queries';
import { contatoComercial } from '../../features/publicidade/config';
import { publicCampusPath } from '../../lib/routes';

export function AdvertisingPage() {
  const slug = useCampusSlug()!;
  const campi = usePublicCampi();
  const campus = campi.data?.find((item) => item.slug === slug);
  const contato = contatoComercial(slug);
  const { search, hash } = useLocation();
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus();
    window.scrollTo?.(0, 0);
  }, []);
  return (
    <div className="advertising-page">
      <Link className="text-link advertising-back" to={`${publicCampusPath(slug)}${search}${hash}`}>
        <ArrowLeft size={16} aria-hidden="true" /> Voltar à consulta de vagas
      </Link>
      <header>
        <p className="eyebrow">Anuncie no BatSinal{campus ? ` · ${campus.nome}` : ''}</p>
        <h1 ref={title} tabIndex={-1}>
          Sua marca no caminho do campus.
        </h1>
        <p>
          Um espaço de destaque para marcas interessadas no público universitário. Apresente seus
          produtos e serviços a quem consulta as vagas do campus.
        </p>
      </header>
      <div className="advertising-details">
        <section aria-labelledby="advertising-audience">
          <h2 id="advertising-audience">Quem pode anunciar</h2>
          <p>
            Marcas que fazem parte da rotina de quem estuda, trabalha e passa pela universidade.
          </p>
          <ul className="advertising-segments">
            {[
              'Alimentação',
              'Academias',
              'Tecnologia',
              'Cursos',
              'Papelarias',
              'Serviços locais',
            ].map((segmento) => (
              <li key={segmento}>{segmento}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="advertising-terms">
          <h2 id="advertising-terms">Uma cota. 30 dias de destaque.</h2>
          <p>
            Uma única cota de destaque por campanha de 30 dias, vinculada à instituição escolhida. O
            banner reúne a identidade da sua marca, uma mensagem curta e um link para a sua oferta.
          </p>
          <p>
            A cota poderá ser negociada por lances. Envie sua proposta para combinar valores, datas
            e materiais com a equipe. A negociação é feita diretamente pelo canal comercial.
          </p>
        </section>
      </div>
      <section className="advertising-contact" aria-labelledby="advertising-proposal">
        <div>
          <h2 id="advertising-proposal">Envie sua proposta</h2>
          <p>Informe sua marca, a instituição de interesse, a oferta e o período desejado.</p>
        </div>
        {contato ? (
          <a className="btn btn-primary" href={contato}>
            Envie sua proposta <ArrowRight size={16} aria-hidden="true" />
          </a>
        ) : (
          <p className="advertising-contact-pending">
            O canal comercial será disponibilizado em breve. Ainda não é possível enviar propostas
            por aqui.
          </p>
        )}
      </section>
      <p className="advertising-free-note">
        A mensalidade da instituição e a publicidade ajudam a manter o BatSinal. A consulta de vagas
        continua gratuita e sem cadastro para estudantes e visitantes.
      </p>
    </div>
  );
}
