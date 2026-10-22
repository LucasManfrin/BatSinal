# Hardware

ESP32 + sensor ultrassônico HC-SR04. Implementação a fazer.
O dispositivo enviará as leituras à API; o navegador nunca conversa diretamente com o sensor.

## Contrato com a API (já implementado no backend)

```http
POST http://<servidor>:8000/api/leituras
X-Device-Key: <chave do sensor>
Content-Type: application/json

{ "status": "LIVRE" }
```

- `status`: `LIVRE` ou `OCUPADA`. Resposta 201; chave inválida 401.
- A chave aparece uma única vez ao cadastrar o sensor ou em `POST /api/sensores/{id}/chave`.
- Repita a leitura a cada poucos segundos, mesmo sem mudança: sem leitura há mais de 60 s a vaga
  aparece como SEM_SINAL.
- Detalhes em [backend/README.md](../backend/README.md#sensores-reais-esp32).
