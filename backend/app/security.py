"""Hash de senhas (scrypt da biblioteca padrão) e de tokens/chaves opacos."""

import base64
import hashlib
import hmac
import secrets

# Parâmetros scrypt gravados no próprio hash para permitir evolução futura.
_N, _R, _P = 2**14, 8, 1


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode()


def hash_senha(senha: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(senha.encode(), salt=salt, n=_N, r=_R, p=_P, dklen=32)
    return f"scrypt${_N}${_R}${_P}${_b64(salt)}${_b64(digest)}"


def verificar_senha(senha: str, armazenado: str) -> bool:
    try:
        algoritmo, n, r, p, salt, esperado = armazenado.split("$")
        if algoritmo != "scrypt":
            return False
        digest = hashlib.scrypt(
            senha.encode(),
            salt=base64.b64decode(salt),
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=32,
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(digest, base64.b64decode(esperado))


# Usado quando o e-mail não existe, para o login levar tempo semelhante.
HASH_FICTICIO = hash_senha(secrets.token_urlsafe(16))


def novo_token() -> str:
    return secrets.token_urlsafe(32)


def nova_chave_dispositivo() -> str:
    return "bs_" + secrets.token_urlsafe(32)


def hash_token(valor: str) -> str:
    # Tokens e chaves têm 256 bits aleatórios: SHA-256 basta, sem salt.
    return hashlib.sha256(valor.encode()).hexdigest()
