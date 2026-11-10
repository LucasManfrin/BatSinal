"""Corpos exatamente como o frontend envia. Rodam sem banco."""

import pytest
from pydantic import ValidationError

from app.schemas import EstacionamentoEntrada

# Formulário de ManagementPage com os campos opcionais em branco.
FORMULARIO = {
    "nome": "Bolsão novo",
    "descricao": "",
    "portao": "",
    "caminhadaMinutos": None,
    "caminhadaDestino": "",
    "latitude": -22.327,
    "longitude": -49.054,
    "largura": 780,
    "altura": 680,
}


def test_formulario_em_branco_do_frontend_e_aceito():
    corpo = EstacionamentoEntrada.model_validate(FORMULARIO)
    assert (corpo.portao, corpo.caminhada_destino, corpo.caminhada_minutos) == (None, None, None)
    # Limpar um campo é diferente de omiti-lo: o PUT usa model_fields_set para decidir.
    assert {"portao", "caminhada_destino", "caminhada_minutos"} <= corpo.model_fields_set


@pytest.mark.parametrize("vazio", [None, "", "   "])
@pytest.mark.parametrize("campo", ["portao", "caminhadaDestino", "caminhadaMinutos"])
def test_opcional_vazio_vira_none(campo, vazio):
    corpo = EstacionamentoEntrada.model_validate({"nome": "Bolsão", campo: vazio})
    assert corpo.portao is None
    assert corpo.caminhada_destino is None
    assert corpo.caminhada_minutos is None


def test_opcionais_preenchidos_sao_normalizados():
    corpo = EstacionamentoEntrada.model_validate(
        {
            "nome": "Bolsão",
            "portao": "  Portão 1 ",
            "caminhadaDestino": "Bloco J",
            "caminhadaMinutos": 5,
        }
    )
    assert (corpo.portao, corpo.caminhada_destino, corpo.caminhada_minutos) == (
        "Portão 1",
        "Bloco J",
        5,
    )


@pytest.mark.parametrize(
    ("campos", "tipo"),
    [
        ({"portao": "x" * 101}, "string_too_long"),
        ({"caminhadaDestino": "x" * 101}, "string_too_long"),
        ({"caminhadaMinutos": 0}, "greater_than_equal"),
        ({"caminhadaMinutos": 121}, "less_than_equal"),
    ],
)
def test_limites_continuam_valendo_como_erro_de_validacao(campos, tipo):
    with pytest.raises(ValidationError) as erro:
        EstacionamentoEntrada.model_validate({"nome": "Bolsão", **campos})
    assert erro.value.errors()[0]["type"] == tipo
