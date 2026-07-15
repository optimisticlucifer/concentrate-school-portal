export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (m = 'bad request'): AppError => new AppError(400, m);
export const unauthorized = (m = 'unauthorized'): AppError =>
  new AppError(401, m);
export const forbidden = (m = 'forbidden'): AppError => new AppError(403, m);
export const notFound = (m = 'not found'): AppError => new AppError(404, m);
export const conflict = (m = 'conflict'): AppError => new AppError(409, m);
