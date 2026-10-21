import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { Button, Field, Input } from '../../components/ui';
import { Logo } from '../../components/layout/Logo';
import { api, ApiError, USE_MOCK } from '../../lib/api';
import { slugValido, sugerirSlug } from '../../lib/slug';
import { mensagemErro } from '../../lib/utils';

export function AuthPage({ register = false }: { register?: boolean }) {
  const { user, login, register: createCompany } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: '', senha: '', nome: '', slug: '' });
  const [slugEdited, setSlugEdited] = useState(false);
  const [availability, setAvailability] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'error'
  >('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!register || !slugValido(form.slug)) {
      setAvailability('idle');
      return;
    }
    let active = true;
    setAvailability('checking');
    const timer = window.setTimeout(() => {
      void api<{ disponivel: boolean }>(`/public/slugs/${encodeURIComponent(form.slug)}/disponivel`)
        .then((result) => {
          if (active) setAvailability(result.disponivel ? 'available' : 'taken');
        })
        .catch(() => {
          if (active) setAvailability('error');
        });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [form.slug, register]);
  if (user) return <Navigate to={'/admin'} replace />;
  const strength = [
    form.senha.length >= 8,
    /[a-z]/.test(form.senha),
    /[A-Z]/.test(form.senha),
    /\d/.test(form.senha),
  ].filter(Boolean).length;
  const update = (key: keyof typeof form, value: string) => {
    if (key === 'slug') setSlugEdited(true);
    setForm((old) => ({
      ...old,
      [key]: value,
      ...(key === 'nome' && !slugEdited ? { slug: sugerirSlug(value) } : {}),
    }));
    setErrors((old) => ({ ...old, [key]: '', geral: '' }));
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Informe um e-mail válido.';
    if (form.senha.length < 8) next.senha = 'A senha precisa ter pelo menos 8 caracteres.';
    if (register) {
      if (form.nome.trim().length < 2) next.nome = 'Informe o nome da empresa.';
      if (!slugValido(form.slug)) next.slug = 'Use de 3 a 60 letras minúsculas, números e hífens.';
      if (availability === 'taken') next.slug = 'Este endereço já está em uso.';
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      if (register) await createCompany(form);
      else await login(form.email, form.senha);
      navigate('/admin');
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
        autoComplete={key === 'nome' ? 'organization' : key === 'email' ? 'email' : 'off'}
        aria-invalid={Boolean(errors[key])}
      />
    </Field>
  );
  return (
    <div className="auth-page">
      <section className="auth-form-side" id="conteudo">
        <div className="auth-mobile-brand">
          <Logo />
        </div>
        <div className="auth-form-wrap">
          <BadgeLabel text={register ? 'Cadastro de organização' : 'Acesso da empresa'} />
          <h2>{register ? 'Cadastrar empresa' : 'Entrar como empresa'}</h2>
          <p>
            {register
              ? 'Escolha o endereço público do mapa. Apenas a empresa precisa de conta.'
              : 'Gerencie o mapa, os bolsões e os sensores da sua empresa.'}
          </p>
          <form onSubmit={submit} noValidate className="form-stack">
            {register && (
              <>
                {field('nome', 'Nome da empresa', 'Ex.: Unisagrado')}
                {field('slug', 'Endereço do mapa', 'Ex.: unisagrado')}
                <p className="small-note" role="status">
                  /c/{form.slug || 'sua-empresa'} ·{' '}
                  {availability === 'checking'
                    ? 'Conferindo endereço…'
                    : availability === 'available'
                      ? 'Endereço disponível'
                      : availability === 'taken'
                        ? 'Endereço já utilizado'
                        : availability === 'error'
                          ? 'A disponibilidade será conferida ao cadastrar.'
                          : 'Você pode editar o endereço sugerido.'}
                </p>
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
                <small>
                  Força da senha: {['muito fraca', 'fraca', 'razoável', 'boa', 'forte'][strength]}.
                  Mínimo de 8 caracteres.
                </small>
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
            <Link to={register ? '/entrar' : '/cadastrar-empresa'}>
              {register ? 'Entrar' : 'Cadastrar empresa'} <ArrowRight size={14} />
            </Link>
          </p>
          <Link className="text-link public-consult-link" to="/">
            Consultar vagas sem conta <ArrowRight size={14} />
          </Link>
          {USE_MOCK && !register && (
            <div className="demo-login">
              <span className="eyebrow">Acesso de demonstração</span>
              <div>
                <button
                  onClick={() =>
                    setForm({ ...form, email: 'admin@unisagrado.demo', senha: 'Demo@123' })
                  }
                >
                  <ShieldCheck size={17} />
                  <span>
                    Empresa de demonstração<small>Unisagrado</small>
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
  return <div className="eyebrow">{text}</div>;
}
