import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight, Car, LogOut, MapPin, Moon, Search, Star, Sun, UserRound } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useTheme } from '../../features/ui/useTheme';
import { useLots } from '../../features/estacionamentos/queries';
import { Logo } from './Logo';
import { Button, Dialog, EmptyState, Input } from '../ui';
import { USE_MOCK } from '../../lib/api';
import { Simulator } from '../../features/sensores/Simulator';

const adminLinks = [
  { to: '/admin', label: 'Visão geral', end: true },
  { to: '/admin/estacionamentos', label: 'Estacionamentos' },
  { to: '/admin/editor', label: 'Editor de layout' },
  { to: '/admin/sensores', label: 'Sensores' },
  { to: '/admin/usuarios', label: 'Usuários' },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { light, changeTheme } = useTheme();
  const lots = useLots();
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
  const admin = location.pathname.startsWith('/admin');
  const campus = user?.empresaId === 'unisagrado' ? 'Unisagrado' : 'Meu campus';
  const initials = user?.nome
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');
  const total = lots.data?.reduce((sum, lot) => sum + lot.vagasLivres, 0);
  const searchResults =
    lots.data?.filter((lot) => lot.nome.toLowerCase().includes(search.toLowerCase())) ?? [];
  return (
    <div className={`app-shell ${admin ? 'admin-shell' : 'user-shell'}`}>
      <header className="mobility-header">
        <div className="mobility-header-inner">
          <Link to="/estacionamentos" aria-label="BatSinal, encontrar vagas">
            <Logo />
          </Link>
          <span className="header-campus">
            <MapPin size={16} />
            <span>{campus}</span>
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
            aria-label="Abrir menu da conta"
            aria-haspopup="dialog"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen(true)}
          >
            {initials}
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
          <Link to="/estacionamentos">
            Consultar vagas <ArrowRight size={14} />
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
        title="Sua conta"
        description={`${user?.nome} · ${user?.email}`}
      >
        <nav className="account-navigation" aria-label="Conta e navegação">
          <Link to="/estacionamentos" onClick={() => setAccountOpen(false)}>
            <Car size={18} />
            Encontrar vagas
          </Link>
          <Link to="/favoritos" onClick={() => setAccountOpen(false)}>
            <Star size={18} />
            Favoritos
          </Link>
          <Link to="/perfil" onClick={() => setAccountOpen(false)}>
            <UserRound size={18} />
            Perfil e preferências
          </Link>
          {user?.role === 'ADMIN' && (
            <Link to="/admin" onClick={() => setAccountOpen(false)}>
              <ArrowRight size={18} />
              Administração
            </Link>
          )}
          <button
            onClick={() => {
              setAccountOpen(false);
              setSearchOpen(true);
            }}
          >
            <Search size={18} />
            Buscar estacionamentos <kbd>Ctrl K</kbd>
          </button>
          <button onClick={() => changeTheme(!light)}>
            {light ? <Moon size={18} /> : <Sun size={18} />}Usar tema {light ? 'escuro' : 'claro'}
          </button>
          <button onClick={logout}>
            <LogOut size={18} />
            Sair da conta
          </button>
        </nav>
      </Dialog>
      <Dialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Buscar estacionamento"
        description={`Estacionamentos de ${campus}`}
      >
        <div className="search-input">
          <Search size={17} />
          <Input
            autoFocus
            aria-label="Nome do estacionamento"
            placeholder="Nome do estacionamento"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="quick-search-results">
          {searchResults.map((lot) => (
            <Link
              key={lot.id}
              to={`/estacionamentos/${lot.id}`}
              onClick={() => setSearchOpen(false)}
            >
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
            !searchResults.length && (
              <EmptyState
                title="Nenhum estacionamento encontrado"
                description="Tente outro nome."
              />
            )
          )}
        </div>
      </Dialog>
      {USE_MOCK &&
        import.meta.env.VITE_SHOW_SIMULATOR === 'true' &&
        location.pathname !== '/perfil' && <Simulator />}
    </div>
  );
}
