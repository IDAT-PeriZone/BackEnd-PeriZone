import { NextFunction, Request, Response } from 'express';

/**
 * Envuelve un controlador async para que cualquier excepción caiga en
 * next(error) automáticamente, sin necesitar try/catch en cada método.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
