"""Campos do contrato HTTP ausentes em 0001.

- estacionamentos: dimensões da planta e metadados opcionais de acesso usados pelo frontend.
- sessoes: instante de criação, para auditoria e limpeza.
- historico_ocupacao: índice por instante para retenção e consultas por período.
"""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

STATEMENTS = [
    """
    ALTER TABLE batsinal.estacionamentos
        ADD COLUMN caminhada_minutos INTEGER
            CHECK (caminhada_minutos BETWEEN 1 AND 120),
        ADD COLUMN caminhada_destino VARCHAR(100),
        ADD COLUMN largura DOUBLE PRECISION NOT NULL DEFAULT 780
            CHECK (largura BETWEEN 200 AND 10000),
        ADD COLUMN altura DOUBLE PRECISION NOT NULL DEFAULT 680
            CHECK (altura BETWEEN 200 AND 10000),
        ADD CONSTRAINT estacionamentos_caminhada_completa
            CHECK ((caminhada_minutos IS NULL) = (caminhada_destino IS NULL));
    """,
    """
    ALTER TABLE batsinal.sessoes
        ADD COLUMN criado_em TIMESTAMPTZ NOT NULL DEFAULT now();
    """,
    """
    CREATE INDEX sessoes_empresa ON batsinal.sessoes(empresa_id);
    """,
    """
    CREATE INDEX historico_ocupacao_instante ON batsinal.historico_ocupacao(instante);
    """,
]


def upgrade():
    for statement in STATEMENTS:
        op.execute(statement)


def downgrade():
    op.drop_index("historico_ocupacao_instante", "historico_ocupacao", schema="batsinal")
    op.drop_index("sessoes_empresa", "sessoes", schema="batsinal")
    op.drop_column("sessoes", "criado_em", schema="batsinal")
    op.drop_constraint(
        "estacionamentos_caminhada_completa", "estacionamentos", schema="batsinal", type_="check"
    )
    for column in ["altura", "largura", "caminhada_destino", "caminhada_minutos"]:
        op.drop_column("estacionamentos", column, schema="batsinal")
