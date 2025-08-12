import { Request, Response, NextFunction } from "express";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    userType: string;
  };
}

// Mock JWT verification - in production, you'd use proper JWT verification
const verifyToken = (token: string) => {
  // For demo purposes, we'll accept "fake-jwt-token" and extract user from localStorage
  // In production, you'd verify the JWT signature and extract user from token
  if (token === "fake-jwt-token") {
    return true;
  }
  return false;
};

// Middleware to verify authentication
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  if (!verifyToken(token)) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  // For demo purposes, we'll assume the user info is passed in headers
  // In production, you'd extract this from the verified JWT token
  const userInfo = {
    id: req.headers['x-user-id'] as string || 'demo-user-id',
    username: req.headers['x-username'] as string || 'demo-user',
    email: req.headers['x-email'] as string || 'demo@example.com',
    userType: req.headers['x-user-type'] as string || 'free'
  };

  req.user = userInfo;
  next();
};

// Middleware to require admin access
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // First check authentication
  requireAuth(req, res, () => {
    if (!req.user || req.user.userType !== 'admin') {
      return res.status(403).json({ 
        message: 'Admin access required',
        userType: req.user?.userType || 'unknown'
      });
    }
    next();
  });
};

// Middleware to check specific permissions
export const requirePermission = (requiredPermission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const permissions = {
        admin: ['admin', 'premium', 'free'],
        premium: ['premium', 'free'],
        free: ['free']
      };

      const userPermissions = permissions[req.user.userType as keyof typeof permissions] || [];
      
      if (!userPermissions.includes(requiredPermission)) {
        return res.status(403).json({ 
          message: `Permission '${requiredPermission}' required`,
          userType: req.user.userType,
          hasPermissions: userPermissions
        });
      }

      next();
    });
  };
};

export type { AuthenticatedRequest };