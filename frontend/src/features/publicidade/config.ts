export interface Campanha {
  ativa: boolean;
  anunciante: string;
  imagem?: string;
  texto: string;
  botao: string;
  destino: string;
  /** ISO 8601 com fuso explícito; início inclusivo e fim exclusivo. */
  inicio: string;
  fim: string;
}

export interface PublicidadeInstituicao {
  campanha: Campanha | null;
  /** Opcional: substitui o contato geral somente nesta instituição. */
  contato?: string;
}

// Configuração editorial, compartilhada pelos modos MSW e API real.
// Contato aceita mailto:, tel: ou HTTPS (por exemplo, o WhatsApp comercial).
export const publicidade = {
  contato: '', // Pendente: informar o canal comercial oficial do BatSinal.
  instituicoes: {
    unisagrado: { campanha: null },
  } as Record<string, PublicidadeInstituicao | undefined>,
};

export function destinoSeguro(valor: string): string | undefined {
  try {
    const url = new URL(valor);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch {
    // Configuração incompleta mantém o espaço disponível.
  }
}

export function contatoComercial(slug: string): string | undefined {
  const valor = (publicidade.instituicoes[slug]?.contato ?? publicidade.contato).trim();
  if (/^(mailto:[^?\s@]+@[^?\s@]+|tel:\+?[\d ()-]+)(\?.*)?$/i.test(valor)) return valor;
  return destinoSeguro(valor);
}

export function campanhaAtiva(slug: string, agora = Date.now()): Campanha | null {
  const campanha = publicidade.instituicoes[slug]?.campanha;
  if (!campanha?.ativa) return null;
  const comFuso = /T.*(?:Z|[+-]\d{2}:\d{2})$/i;
  if (!comFuso.test(campanha.inicio) || !comFuso.test(campanha.fim)) return null;
  const inicio = Date.parse(campanha.inicio);
  const fim = Date.parse(campanha.fim);
  return inicio <= agora &&
    agora < fim &&
    campanha.anunciante.trim() &&
    campanha.texto.trim() &&
    campanha.botao.trim() &&
    destinoSeguro(campanha.destino)
    ? campanha
    : null;
}
