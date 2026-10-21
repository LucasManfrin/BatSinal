import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, MapPin, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { Button, Field, Input } from '../../components/ui';
import { Logo } from '../../components/layout/Logo';
import { UrbanDrawing } from '../../components/lot/UrbanDrawing';
import { ApiError, USE_MOCK } from '../../lib/api';
import { mensagemErro } from '../../lib/utils';

export function AuthPage({ register = false }: { register?: boolean }) {
  const { user, login, register: createCompany } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: '', senha: '', nome: '', nomeEmpresa: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/estacionamentos'} replace />;
  const strength = [
    form.senha.length >= 8,
    /[a-z]/.test(form.senha),
    /[A-Z]/.test(form.senha),
    /\d/.test(form.senha),
  ].filter(Boolean).length;
  const update = (key: keyof typeof form, value: string) => {
    setForm((old) => ({ ...old, [key]: value }));
    setErrors((old) => ({ ...old, [key]: '', geral: '' }));
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Informe um e-mail válido.';
    if (form.senha.length < 8) next.senha = 'A senha precisa ter pelo menos 8 caracteres.';
    if (register) {
      if (form.nome.trim().length < 2) next.nome = 'Informe seu nome.';
      if (form.nomeEmpresa.trim().length < 2) next.nomeEmpresa = 'Informe o nome da empresa.';
      if (strength < 4) next.senha = 'Use 8 caracteres, minúscula, maiúscula e número.';
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const u = register ? await createCompany(form) : await login(form.email, form.senha);
      navigate(u.role === 'ADMIN' ? '/admin' : '/estacionamentos');
    } catch (e) {
      setErrors({ ...(e instanceof ApiError ? e.details.campos : {}), geral: mensagemErro(e) });
    } finally {
      setBusy(false);
    }
  }
  const field = (key: keyof typeof form, label: string, placeholder: string) => (
    <Field label={label} error={errors[key]}>
      <Input
        name={key}
        value={form[key]}
        onChange={(e) => update(key, e.target.value)}
        placeholder={placeholder}
        autoComplete={key === 'nome' ? 'name' : key === 'nomeEmpresa' ? 'organization' : 'email'}
        aria-invalid={Boolean(errors[key])}
      />
    </Field>
  );
  return (
    <div className="auth-page">
      <section className="auth-story">
        <header className="auth-brand-row">
          <Logo />
          <span>Mobilidade no campus</span>
        </header>
        <div className="auth-editorial">
          <span className="section-kicker">Estacionamentos conectados</span>
          <h1>
            Vagas do campus.
            <br />
            <span>Em tempo real.</span>
          </h1>
          <p>
            Consulte a disponibilidade antes de chegar.
            <br />A detecção de veículos é automática.
          </p>
        </div>
        <div className="login-visual">
          <UrbanDrawing beam />
          <span className="visual-location">
            <MapPin size={14} />
            Campus Unisagrado<small>Representação ilustrativa</small>
          </span>
          <span className="visual-bearing">
            N <span>↗</span>
          </span>
          <div className="visual-coordinate">
            <span>01 / Monitoramento de vagas</span>
            <span>BatSinal</span>
          </div>
        </div>
        <footer>
          <span>Projeto acadêmico · Unisagrado</span>
          <span>2026</span>
        </footer>
      </section>
      <section className="auth-form-side" id="conteudo">
        <div className="auth-mobile-brand">
          <Logo />
        </div>
        <div className="auth-form-wrap">
          <BadgeLabel text={register ? 'Cadastro de organização' : 'Acesse sua conta'} />
          <h2>{register ? 'Cadastrar empresa' : 'Entrar no BatSinal'}</h2>
          <p>
            {register
              ? 'Cadastre sua empresa e seja o primeiro administrador.'
              : 'Consulte as vagas disponíveis no seu campus.'}
          </p>
          <form onSubmit={submit} noValidate className="form-stack">
            {register && (
              <>
                {field('nomeEmpresa', 'Nome da empresa', 'Ex.: Unisagrado')}
                {field('nome', 'Seu nome', 'Nome e sobrenome')}
              </>
            )}
            {field('email', 'E-mail', 'voce@empresa.com.br')}
            <Field label="Senha" error={errors.senha}>
              <div className="password-wrap">
                <Input
                  name="senha"
                  type={show ? 'text' : 'password'}
                  value={form.senha}
                  onChange={(e) => update('senha', e.target.value)}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  placeholder="Pelo menos 8 caracteres"
                  aria-invalid={Boolean(errors.senha)}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            {register && (
              <div className="password-strength">
                <div>
                  {[1, 2, 3, 4].map((i) => (
                    <span key={i} className={strength >= i ? 'filled' : ''} />
                  ))}
                </div>
                <small>8 caracteres, maiúscula, minúscula e número.</small>
              </div>
            )}
            {errors.geral && (
              <p role="alert" className="form-error">
                {errors.geral}
              </p>
            )}
            <Button type="submit" disabled={busy} className="auth-submit">
              {busy ? 'Aguarde…' : register ? 'Cadastrar empresa' : 'Entrar'}
              <ArrowRight size={18} />
            </Button>
          </form>
          <p className="auth-alternative">
            {register ? 'Já tem uma conta?' : 'Primeiro acesso da empresa?'}{' '}
            <Link to={register ? '/login' : '/cadastro'}>
              {register ? 'Entrar' : 'Cadastrar empresa'} <ArrowRight size={14} />
            </Link>
          </p>
          {USE_MOCK && (
            <div className="demo-login">
              <span className="eyebrow">Contas de demonstração</span>
              <div>
                <button
                  onClick={() =>
                    setForm({ ...form, email: 'admin@unisagrado.demo', senha: 'Demo@123' })
                  }
                >
                  <ShieldCheck size={17} />
                  <span>
                    Administrador<small>Painel e configuração</small>
                  </span>
                  <ArrowRight size={15} />
                </button>
                <button
                  onClick={() =>
                    setForm({ ...form, email: 'usuario@unisagrado.demo', senha: 'Demo@123' })
                  }
                >
                  <MapPin size={17} />
                  <span>
                    Usuário<small>Consulta de vagas</small>
                  </span>
                  <ArrowRight size={15} />
                </button>
              </div>
              <small>
                Dados fictícios. Senha das contas de exemplo: <code>Demo@123</code>
              </small>
            </div>
          )}
        </div>
        <p className="auth-bottom">
          <span className="tiny-square" /> Ambiente local · dados de demonstração
        </p>
      </section>
    </div>
  );
}
function BadgeLabel({ text }: { text: string }) {
  return <div className="eyebrow accent-text">{text}</div>;
}
