import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  CircleHelp,
  CircleParking,
  LayoutDashboard,
  LogOut,
  Map,
  MapPin,
  Menu,
  Moon,
  Radio,
  Search,
  ShieldCheck,
  Star,
  Sun,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useTheme } from '../../features/ui/useTheme';
import { useLots } from '../../features/estacionamentos/queries';
import { Logo } from './Logo';
import { Button, Dialog, EmptyState, Input, Tooltip } from '../ui';
import { USE_MOCK } from '../../lib/api';
import { Simulator } from '../../features/sensores/Simulator';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}
const adminLinks: NavItem[] = [
  { to: '/admin', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { to: '/admin/estacionamentos', label: 'Estacionamentos', icon: CircleParking },
  { to: '/admin/editor', label: 'Editor de layout', icon: Map },
  { to: '/admin/sensores', label: 'Sensores', icon: Radio },
  { to: '/admin/usuarios', label: 'Usuários', icon: Users },
];
const userLinks: NavItem[] = [
  { to: '/estacionamentos', label: 'Encontrar vagas', icon: CircleParking },
  { to: '/favoritos', label: 'Favoritos', icon: Star },
  { to: '/perfil', label: 'Meu perfil', icon: UserRound },
];
export function AppLayout() {
  const { user, logout } = useAuth();
  const { light, changeTheme } = useTheme();
  const lots = useLots();
  const location = useLocation();
  const [mobile, setMobile] = useState(false);
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const [help, setHelp] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const changed = () => setNarrow(media.matches);
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') setMobile(false);
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  const admin = location.pathname.startsWith('/admin');
  const links = admin ? adminLinks : userLinks;
  const current =
    links.find((l) => (l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)))
      ?.label ?? 'Detalhe do estacionamento';
  const campus = user?.empresaId === 'unisagrado' ? 'Unisagrado' : 'Meu campus';
  const initials = user?.nome
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');
  const searchResults =
    lots.data?.filter((l) => l.nome.toLowerCase().includes(search.toLowerCase())) ?? [];
  return (
    <div className={`app-shell ${admin ? 'admin-shell' : 'user-shell'}`}>
      <aside
        id="menu-lateral"
        className={`sidebar ${mobile ? 'sidebar-open' : ''}`}
        aria-hidden={narrow && !mobile}
        {...(narrow && !mobile ? { inert: '' } : {})}
      >
        <div className="sidebar-brand">
          <Link to={admin ? '/admin' : '/estacionamentos'} aria-label="BatSinal, início">
            <Logo />
          </Link>
          <button
            className="mobile-close icon-button"
            onClick={() => setMobile(false)}
            aria-label="Fechar menu"
          >
            <X size={19} />
          </button>
        </div>
        <div className="workspace">
          <span className="workspace-icon">{campus[0]}</span>
          <div>
            <strong>{campus}</strong>
            <small>{admin ? 'Administração do campus' : 'Estacionamentos do campus'}</small>
          </div>
        </div>
        <p className="nav-label">{admin ? 'Operação' : 'Navegação'}</p>
        <nav aria-label="Menu principal">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobile(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} strokeWidth={1.65} />
              <span>{label}</span>
              {label === 'Sensores' && <span className="nav-tag">IoT</span>}
            </NavLink>
          ))}
        </nav>
        {user?.role === 'ADMIN' && (
          <div className="sidebar-switch">
            <NavLink
              className="nav-item"
              to={admin ? '/estacionamentos' : '/admin'}
              onClick={() => setMobile(false)}
            >
              {admin ? <MapPin size={18} /> : <ShieldCheck size={18} />}
              <span>{admin ? 'Abrir consulta de vagas' : 'Painel administrativo'}</span>
              <ArrowRight size={13} />
            </NavLink>
          </div>
        )}
        <div className="sidebar-bottom">
          <button className="help-link" onClick={() => setHelp(true)}>
            <CircleHelp size={16} />
            Ajuda e funcionamento
            <ChevronRight size={12} />
          </button>
          <div className="mode-indicator">
            <span />
            {USE_MOCK ? 'Demonstração local' : 'Dados da API'}
          </div>
          <div className="sidebar-person">
            <Link to="/perfil" className="sidebar-profile">
              <span className="avatar">{initials}</span>
              <span>
                <strong>{user?.nome}</strong>
                <small>{user?.role === 'ADMIN' ? 'Administrador' : 'Usuário'}</small>
              </span>
            </Link>
            <Tooltip text="Sair da conta">
              <button aria-label="Sair da conta" className="icon-button" onClick={logout}>
                <LogOut size={16} />
              </button>
            </Tooltip>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="sidebar-backdrop"
          onClick={() => setMobile(false)}
          aria-label="Fechar menu"
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Abrir menu"
              aria-expanded={mobile}
              aria-controls="menu-lateral"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <MapPin size={15} />
            <span>{campus}</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{current}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="global-search-trigger"
              onClick={() => setSearchOpen(true)}
              aria-label="Buscar estacionamentos"
            >
              <Search size={17} />
              <span>Buscar</span>
              <kbd>Ctrl K</kbd>
            </button>
            <Tooltip text={light ? 'Usar tema escuro' : 'Usar tema claro'}>
              <button
                className="icon-button theme-button"
                onClick={() => changeTheme(!light)}
                aria-label={light ? 'Usar tema escuro' : 'Usar tema claro'}
              >
                {light ? <Moon size={17} /> : <Sun size={17} />}
              </button>
            </Tooltip>
            <Link className="header-profile" to="/perfil" aria-label="Abrir meu perfil">
              <span>{initials}</span>
            </Link>
          </div>
        </header>
        <main className="main-content" id="conteudo">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>
            BatSinal <span>·</span> {campus}
          </span>
          <span>Projeto acadêmico · Dados {USE_MOCK ? 'simulados' : 'da API'}</span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Navegação mobile">
        {userLinks.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <Dialog
        open={help}
        onOpenChange={setHelp}
        title="Como consultar as vagas"
        description="As leituras dos sensores são atualizadas automaticamente."
      >
        <div className="help-content">
          <p>
            Escolha um estacionamento e abra o layout. Cada vaga informa se está livre, ocupada ou
            sem leitura confiável.
          </p>
          <p>
            Verde e check indicam uma vaga livre. Vermelho e carro indicam ocupação. Cinza com
            hachura indica ausência de sinal por mais de 60 segundos.
          </p>
          <p>
            A consulta atualiza a cada 3 segundos. Não há reserva de vagas. Na demonstração, o
            simulador representa os dispositivos.
          </p>
          <Button onClick={() => setHelp(false)}>Entendi</Button>
        </div>
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
                  {lot.vagasLivres} vagas livres de {lot.totalVagas}
                </small>
              </span>
              <ArrowRight size={16} />
            </Link>
          ))}
          {!searchResults.length && (
            <EmptyState
              title={lots.isError ? 'Busca indisponível' : 'Nenhum estacionamento encontrado'}
              description={
                lots.isError ? 'Tente carregar a consulta novamente.' : 'Tente outro nome.'
              }
            />
          )}
        </div>
      </Dialog>
      {USE_MOCK &&
        import.meta.env.VITE_SHOW_SIMULATOR === 'true' &&
        location.pathname !== '/perfil' && <Simulator />}
    </div>
  );
}
