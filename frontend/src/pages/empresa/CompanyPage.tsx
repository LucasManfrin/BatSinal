import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, LogOut } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useCompany } from '../../features/estacionamentos/queries';
import { api, json } from '../../lib/api';
import { mensagemErro } from '../../lib/utils';
import { Button, ErrorState, Loading, Switch } from '../../components/ui';
import { toast } from 'sonner';
import type { Empresa } from '../../types';

export function CompanyPage() {
  const { user, logout } = useAuth();
  const company = useCompany();
  const client = useQueryClient();
  const [saving, setSaving] = useState(false);
  if (company.isPending) return <Loading />;
  if (company.isError) return <ErrorState retry={() => void company.refetch()} />;
  async function publish(value: boolean) {
    setSaving(true);
    try {
      const result = await api<Empresa>('/empresa', {
        method: 'PUT',
        body: json({ publicado: value }),
      });
      client.setQueryData(['empresa', user?.empresaId], result);
      await client.invalidateQueries({ queryKey: ['campi-publicos'] });
      await client.invalidateQueries({ queryKey: ['estacionamentos'] });
      toast.success(value ? 'Consulta pública liberada.' : 'Consulta pública fechada.');
    } catch (error) {
      toast.error(mensagemErro(error));
    } finally {
      setSaving(false);
    }
  }
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
            <dd>/c/{company.data.slug}</dd>
          </div>
        </dl>
      </section>
      <section className="profile-section">
        <div className="profile-section-heading">
          <h2>Consulta pública</h2>
          <p>Libere quando os acessos e o layout estiverem revisados.</p>
        </div>
        <div className="profile-section-body">
          <div className="preference-row">
            <div>
              <strong>
                {company.data.publicado ? 'Disponível sem login' : 'Consulta fechada'}
              </strong>
              <p>Visitantes veem vagas e layouts, sem acesso a contas ou sensores.</p>
            </div>
            <Switch
              checked={company.data.publicado}
              disabled={saving}
              onCheckedChange={(value) => void publish(value)}
              label="Publicar consulta de vagas"
            />
          </div>
          {company.data.publicado && (
            <Link className="text-link" to={`/c/${company.data.slug}`}>
              Abrir consulta pública <ArrowRight size={14} />
            </Link>
          )}
        </div>
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
