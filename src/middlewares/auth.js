import jwt from 'jsonwebtoken';

export function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      if (!required) return next();
      return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      res.status(401).json({ message: 'Invalid token' });
    }
  };
}

export function requireAdmin(req, res, next) {
  if (req.user?.isAdmin) return next();
  return res.status(403).json({ message: 'Admin only' });
}
