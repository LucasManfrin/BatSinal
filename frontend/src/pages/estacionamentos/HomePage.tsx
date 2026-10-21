import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Logo } from '../../components/layout/Logo';
export function CampusEntry() {
  return (
    <main className="campus-directory" id="conteudo">
      <Logo />
      <h1>Vagas no campus, sem cadastro.</h1>
      <p>Abra o mapa da Unisagrado e escolha o bloco para ver onde estacionar.</p>
      <div className="home-actions">
        <Link className="btn btn-primary" to="/c/unisagrado">
          Ver o mapa da Unisagrado <ArrowRight size={18} />
        </Link>
        <Link className="btn btn-secondary" to="/cadastrar-empresa">
          Sou uma empresa <ArrowRight size={18} />
        </Link>
      </div>
      <p>
        Já cadastrou a empresa?{' '}
        <Link className="text-link" to="/entrar">
          Entrar no painel
        </Link>
      </p>
    </main>
  );
}
