import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Express 4 non cattura da solo gli errori delle funzioni async:
 * questo wrapper li passa al gestore errori centrale.
 */
export function asyncHandler<P, ResBody, ReqBody, ReqQuery>(
  fn: (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction
  ) => Promise<unknown>
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
