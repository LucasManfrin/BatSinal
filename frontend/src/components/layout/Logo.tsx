export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <img src="/favicon.svg" alt="Holofote iluminando um carro" width={38} height={38} />
      {!compact && (
        <span>
          Bat<span>Sinal</span>
          <small>INTELIGÊNCIA PARA ESTACIONAR</small>
        </span>
      )}
    </div>
  );
}
