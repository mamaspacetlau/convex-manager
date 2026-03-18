// Set up a global mechanism to store token and get headers
let currentToken = null;

export const setAuthToken = (token) => {
  currentToken = token;
  // Also store it in localStorage so it persists across page reloads
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

export const getHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  // Check local token variable first, then fallback to localStorage
  const token = currentToken || localStorage.getItem('authToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// --- Auth APIs ---
export const checkAuthStatus = async () => {
  const res = await fetch('/api/auth/status', {
    headers: { 'Cache-Control': 'no-cache' }
  });
  if (!res.ok) throw new Error('Failed to check auth status');
  return res.json();
};

export const login = async (identifier, password) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Login failed');
  }
  const data = await res.json();
  setAuthToken(data.token);
  return data;
};

export const requestRegistrationCode = async (email) => {
  const res = await fetch('/api/auth/register/request-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to request code');
  }
  return res.json();
};

export const verifyRegistration = async (email, code, username, password) => {
  const res = await fetch('/api/auth/register/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, username, password })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Registration failed');
  }
  return res.json();
};

export const inviteUser = async (email, role) => {
  const headers = getHeaders();
  const res = await fetch('/api/auth/invite', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ email, role })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to invite user');
  }
  return res.json();
};

export const verifyInvite = async (token) => {
  const res = await fetch(`/api/auth/invite/verify/${token}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Invalid invitation');
  }
  return res.json();
};

export const acceptInvite = async (token, username, password) => {
  const res = await fetch('/api/auth/invite/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, username, password })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to accept invitation');
  }
  return res.json();
};

export const requestPasswordReset = async (email) => {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to request reset');
  }
  return res.json();
};

export const resetPassword = async (email, code, newPassword) => {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to reset password');
  }
  return res.json();
};

export const logout = async () => {
  const res = await fetch('/api/auth/logout', { method: 'POST' });
  setAuthToken(null);
  if (!res.ok) throw new Error('Logout failed');
  return res.json();
};

export const refreshToken = async () => {
  const res = await fetch('/api/auth/refresh', { method: 'POST' });
  if (!res.ok) {
    setAuthToken(null);
    throw new Error('Session expired');
  }
  const data = await res.json();
  setAuthToken(data.token);
  return data;
};

export const getUsers = async () => {
  const res = await fetch('/api/auth/users', { headers: getHeaders() });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('Unauthorized');
    throw new Error('Failed to fetch users');
  }
  return res.json();
};

// --- Project APIs ---
export const fetchProjects = async () => {
  const res = await fetch('/api/projects', { headers: getHeaders() });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('Unauthorized');
    throw new Error('Failed to fetch projects');
  }
  return res.json();
};

export const createProject = async (name, overrides = {}, overwrite = false) => {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name, overrides, overwrite })
  });
  if (!res.ok) {
    const error = await res.json();
    // Return a special error object if it requires confirmation
    if (res.status === 409 && error.requiresOverwriteConfirmation) {
      const err = new Error(error.error);
      err.requiresOverwriteConfirmation = true;
      throw err;
    }
    throw new Error(error.error || 'Failed to create project');
  }
  return res.json();
};

export const deleteProject = async (name) => {
  const res = await fetch(`/api/projects/${name}`, { 
    method: 'DELETE',
    headers: getHeaders() 
  });
  if (!res.ok) throw new Error('Failed to delete project');
  return res.json();
};

export const startProject = async (name) => {
  const res = await fetch(`/api/projects/${name}/start`, { 
    method: 'POST',
    headers: getHeaders() 
  });
  if (!res.ok) throw new Error('Failed to start project');
  return res.json();
};

export const stopProject = async (name) => {
  const res = await fetch(`/api/projects/${name}/stop`, { 
    method: 'POST',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to stop project');
  return res.json();
};

export const updateProjectConfig = async (name, overrides) => {
  const res = await fetch(`/api/projects/${name}/config`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ overrides })
  });
  if (!res.ok) throw new Error('Failed to update project configuration');
  return res.json();
};

export const generateAdminKey = async (name) => {
  const res = await fetch(`/api/projects/${name}/admin-key`, {
    method: 'POST',
    headers: getHeaders()
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to generate admin key');
  }
  return res.json();
};
