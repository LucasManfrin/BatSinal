import { Link } from 'react-router-dom';
import { ArrowRight, LogOut } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useCompany } from '../../features/estacionamentos/queries';
import { Button, ErrorState, Loading } from '../../components/ui';

export function CompanyPage() {
  const { user, logout } = useAuth();
  const company = useCompany();
  if (company.isPending) return <Loading />;
  if (company.isError) return <ErrorState retry={() => void company.refetch()} />;
  return (
    <div className="company-page">
      <div className="page-heading">
        <div>
          <p className="section-kicker">Administração</p>
          <h1>Minha empresa</h1>
          <p>O responsável gerencia os espaços. Visitantes apenas consultam as vagas.</p>
        </div>
      </div>
      <section className="profile-section">
        <div className="profile-section-heading">
          <h2>{company.data.nome}</h2>
          <p>Dados do acesso administrativo.</p>
        </div>
        <dl className="account-details">
          <div>
            <dt>Responsável</dt>
            <dd>{user?.nome}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt>Endereço da consulta</dt>
            <dd>
              <Link className="text-link" to={`/c/${company.data.slug}`}>
                /c/{company.data.slug} <ArrowRight size={14} />
              </Link>
            </dd>
          </div>
        </dl>
      </section>
      <div className="profile-signout">
        <Link className="text-link" to="/admin">
          Voltar ao painel <ArrowRight size={14} />
        </Link>
        <Button variant="ghost" onClick={logout}>
          <LogOut size={15} />
          Sair da empresa
        </Button>
      </div>
    </div>
  );
}
