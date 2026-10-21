import { Link } from 'react-router-dom';
import { ArrowRight, LogOut } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useCompany } from '../../features/estacionamentos/queries';
import { Button, ErrorState, Loading } from '../../components/ui';
import { Field, Input } from '../../components/ui';
import { api, json } from '../../lib/api';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { mensagemErro } from '../../lib/utils';

export function CompanyPage() {
  const { logout } = useAuth();
  const company = useCompany();
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ nome: '', slug: '' });
  const [password, setPassword] = useState({ senhaAtual: '', novaSenha: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent, path: string, body: unknown) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await api(path, { method: 'PUT', body: json(body) });
      await client.invalidateQueries();
      setEditing(false);
      setPassword({ senhaAtual: '', novaSenha: '' });
      setMessage(
        path.endsWith('senha')
          ? 'Senha alterada. Outras sessões foram encerradas.'
          : 'Dados da empresa salvos.',
      );
    } catch (error) {
      setMessage(mensagemErro(error));
    } finally {
      setBusy(false);
    }
  }
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
            <dt>Empresa</dt>
            <dd>{company.data.nome}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>{company.data.email}</dd>
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
      <section className="profile-section">
        <div className="profile-section-heading">
          <h2>Nome e endereço do mapa</h2>
          <p>Ao mudar o endereço, os links antigos deixam de abrir este mapa.</p>
        </div>
        <div className="profile-section-body">
          {editing ? (
            <form className="form-stack" onSubmit={(e) => void save(e, '/empresa', form)}>
              <Field label="Nome da empresa">
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </Field>
              <Field label="Endereço do mapa">
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </Field>
              <Button disabled={busy}>Salvar dados</Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </form>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                setForm({ nome: company.data.nome, slug: company.data.slug });
                setEditing(true);
              }}
            >
              Editar dados
            </Button>
          )}
        </div>
      </section>
      <section className="profile-section">
        <div className="profile-section-heading">
          <h2>Trocar senha</h2>
          <p>As outras sessões da empresa serão encerradas.</p>
        </div>
        <form
          className="profile-section-body form-stack"
          onSubmit={(e) => void save(e, '/empresa/senha', password)}
        >
          <Field label="Senha atual">
            <Input
              type="password"
              autoComplete="current-password"
              value={password.senhaAtual}
              onChange={(e) => setPassword({ ...password, senhaAtual: e.target.value })}
              required
            />
          </Field>
          <Field label="Nova senha">
            <Input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password.novaSenha}
              onChange={(e) => setPassword({ ...password, novaSenha: e.target.value })}
              required
            />
          </Field>
          <Button disabled={busy}>Alterar senha</Button>
        </form>
      </section>
      {message && <p role="status">{message}</p>}
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
