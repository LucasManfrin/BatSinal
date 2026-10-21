import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Eye, EyeOff, MapPin, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { Button, Field, Input, LiveDot } from '../../components/ui';
import { Logo } from '../../components/layout/Logo';
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
        <Logo />
        <div className="auth-message">
          <div className="eyebrow">
            <span className="tiny-square" /> MENOS VOLTAS. MAIS TEMPO.
          </div>
          <h1>
            Seu próximo destino.
            <br />
            Sua vaga <em>já no radar.</em>
          </h1>
          <p>
            Veja onde estacionar antes de sair de casa.
            <br />
            Sensores conectados, vagas em tempo real.
          </p>
          <div className="auth-map">
            <div className="map-grid" />
            <div className="auth-map-top">
              <span>
                <MapPin size={15} /> Campus Unisagrado
              </span>
              <LiveDot />
            </div>
            <div className="auth-spots">
              {Array.from({ length: 18 }, (_, i) => (
                <div key={i} className={i % 4 === 0 || i === 7 ? 'spot-free' : 'spot-taken'}>
                  {i % 4 === 0 || i === 7 ? (
                    <Check size={22} />
                  ) : (
                    <svg viewBox="0 0 28 48" aria-hidden="true">
                      <rect x="3" y="2" width="22" height="43" rx="6" />
                      <path d="M6 12h16l-2 9H8Zm2 22h12" />
                    </svg>
                  )}
                  <small>A{String(i + 1).padStart(2, '0')}</small>
                </div>
              ))}
            </div>
            <div className="auth-map-road">
              →<span>ACESSO PRINCIPAL</span>→
            </div>
            <div className="map-floating">
              <span className="live-orb">
                <Radio size={20} />
              </span>
              <div>
                <strong>Uma vaga a menos para procurar.</strong>
                <span>Uma preocupação a menos no seu dia.</span>
              </div>
              <Sparkles size={16} />
            </div>
          </div>
          <div className="auth-benefits">
            <span>
              <Radio size={16} /> Detecção automática
            </span>
            <span>
              <ShieldCheck size={16} /> Feito para o seu campus
            </span>
          </div>
        </div>
        <footer>
          PROJETO ACADÊMICO · UNISAGRADO <span>2026</span>
        </footer>
      </section>
      <section className="auth-form-side" id="conteudo">
        <div className="auth-mobile-brand">
          <Logo />
        </div>
        <div className="auth-form-wrap">
          <BadgeLabel text={register ? 'SEU CAMPUS, CONECTADO' : 'BEM-VINDO AO BATSINAL'} />
          <h2>{register ? 'Dê sinal de um novo começo.' : 'Bom ter você por aqui.'}</h2>
          <p>
            {register
              ? 'Cadastre sua empresa e seja o primeiro administrador.'
              : 'Entre para encontrar seu lugar no campus.'}
          </p>
          <form onSubmit={submit} noValidate className="form-stack">
            {register && (
              <>
                {field('nomeEmpresa', 'Nome da empresa', 'Ex.: Unisagrado')}
                {field('nome', 'Seu nome', 'Como podemos chamar você?')}
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
              {busy ? 'Aguarde…' : register ? 'Criar minha empresa' : 'Entrar na plataforma'}
              <ArrowRight size={18} />
            </Button>
          </form>
          <p className="auth-alternative">
            {register ? 'Já tem uma conta?' : 'Sua empresa ainda não está aqui?'}{' '}
            <Link to={register ? '/login' : '/cadastro'}>
              {register ? 'Entrar' : 'Cadastrar empresa'} <ArrowRight size={14} />
            </Link>
          </p>
          {USE_MOCK && (
            <div className="demo-login">
              <span className="eyebrow">EXPLORE A DEMONSTRAÇÃO LOCAL</span>
              <div>
                <button
                  onClick={() =>
                    setForm({ ...form, email: 'admin@unisagrado.demo', senha: 'Demo@123' })
                  }
                >
                  <ShieldCheck size={17} />
                  <span>
                    Administrador<small>Gerencie o seu campus</small>
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
                    Usuário<small>Encontre sua vaga</small>
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
          <span className="tiny-square" /> Seu lugar está aqui.
        </p>
      </section>
    </div>
  );
}
function BadgeLabel({ text }: { text: string }) {
  return <div className="eyebrow accent-text">{text}</div>;
}
