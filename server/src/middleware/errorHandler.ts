import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // Check if it's a database connection error
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  const isDbError = err.message?.includes('Can\'t reach database server') || 
                    err.message?.includes('database server');

  res.status(500).json({
    error: 'Internal server error',
    message: isDev ? err.message : undefined,
    ...(isDev && isDbError ? {
      hint: 'PostgreSQL database is not running. Please start it with: sudo systemctl start postgresql'
    } : {})
  });
};

