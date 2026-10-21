import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { usePublicCampi } from '../../features/estacionamentos/queries';
import { Logo } from '../../components/layout/Logo';
import { EmptyState, ErrorState, Loading } from '../../components/ui';

export function CampusEntry() {
  const campi = usePublicCampi();
  if (campi.isPending) return <Loading />;
  if (campi.isError) return <ErrorState retry={() => void campi.refetch()} />;
  if (campi.data.length === 1) return <Navigate to={`/c/${campi.data[0].slug}`} replace />;
  return (
    <main className="campus-directory" id="conteudo">
      <Logo />
      <h1>Consultar vagas</h1>
      <p>Escolha o campus. Não é necessário criar uma conta.</p>
      <div className="quick-search-results">
        {campi.data.map((campus) => (
          <Link key={campus.id} to={`/c/${campus.slug}`}>
            <MapPin size={18} />
            <strong>{campus.nome}</strong>
            <ArrowRight size={16} />
          </Link>
        ))}
      </div>
      {!campi.data.length && (
        <EmptyState
          title="Nenhum campus publicado"
          description="A empresa precisa publicar a consulta para disponibilizar suas vagas."
        />
      )}
      <Link className="text-link" to="/login">
        Acesso para empresas <ArrowRight size={14} />
      </Link>
    </main>
  );
}
