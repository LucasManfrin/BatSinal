-- Proposta PostgreSQL para revisão. Não é migração aplicada nem banco em execução.
-- Uma conta por empresa; visitantes não possuem registros de autenticação.
BEGIN;
CREATE SCHEMA batsinal;

CREATE TABLE batsinal.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(120) NOT NULL CHECK (length(trim(nome)) >= 2),
    slug VARCHAR(60) NOT NULL UNIQUE
        CHECK (length(slug) >= 3 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    email VARCHAR(254) NOT NULL,
    senha_hash TEXT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX empresas_email_unico ON batsinal.empresas(lower(email));

CREATE TABLE batsinal.sessoes (
    token_hash TEXT PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES batsinal.empresas(id) ON DELETE CASCADE,
    expira_em TIMESTAMPTZ NOT NULL
);

CREATE TABLE batsinal.mapas_campus (
    empresa_id UUID PRIMARY KEY REFERENCES batsinal.empresas(id),
    -- Blocos, portões, vias e contornos locais, sem credenciais nem leituras.
    cena JSONB CHECK (cena IS NULL OR jsonb_typeof(cena) = 'object'),
    geojson JSONB NOT NULL DEFAULT '{"type":"FeatureCollection","features":[]}'::jsonb,
    versao INTEGER NOT NULL DEFAULT 1 CHECK (versao >= 1),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (jsonb_typeof(geojson) = 'object'
        AND geojson ? 'type' AND geojson ? 'features'
        AND COALESCE(geojson->>'type' = 'FeatureCollection', FALSE)
        AND jsonb_typeof(geojson->'features') = 'array')
);

CREATE TABLE batsinal.estacionamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES batsinal.empresas(id),
    nome VARCHAR(120) NOT NULL,
    descricao TEXT,
    portao VARCHAR(100),
    latitude NUMERIC(10,7) CHECK (latitude BETWEEN -90 AND 90),
    longitude NUMERIC(10,7) CHECK (longitude BETWEEN -180 AND 180),
    UNIQUE (id, empresa_id)
);
CREATE INDEX estacionamentos_empresa ON batsinal.estacionamentos(empresa_id);

CREATE TABLE batsinal.areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    estacionamento_id UUID NOT NULL,
    nome VARCHAR(120) NOT NULL,
    contorno JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(contorno) = 'array'),
    versao INTEGER NOT NULL DEFAULT 1 CHECK (versao >= 1),
    UNIQUE (id, empresa_id),
    UNIQUE (id, estacionamento_id, empresa_id),
    FOREIGN KEY (estacionamento_id, empresa_id)
        REFERENCES batsinal.estacionamentos(id, empresa_id) ON DELETE CASCADE
);

CREATE TABLE batsinal.ancoras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    area_id UUID NOT NULL,
    x DOUBLE PRECISION NOT NULL CHECK (x BETWEEN -10000 AND 10000),
    z DOUBLE PRECISION NOT NULL CHECK (z BETWEEN -10000 AND 10000),
    largura DOUBLE PRECISION NOT NULL CHECK (largura > 0 AND largura <= 1000),
    profundidade DOUBLE PRECISION NOT NULL CHECK (profundidade > 0 AND profundidade <= 1000),
    rotacao DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (rotacao BETWEEN -360 AND 360),
    tipos_aceitos TEXT[] NOT NULL CHECK (
        cardinality(tipos_aceitos) > 0
        AND array_position(tipos_aceitos, NULL) IS NULL
        AND tipos_aceitos <@ ARRAY['COMUM','PCD','MOTO']::TEXT[]),
    vaga_padrao_id UUID,
    UNIQUE (vaga_padrao_id),
    UNIQUE (id, area_id, empresa_id),
    FOREIGN KEY (area_id, empresa_id) REFERENCES batsinal.areas(id, empresa_id) ON DELETE CASCADE
);
CREATE INDEX ancoras_area ON batsinal.ancoras(area_id);

CREATE TABLE batsinal.vagas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    estacionamento_id UUID NOT NULL,
    area_id UUID NOT NULL,
    rotulo VARCHAR(100) NOT NULL CHECK (length(trim(rotulo)) > 0),
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('COMUM','PCD','MOTO')),
    ancora_id UUID,
    UNIQUE (id, empresa_id),
    UNIQUE (id, area_id, empresa_id),
    -- A unicidade é conferida ao final da transação para permitir troca de duas peças.
    UNIQUE (ancora_id) DEFERRABLE INITIALLY DEFERRED,
    FOREIGN KEY (area_id, estacionamento_id, empresa_id)
        REFERENCES batsinal.areas(id, estacionamento_id, empresa_id) ON DELETE CASCADE,
    FOREIGN KEY (ancora_id, area_id, empresa_id)
        REFERENCES batsinal.ancoras(id, area_id, empresa_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE UNIQUE INDEX vagas_rotulo_unico ON batsinal.vagas(estacionamento_id, upper(trim(rotulo)));
CREATE INDEX vagas_area ON batsinal.vagas(area_id);
ALTER TABLE batsinal.ancoras ADD CONSTRAINT ancora_padrao_da_mesma_area
    FOREIGN KEY (vaga_padrao_id, area_id, empresa_id)
    REFERENCES batsinal.vagas(id, area_id, empresa_id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE batsinal.sensores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES batsinal.empresas(id),
    vaga_id UUID UNIQUE,
    nome VARCHAR(120) NOT NULL,
    chave_hash TEXT NOT NULL UNIQUE,
    ultimo_status VARCHAR(10) CHECK (ultimo_status IN ('LIVRE','OCUPADA')),
    ultimo_sinal_em TIMESTAMPTZ,
    FOREIGN KEY (vaga_id, empresa_id) REFERENCES batsinal.vagas(id, empresa_id)
        DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX sensores_empresa ON batsinal.sensores(empresa_id);

CREATE TABLE batsinal.historico_ocupacao (
    estacionamento_id UUID NOT NULL REFERENCES batsinal.estacionamentos(id) ON DELETE CASCADE,
    instante TIMESTAMPTZ NOT NULL,
    total INTEGER NOT NULL CHECK (total >= 0),
    livres INTEGER NOT NULL CHECK (livres >= 0),
    ocupadas INTEGER NOT NULL CHECK (ocupadas >= 0),
    sem_sinal INTEGER NOT NULL CHECK (sem_sinal >= 0),
    PRIMARY KEY (estacionamento_id, instante),
    CHECK (livres + ocupadas + sem_sinal = total)
);
-- O serviço valida tipo aceito e versão sob bloqueio da área. Ao excluir uma vaga,
-- limpa sensores.vaga_id e ancoras.vaga_padrao_id na mesma transação.
COMMIT;
