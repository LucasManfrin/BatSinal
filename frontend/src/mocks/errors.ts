export class MockError extends Error {
  constructor(
    public status: number,
    mensagem: string,
    public campos?: Record<string, string>,
  ) {
    super(mensagem);
  }
}
