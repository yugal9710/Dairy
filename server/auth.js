import crypto from 'crypto';

// Password hashing helper (PBKDF2 SHA-256)
export function hashPassword(password) {
  const salt = 'dairy_nepal_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
}

export function verifyPassword(password, hash) {
  if (!password || !hash) return false;
  // Fallback check if plaintext matches directly (legacy dev support)
  if (password === hash) return true;
  return hashPassword(password) === hash;
}

export function generateToken(user, tenantId) {
  const derivedUsername = user.username || (user.email ? String(user.email).split('@')[0].trim().toLowerCase() : String(user.name || 'user').toLowerCase());
  const payload = {
    userId: user.id,
    username: derivedUsername,
    email: user.email,
    name: user.name,
    roles: user.roles || [user.role || 'User'],
    tenantId: tenantId,
    timestamp: Date.now()
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function parseToken(token) {
  if (!token) return null;
  try {
    const json = Buffer.from(token, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (err) {
    return null;
  }
}

// Authentication middleware
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.headers['x-auth-token'] || req.query.token;

  if (!token) {
    req.user = null;
    return next();
  }

  const session = parseToken(token);
  if (session) {
    req.user = session;
  }
  next();
}

// Role checking middleware
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const userRoles = req.user.roles || [req.user.role || 'User'];
    // SuperAdmin always has access
    if (userRoles.includes('SuperAdmin')) {
      return next();
    }

    const hasRole = allowedRoles.some(r => userRoles.includes(r));
    if (!hasRole) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Insufficient permissions' });
    }

    next();
  };
}

// Tenant resolution helper
export function resolveTenantId(req) {
  if (req.headers['x-tenant-id']) {
    return Number(req.headers['x-tenant-id']) || 1;
  }
  if (req.query.tenantId) {
    return Number(req.query.tenantId) || 1;
  }
  if (req.user && req.user.tenantId) {
    return Number(req.user.tenantId) || 1;
  }
  return 1; // Default to Tenant 1
}
