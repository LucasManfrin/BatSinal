from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="BATSINAL_",
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: SecretStr | None = None
    cors_origins: list[str] = ["http://127.0.0.1:5173", "http://localhost:5173"]
    # Duração fixa do token opaco da empresa. Trocar a senha revoga as outras sessões.
    sessao_horas: int = 24 * 7
    # Leitura mais antiga que isso vira SEM_SINAL.
    sinal_expira_segundos: int = 60
    # Fuso usado para agrupar o histórico por hora/dia e montar o heatmap.
    fuso_horario: str = "America/Sao_Paulo"
    retencao_historico_dias: int = 14
    # Intervalo da tarefa de amostragem do histórico. 0 desliga (testes).
    amostragem_segundos: int = 10
    # Somente demonstração: libera /api/simulador e repete leituras como o mock fazia.
    simulador: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
