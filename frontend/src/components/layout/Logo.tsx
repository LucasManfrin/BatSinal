export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <img src="/favicon.svg" alt="Sinal de luz BatSinal" width={38} height={38} />
      {!compact && (
        <span>
          BatSinal<span className="brand-period">.</span>
        </span>
      )}
    </div>
  );
}
