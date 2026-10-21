import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Car, LogOut, MapPin, Moon, Search, Sun, UserRound } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useTheme } from '../../features/ui/useTheme';
import {
  useCampusScene,
  useCompany,
  useLots,
  usePublicCampi,
} from '../../features/estacionamentos/queries';
import { Logo } from './Logo';
import { Button, Dialog, EmptyState, Input } from '../ui';
import { USE_MOCK } from '../../lib/api';
import { Simulator } from '../../features/sensores/Simulator';

const adminLinks = [
  { to: '/admin', label: 'Visão geral', end: true },
  { to: '/admin/estacionamentos', label: 'Estacionamentos' },
  { to: '/admin/editor', label: 'Editor de layout' },
  { to: '/admin/sensores', label: 'Sensores' },
  { to: '/empresa', label: 'Minha empresa' },
];
export function AppLayout() {
  const { user, logout } = useAuth();
  const { light, changeTheme } = useTheme();
  const lots = useLots();
  const scene = useCampusScene();
  const company = useCompany();
  const campi = usePublicCampi();
  const { campusSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAccountOpen(false);
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  const admin = !campusSlug && Boolean(user);
  const campus = campusSlug
    ? (campi.data?.find((c) => c.slug === campusSlug)?.nome ?? 'Campus indisponível')
    : (company.data?.nome ?? 'Minha empresa');
  const home = campusSlug ? `/c/${campusSlug}` : '/';
  const initials = user?.nome
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');
  const total = lots.data?.reduce((sum, lot) => sum + lot.vagasLivres, 0);
  const searchResults =
    lots.data?.filter((lot) => lot.nome.toLowerCase().includes(search.toLowerCase())) ?? [];
  const mapped = Boolean(campusSlug && scene.data?.mapa);
  const destinations =
    scene.data?.mapa?.predios.filter((building) =>
      building.nome.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];
  const detailPath = (id: string) =>
    campusSlug ? `/c/${campusSlug}/${id}` : `/admin/consulta/${id}`;
  return (
    <div className={`app-shell ${admin ? 'admin-shell' : 'user-shell'}`}>
      <header className="mobility-header">
        <div className="mobility-header-inner">
          <Link to={home} aria-label="BatSinal, encontrar vagas">
            <Logo />
          </Link>
          <span className="header-campus">
            <MapPin size={16} />
            {campusSlug && (campi.data?.length ?? 0) > 1 ? (
              <select
                aria-label="Selecionar campus"
                value={campusSlug}
                onChange={(event) => navigate(`/c/${event.target.value}`)}
              >
                {!campi.data?.some((c) => c.slug === campusSlug) && (
                  <option value={campusSlug}>Campus indisponível</option>
                )}
                {campi.data?.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.nome}
                  </option>
                ))}
              </select>
            ) : (
              <span>{campus}</span>
            )}
          </span>
          <div
            className="header-availability"
            role="status"
            aria-label="Total de vagas livres no campus"
          >
            <Car size={18} />
            <strong>{lots.isError ? '—' : (total ?? '…')}</strong>
            <span>{lots.isError ? 'indisponível' : 'vagas livres'}</span>
          </div>
          <button
            className="account-trigger"
            aria-label="Abrir menu"
            aria-haspopup="dialog"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen(true)}
          >
            {user ? initials : <UserRound size={18} />}
          </button>
        </div>
      </header>
      {admin && (
        <nav className="operation-nav" aria-label="Administração">
          {adminLinks.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end}>
              {label}
            </NavLink>
          ))}
          <Link to={company.data ? `/c/${company.data.slug}` : '/'}>
            Consultar vagas
            <ArrowRight size={14} />
          </Link>
        </nav>
      )}
      <main className="main-content" id="conteudo">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>BatSinal · {campus}</span>
        <span>{USE_MOCK ? 'Demonstração · dados simulados' : 'Dados recebidos da API'}</span>
      </footer>
      <Dialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        title={user ? 'Empresa' : 'Consulta de vagas'}
        description={
          user
            ? `${user.nome} · ${user.email}`
            : 'A consulta é aberta. Não é necessário ter uma conta.'
        }
      >
        <nav className="account-navigation" aria-label="Navegação">
          <Link to="/" onClick={() => setAccountOpen(false)}>
            <Car size={18} />
            Encontrar vagas
          </Link>
          {user ? (
            <>
              <Link to="/admin" onClick={() => setAccountOpen(false)}>
                <ArrowRight size={18} />
                Administração
              </Link>
              <Link to="/empresa" onClick={() => setAccountOpen(false)}>
                <UserRound size={18} />
                Minha empresa
              </Link>
            </>
          ) : (
            <>
              <Link to="/entrar" onClick={() => setAccountOpen(false)}>
                <UserRound size={18} />
                Acesso para empresas
              </Link>
              <Link to="/cadastrar-empresa" onClick={() => setAccountOpen(false)}>
                <ArrowRight size={18} />
                Cadastrar empresa
              </Link>
            </>
          )}
          <button
            onClick={() => {
              setAccountOpen(false);
              setSearchOpen(true);
            }}
          >
            <Search size={18} />
            {mapped ? 'Buscar no campus' : 'Buscar estacionamentos'} <kbd>Ctrl K</kbd>
          </button>
          <button onClick={() => changeTheme(!light)}>
            {light ? <Moon size={18} /> : <Sun size={18} />}Usar tema {light ? 'escuro' : 'claro'}
          </button>
          {user && (
            <button
              onClick={() => {
                setAccountOpen(false);
                logout();
              }}
            >
              <LogOut size={18} />
              Sair da empresa
            </button>
          )}
        </nav>
      </Dialog>
      <Dialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title={mapped ? 'Buscar no campus' : 'Buscar estacionamento'}
        description={mapped ? `Blocos e serviços de ${campus}` : `Estacionamentos de ${campus}`}
      >
        <div className="search-input">
          <Search size={17} />
          <Input
            autoFocus
            aria-label={mapped ? 'Bloco ou serviço' : 'Nome do estacionamento'}
            placeholder={mapped ? 'Ex.: Bloco J' : 'Nome do estacionamento'}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="quick-search-results">
          {mapped
            ? destinations.map((building) => (
                <Link
                  key={building.id}
                  to={`/c/${campusSlug}?bloco=${building.id}`}
                  onClick={() => setSearchOpen(false)}
                >
                  <MapPin size={17} />
                  <span>
                    <strong>{building.nome}</strong>
                    <small>Localizar vagas próximas</small>
                  </span>
                  <ArrowRight size={16} />
                </Link>
              ))
            : searchResults.map((lot) => (
                <Link key={lot.id} to={detailPath(lot.id)} onClick={() => setSearchOpen(false)}>
                  <MapPin size={17} />
                  <span>
                    <strong>{lot.nome}</strong>
                    <small>
                      {lot.vagasLivres}/{lot.totalVagas} vagas livres
                    </small>
                  </span>
                  <ArrowRight size={16} />
                </Link>
              ))}
          {lots.isPending ? (
            <p role="status">Carregando estacionamentos…</p>
          ) : lots.isError ? (
            <EmptyState title="Busca indisponível">
              <Button variant="secondary" onClick={() => void lots.refetch()}>
                Tentar novamente
              </Button>
            </EmptyState>
          ) : (
            !(mapped ? destinations.length : searchResults.length) && (
              <EmptyState
                title={mapped ? 'Nenhum destino encontrado' : 'Nenhum estacionamento encontrado'}
                description="Tente outro nome."
              />
            )
          )}
        </div>
      </Dialog>
      {USE_MOCK &&
        import.meta.env.VITE_SHOW_SIMULATOR === 'true' &&
        admin &&
        location.pathname.startsWith('/admin') && <Simulator />}
    </div>
  );
}
