import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bike,
  CarFront,
  Clock3,
  LogOut,
  MapPin,
  Moon,
  Plus,
  ShieldCheck,
  Star,
  Sun,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../features/auth/AuthContext';
import { useFavorites, useLots } from '../../features/estacionamentos/queries';
import { usePreferences, type Vehicle } from '../../features/profile/preferences';
import { useTheme } from '../../features/ui/useTheme';
import { Badge, Button, Dialog, Field, Input, Select, Switch } from '../../components/ui';
import type { TipoVaga } from '../../types';
import { tempoDesde } from '../../lib/utils';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const favorites = useFavorites();
  const lots = useLots();
  const { preferences, update } = usePreferences(user?.id ?? '');
  const { light, changeTheme } = useTheme();
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [removing, setRemoving] = useState<Vehicle | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'COMUM' | 'MOTO'>('COMUM');
  const [error, setError] = useState('');
  const favoriteLots = lots.data?.filter((l) => favorites.data?.includes(l.id)) ?? [];
  const recent = preferences.recentes.filter((r) => lots.data?.some((l) => l.id === r.id));
  function addVehicle(event: FormEvent) {
    event.preventDefault();
    if (nome.trim().length < 2) {
      setError('Informe um nome com pelo menos 2 caracteres.');
      return;
    }
    update({
      veiculos: [...preferences.veiculos, { id: crypto.randomUUID(), nome: nome.trim(), tipo }],
    });
    setVehicleOpen(false);
    setNome('');
    setError('');
    toast.success('Veículo salvo neste navegador.');
  }
  return (
    <div className="profile-page">
      <div className="page-heading">
        <div>
          <p className="section-kicker">Sua conta</p>
          <h1>
            Perfil e preferências<span className="heading-dot">.</span>
          </h1>
          <p>Configure como você consulta os estacionamentos.</p>
        </div>
        <Badge className="local-storage-badge">Preferências neste navegador</Badge>
      </div>
      <div className="profile-identity">
        <span className="profile-initials">
          {user?.nome
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')}
        </span>
        <div>
          <h2>{user?.nome}</h2>
          <p>{user?.email}</p>
          <span>
            <ShieldCheck size={13} />
            {user?.role === 'ADMIN' ? 'Administrador' : 'Usuário'} ·{' '}
            {user?.empresaId === 'unisagrado' ? 'Unisagrado' : 'Meu campus'}
          </span>
        </div>
      </div>
      <section className="profile-section">
        <div className="profile-section-heading">
          <h2>Meus veículos</h2>
          <p>Identifique os veículos usados nas suas consultas.</p>
        </div>
        <div className="profile-section-body">
          {preferences.veiculos.length ? (
            <div className="vehicle-list">
              {preferences.veiculos.map((vehicle) => (
                <div className="vehicle-row" key={vehicle.id}>
                  <span className="vehicle-icon">
                    {vehicle.tipo === 'MOTO' ? <Bike size={23} /> : <CarFront size={23} />}
                  </span>
                  <div>
                    <strong>{vehicle.nome}</strong>
                    <span>{vehicle.tipo === 'MOTO' ? 'Motocicleta' : 'Carro'}</span>
                  </div>
                  <button
                    className="icon-button"
                    onClick={() => setRemoving(vehicle)}
                    aria-label={`Remover veículo ${vehicle.nome}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="profile-empty-inline">
              <CarFront size={20} />
              Nenhum veículo salvo.
            </p>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              setError('');
              setVehicleOpen(true);
            }}
          >
            <Plus size={15} />
            Adicionar veículo
          </Button>
        </div>
      </section>
      <section className="profile-section">
        <div className="profile-section-heading">
          <h2>Preferências de vaga</h2>
          <p>Aplicadas na próxima consulta de estacionamentos.</p>
        </div>
        <div className="profile-section-body">
          <div className="preference-row">
            <div>
              <strong>Tipo de vaga</strong>
              <p>Define o filtro inicial da lista.</p>
            </div>
            <Select
              aria-label="Tipo de vaga preferido"
              value={preferences.tipo}
              onChange={(e) => {
                update({ tipo: e.target.value as TipoVaga | '' });
                toast.success('Preferência salva.');
              }}
            >
              <option value="">Todos os tipos</option>
              <option value="COMUM">Carro</option>
              <option value="MOTO">Moto</option>
              <option value="PCD">PCD</option>
            </Select>
          </div>
          <div className="preference-row">
            <div>
              <strong>Priorizar favoritos</strong>
              <p>Exibe seus estacionamentos favoritos primeiro.</p>
            </div>
            <Switch
              checked={preferences.favoritosPrimeiro}
              onCheckedChange={(checked) => update({ favoritosPrimeiro: checked })}
              label="Priorizar estacionamentos favoritos"
            />
          </div>
        </div>
      </section>
      <section className="profile-section">
        <div className="profile-section-heading">
          <h2>Estacionamentos favoritos</h2>
          <p>Acesso rápido aos espaços que você acompanha.</p>
        </div>
        <div className="profile-section-body">
          {favoriteLots.length ? (
            <div className="profile-place-list">
              {favoriteLots.map((lot) => (
                <Link key={lot.id} to={`/estacionamentos/${lot.id}`}>
                  <Star size={16} />
                  <span>
                    <strong>{lot.nome}</strong>
                    <small>{lot.vagasLivres} vagas livres agora</small>
                  </span>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="profile-empty-inline">
              <Star size={19} />
              Nenhum estacionamento favorito.
            </p>
          )}
          <Link className="text-link" to="/estacionamentos">
            Consultar estacionamentos <ArrowRight size={14} />
          </Link>
        </div>
      </section>
      <section className="profile-section">
        <div className="profile-section-heading">
          <h2>Consultas recentes</h2>
          <p>Últimos estacionamentos abertos nesta conta.</p>
        </div>
        <div className="profile-section-body">
          {recent.length ? (
            <div className="profile-place-list">
              {recent.map((visit) => (
                <Link key={visit.id} to={`/estacionamentos/${visit.id}`}>
                  <MapPin size={17} />
                  <span>
                    <strong>{visit.nome}</strong>
                    <small>Consultado {tempoDesde(visit.instante)}</small>
                  </span>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="profile-empty-inline">
              <Clock3 size={19} />
              Seus estacionamentos consultados aparecerão aqui.
            </p>
          )}
        </div>
      </section>
      <section className="profile-section">
        <div className="profile-section-heading">
          <h2>Configurações da conta</h2>
          <p>Dados de acesso e aparência da plataforma.</p>
        </div>
        <div className="profile-section-body">
          <dl className="account-details">
            <div>
              <dt>Nome</dt>
              <dd>{user?.nome}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{user?.email}</dd>
            </div>
            <div>
              <dt>Perfil de acesso</dt>
              <dd>{user?.role === 'ADMIN' ? 'Administrador' : 'Usuário'}</dd>
            </div>
          </dl>
          <div className="preference-row">
            <div>
              <strong>Aparência</strong>
              <p>Aplicada a este navegador.</p>
            </div>
            <div className="theme-options">
              <button aria-pressed={!light} onClick={() => changeTheme(false)}>
                <Moon size={14} />
                Escuro
              </button>
              <button aria-pressed={light} onClick={() => changeTheme(true)}>
                <Sun size={14} />
                Claro
              </button>
            </div>
          </div>
          <p className="account-note">
            Para alterar nome, e-mail ou perfil de acesso, procure o administrador da sua empresa.
          </p>
        </div>
      </section>
      <div className="profile-signout">
        <p>Veículos, preferências e consultas recentes ficam apenas neste navegador.</p>
        <Button variant="ghost" onClick={logout}>
          <LogOut size={15} />
          Sair da conta
        </Button>
      </div>
      <Dialog
        open={vehicleOpen}
        onOpenChange={setVehicleOpen}
        title="Adicionar veículo"
        description="Use um nome para identificar o veículo. Não é necessário informar a placa."
      >
        <form onSubmit={addVehicle} className="form-stack" noValidate>
          <Field label="Nome do veículo" error={error}>
            <Input
              autoFocus
              value={nome}
              maxLength={40}
              onChange={(e) => {
                setNome(e.target.value);
                setError('');
              }}
              placeholder="Ex.: Meu carro"
            />
          </Field>
          <Field label="Tipo de veículo">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as 'COMUM' | 'MOTO')}>
              <option value="COMUM">Carro</option>
              <option value="MOTO">Motocicleta</option>
            </Select>
          </Field>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setVehicleOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar veículo</Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={Boolean(removing)}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title="Remover veículo?"
        description={`O veículo “${removing?.nome}” será removido das preferências deste navegador.`}
      >
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setRemoving(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              update({ veiculos: preferences.veiculos.filter((v) => v.id !== removing?.id) });
              setRemoving(null);
              toast.success('Veículo removido.');
            }}
          >
            Remover veículo
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
