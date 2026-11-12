let authContext = {
  user: null,
  token: '',
  tenantId: 1
};

function readInitialAuthFromStorage() {
  if (typeof window === 'undefined') return;
  try {
    const rawUser = window.localStorage.getItem('dairy_user');
    const rawToken = window.localStorage.getItem('dairy_token') || '';
    const parsedUser = rawUser ? JSON.parse(rawUser) : null;
    if (parsedUser) authContext.user = parsedUser;
    if (rawToken) authContext.token = rawToken;
    if (parsedUser?.tenantId) authContext.tenantId = Number(parsedUser.tenantId) || 1;
  } catch (_) {}
}

readInitialAuthFromStorage();

export function getDerivedUsername(user) {
  if (!user) return 'guest';
  if (user.username && String(user.username).trim()) {
    return String(user.username).trim().toLowerCase();
  }
  if (user.email && String(user.email).includes('@')) {
    return String(user.email).split('@')[0].trim().toLowerCase();
  }
  if (user.name && String(user.name).trim()) {
    return String(user.name).trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '.').replace(/^\.+|\.+$/g, '') || 'user';
  }
  return 'admin';
}

export function syncFetchAuthContext({ user, token, tenantId } = {}) {
  if (user !== undefined) authContext.user = user;
  if (token !== undefined) authContext.token = token || '';
  if (tenantId !== undefined) authContext.tenantId = Number(tenantId) || 1;
}

export function installAuthFetchInterceptor() {
  if (typeof window === 'undefined' || window.__dairyAuthFetchInstalled) return;
  window.__dairyAuthFetchInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init = {}) => {
    const rawUrl = typeof input === 'string'
      ? input
      : (input instanceof URL ? input.toString() : (input?.url || ''));

    const isApiCall =
      rawUrl.startsWith('/api/') ||
      rawUrl.startsWith('/user/') ||
      rawUrl.includes('/api/') ||
      rawUrl.includes('/user/');

    if (!isApiCall) {
      return originalFetch(input, init);
    }

    const baseHeaders = new Headers(
      init?.headers || (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined) || {}
    );

    if (!baseHeaders.has('x-tenant-id')) {
      baseHeaders.set('x-tenant-id', String(authContext.tenantId || 1));
    }

    if (authContext.token && !baseHeaders.has('authorization')) {
      baseHeaders.set('Authorization', `Bearer ${authContext.token}`);
    }

    if (authContext.user) {
      const u = authContext.user;
      if (!baseHeaders.has('x-user-id')) {
        baseHeaders.set('x-user-id', String(u.id || 1));
      }
      if (!baseHeaders.has('x-user-name')) {
        baseHeaders.set('x-user-name', encodeURIComponent(u.name || u.username || 'User'));
      }
      if (!baseHeaders.has('x-username')) {
        baseHeaders.set('x-username', encodeURIComponent(getDerivedUsername(u)));
      }
      if (!baseHeaders.has('x-user-email')) {
        baseHeaders.set('x-user-email', u.email || 'staff@dairy.local');
      }
    }

    if (typeof Request !== 'undefined' && input instanceof Request) {
      const nextReq = new Request(input, { ...init, headers: baseHeaders });
      return originalFetch(nextReq);
    }

    return originalFetch(input, { ...init, headers: baseHeaders });
  };
}

installAuthFetchInterceptor();
