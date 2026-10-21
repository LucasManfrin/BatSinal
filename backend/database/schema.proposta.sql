-- Proposta para PostgreSQL. Ainda não é uma migração aplicada.
-- Executar somente em um banco vazio de desenvolvimento, após revisão.
BEGIN;
CREATE SCHEMA batsinal;

CREATE TABLE batsinal.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(120) NOT NULL CHECK (length(trim(nome)) >= 2),
    slug VARCHAR(80) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Um responsável por empresa no MVP. Não existe papel de motorista/USER.
CREATE TABLE batsinal.administradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL UNIQUE REFERENCES batsinal.empresas(id),
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    senha_hash TEXT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX administrador_email_unico ON batsinal.administradores(lower(email));

-- O mapa real do campus fica no banco, não nos componentes React nem nos tiles externos.
CREATE TABLE batsinal.mapas_campus (
    empresa_id UUID PRIMARY KEY REFERENCES batsinal.empresas(id),
    geojson JSONB NOT NULL DEFAULT '{"type":"FeatureCollection","features":[]}'::jsonb,
    versao INTEGER NOT NULL DEFAULT 1 CHECK (versao >= 1),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT mapa_feature_collection CHECK (
        jsonb_typeof(geojson) = 'object'
        AND geojson ? 'type'
        AND COALESCE(geojson->>'type' = 'FeatureCollection', FALSE)
        AND geojson ? 'features'
        AND jsonb_typeof(geojson->'features') = 'array'
    )
);

CREATE TABLE batsinal.estacionamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES batsinal.empresas(id),
    nome VARCHAR(120) NOT NULL,
    descricao TEXT,
    portao VARCHAR(100),
    caminhada_minutos SMALLINT CHECK (caminhada_minutos BETWEEN 1 AND 120),
    caminhada_destino VARCHAR(100),
    latitude NUMERIC(10,7) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude NUMERIC(10,7) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    largura INTEGER NOT NULL CHECK (largura BETWEEN 200 AND 10000),
    altura INTEGER NOT NULL CHECK (altura BETWEEN 200 AND 10000),
    layout_versao INTEGER NOT NULL DEFAULT 1 CHECK (layout_versao >= 1),
    UNIQUE (id, empresa_id),
    CHECK ((caminhada_minutos IS NULL) = (caminhada_destino IS NULL)),
    CHECK (caminhada_destino IS NULL OR length(trim(caminhada_destino)) > 0)
);
CREATE INDEX estacionamentos_empresa ON batsinal.estacionamentos(empresa_id);

CREATE TABLE batsinal.vagas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    estacionamento_id UUID NOT NULL,
    rotulo VARCHAR(30) NOT NULL CHECK (length(trim(rotulo)) > 0),
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('COMUM','PCD','MOTO')),
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    largura DOUBLE PRECISION NOT NULL CHECK (largura >= 20 AND largura <= 10000),
    altura DOUBLE PRECISION NOT NULL CHECK (altura >= 20 AND altura <= 10000),
    rotacao DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (rotacao BETWEEN -360 AND 360),
    UNIQUE (id, empresa_id),
    FOREIGN KEY (estacionamento_id, empresa_id)
        REFERENCES batsinal.estacionamentos(id, empresa_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX vagas_rotulo_unico ON batsinal.vagas(estacionamento_id, upper(trim(rotulo)));

CREATE TABLE batsinal.elementos_layout (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    estacionamento_id UUID NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('VIA','ENTRADA','SAIDA','TEXTO')),
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    largura DOUBLE PRECISION NOT NULL CHECK (largura > 0 AND largura <= 10000),
    altura DOUBLE PRECISION NOT NULL CHECK (altura > 0 AND altura <= 10000),
    rotacao DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (rotacao BETWEEN -360 AND 360),
    texto VARCHAR(200),
    FOREIGN KEY (estacionamento_id, empresa_id)
        REFERENCES batsinal.estacionamentos(id, empresa_id) ON DELETE CASCADE
);

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

-- Amostras por bolsão, em intervalos de 5 min, para gráficos; não guardar cada heartbeat.
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
COMMIT;
