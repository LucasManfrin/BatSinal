import { LogOut, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { Button, Card } from '../../components/ui';

export function ProfilePage() {
  const { user, logout } = useAuth();
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SUA CONTA</div>
          <h1>Meu perfil</h1>
          <p>Seu acesso ao campus conectado.</p>
        </div>
      </div>
      <Card className="profile-card">
        <span className="profile-avatar">
          <User size={36} />
        </span>
        <h2>{user?.nome}</h2>
        <p className="muted">{user?.email}</p>
        <p>
          <ShieldCheck size={16} />
          {user?.role === 'ADMIN' ? 'Administrador' : 'Usuário'}
        </p>
        <Button variant="secondary" onClick={logout}>
          <LogOut size={16} />
          Sair da conta
        </Button>
      </Card>
    </>
  );
}
