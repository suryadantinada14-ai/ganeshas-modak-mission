/** 
 * Supabase Auth & Authorization + Leaderboard for Ganesha's Modak Mission.
 * Never put a Supabase service-role key in browser code.
 * Uses public publishable anonKey only.
 */

const config = globalThis.__GMM_SUPABASE__ || {};
const url = String(config.url || '').replace(/\/$/, '');
const anonKey = String(config.anonKey || '');
const configured = Boolean(url && anonKey && /^https:\/\//i.test(url));

const SESSION_KEY = 'gmm.supabase.session';
const PROVIDER_KEY = 'gmm.supabase.provider';

let session = loadSession();
const authListeners = new Set();

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveSession(s) {
  session = s;
  try {
    if (s) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      if (s.provider) localStorage.setItem(PROVIDER_KEY, s.provider);
    } else {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(PROVIDER_KEY);
    }
  } catch {}
  return session;
}

function token() {
  return session?.access_token || anonKey;
}

const headers = () => ({
  'apikey': anonKey,
  'Authorization': `Bearer ${token()}`,
  'Content-Type': 'application/json'
});

function notifyAuthListeners(event, currentSession) {
  for (const fn of authListeners) {
    try {
      fn(event, currentSession);
    } catch (err) {
      console.warn('Auth listener error:', err);
    }
  }
}

export function isSupabaseConfigured() {
  return configured;
}

export function backendMode() {
  return configured ? 'Supabase authorized authentication + shared leaderboard' : 'Local browser records';
}

export function currentUser() {
  return session?.user || null;
}

export function isSignedIn() {
  return Boolean(currentUser() && session?.access_token);
}

export function getAuthProvider() {
  if (!isSignedIn()) return 'guest';
  const u = currentUser();
  const stored = (typeof localStorage !== 'undefined') ? localStorage.getItem(PROVIDER_KEY) : null;
  const rawProvider = session?.provider || stored || u?.app_metadata?.provider || u?.identities?.[0]?.provider || 'email';
  if (/google/i.test(rawProvider)) return 'Google';
  if (/github/i.test(rawProvider)) return 'GitHub';
  return 'Email & Password';
}

export function getAuthRole() {
  const u = currentUser();
  if (!u || !session?.access_token) return 'guest';
  const r = u.app_metadata?.role || u.user_metadata?.role || 'player';
  if (r === 'admin') return 'admin';
  if (r === 'moderator') return 'moderator';
  return 'player';
}

export function isAuthorized(permission) {
  const role = getAuthRole();
  switch (permission) {
    case 'submit_score':
    case 'manage_own_scores':
    case 'delete_own_score':
    case 'manage_profile':
      return role === 'player' || role === 'authenticated_player' || role === 'moderator' || role === 'admin';
    case 'moderate_leaderboard':
      return role === 'moderator' || role === 'admin';
    case 'view_leaderboard':
    case 'play_game':
      return true;
    default:
      return false;
  }
}

export function currentUserProfile() {
  const u = currentUser();
  if (!u) {
    return {
      id: null,
      email: null,
      displayName: 'Guest Player',
      avatarUrl: null,
      provider: 'guest',
      role: 'guest',
      bestScore: 0
    };
  }

  const meta = u.user_metadata || {};
  const displayName = meta.display_name || meta.full_name || meta.name || meta.user_name || u.email?.split('@')[0] || 'Player';
  const avatarUrl = meta.avatar_url || meta.picture || null;
  const bestScore = Number(meta.best_score || session?.bestScore || 0);

  return {
    id: u.id,
    email: u.email || null,
    displayName: String(displayName).slice(0, 40),
    avatarUrl,
    provider: getAuthProvider(),
    role: getAuthRole(),
    bestScore
  };
}

async function authRequest(path, body, method = 'POST') {
  if (!configured) throw new Error('Supabase is not configured');
  let res;
  try {
    res = await fetch(`${url}/auth/v1/${path}`, {
      method,
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new Error('Unable to connect. Please try again.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const raw = data.msg || data.message || data.error_description || `Authentication failed (${res.status})`;
    if (/invalid login credentials/i.test(raw)) throw new Error('Invalid email or password.');
    if (/email not confirmed/i.test(raw)) throw new Error('Please verify your email.');
    throw new Error(raw);
  }
  return data;
}

/**
 * Real Supabase Google and GitHub OAuth implementation.
 * Redirects the user to Supabase's authorize endpoint.
 */
export async function signInWithOAuth({ provider, options = {} }) {
  if (!configured) throw new Error('Supabase is not configured');
  const cleanProvider = String(provider).toLowerCase();
  if (!['google', 'github'].includes(cleanProvider)) {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  const currentOrigin = (typeof window !== 'undefined' && window.location?.origin)
    ? window.location.origin
    : '';
  const redirectTo = options.redirectTo || currentOrigin;
  const authUrl = `${url}/auth/v1/authorize?provider=${encodeURIComponent(cleanProvider)}&redirect_to=${encodeURIComponent(redirectTo)}`;

  if (typeof window !== 'undefined' && window.location) {
    try {
      localStorage.setItem(PROVIDER_KEY, cleanProvider);
    } catch {}
    window.location.assign(authUrl);
  }

  return { data: { provider: cleanProvider, url: authUrl }, error: null };
}

/**
 * Restores session from localStorage or handles OAuth return hash on application startup.
 */
export async function initSupabaseAuth() {
  if (!configured || typeof window === 'undefined') {
    return { session: currentUser(), error: null };
  }

  // 1. Check if returning from OAuth redirect with access_token or error in hash
  const hash = window.location.hash || '';
  if (hash.includes('access_token=') || hash.includes('error=')) {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const errorDesc = params.get('error_description') || params.get('error');

    if (errorDesc) {
      try {
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
      } catch {}
      return { session: null, error: errorDesc };
    }

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresIn = Number(params.get('expires_in') || 3600);

    if (accessToken) {
      try {
        const userRes = await fetch(`${url}/auth/v1/user`, {
          headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }
        });
        const user = await userRes.json();
        const storedProvider = (typeof localStorage !== 'undefined') ? localStorage.getItem(PROVIDER_KEY) : null;
        const provider = user.app_metadata?.provider || storedProvider || 'oauth';

        const newSession = {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn,
          expires_at: Date.now() + expiresIn * 1000,
          user,
          provider
        };
        saveSession(newSession);

        try {
          history.replaceState(null, document.title, window.location.pathname + window.location.search);
        } catch {}

        notifyAuthListeners('SIGNED_IN', newSession);
        ensureProfile(user).catch(() => {});
        return { session: newSession, error: null };
      } catch (err) {
        return { session: null, error: err.message };
      }
    }
  }

  // 2. Check existing stored session
  const s = loadSession();
  if (s?.access_token) {
    // If expired and refresh token available, refresh
    if (s.expires_at && Date.now() > s.expires_at && s.refresh_token) {
      try {
        const refreshRes = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: { apikey: anonKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: s.refresh_token })
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          const refreshed = {
            ...s,
            ...data,
            expires_at: Date.now() + (Number(data.expires_in) || 3600) * 1000
          };
          saveSession(refreshed);
          notifyAuthListeners('TOKEN_REFRESHED', refreshed);
          return { session: refreshed, error: null };
        } else {
          saveSession(null);
          notifyAuthListeners('SIGNED_OUT', null);
        }
      } catch {}
    } else {
      notifyAuthListeners('INITIAL_SESSION', s);
    }
  }

  return { session: loadSession(), error: null };
}

export function onAuthStateChange(callback) {
  authListeners.add(callback);
  if (session) {
    try { callback('INITIAL_SESSION', session); } catch {}
  }
  return {
    data: {
      subscription: {
        unsubscribe: () => authListeners.delete(callback)
      }
    }
  };
}

export async function signUp(email, password, displayName) {
  const cleanName = String(displayName || 'Player').trim().slice(0, 40);
  const data = await authRequest('signup', {
    email,
    password,
    data: { display_name: cleanName, role: 'player' }
  });
  if (data.access_token) {
    data.provider = 'email';
    saveSession(data);
    notifyAuthListeners('SIGNED_IN', data);
    ensureProfile(data.user).catch(() => {});
  }
  return data;
}

export async function signIn(email, password) {
  const data = await authRequest('token?grant_type=password', { email, password });
  data.provider = 'email';
  saveSession(data);
  notifyAuthListeners('SIGNED_IN', data);
  ensureProfile(data.user).catch(() => {});
  return data;
}

export async function signInWithPassword({ email, password }) {
  return signIn(email, password);
}

export async function signOut() {
  try {
    if (session?.access_token) await authRequest('logout');
  } finally {
    saveSession(null);
    notifyAuthListeners('SIGNED_OUT', null);
  }
}

export async function updateDisplayName(displayName) {
  if (!isAuthorized('manage_profile')) throw new Error('Sign in required to update display name');
  const clean = String(displayName || '').trim().slice(0, 40);
  if (!clean) throw new Error('Display name cannot be empty');
  
  await authRequest('user', { data: { display_name: clean } }, 'PUT');
  if (session?.user) {
    session.user.user_metadata = session.user.user_metadata || {};
    session.user.user_metadata.display_name = clean;
    saveSession(session);
  }

  // Update in profiles table if it exists
  try {
    await request(`profiles?id=eq.${session.user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ display_name: clean, updated_at: new Date().toISOString() })
    });
  } catch {}

  return clean;
}

async function ensureProfile(user) {
  if (!configured || !user?.id) return;
  const meta = user.user_metadata || {};
  const name = meta.display_name || meta.full_name || meta.name || meta.user_name || user.email?.split('@')[0] || 'Player';
  const avatar = meta.avatar_url || meta.picture || null;
  try {
    await request('profiles', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        id: user.id,
        display_name: String(name).slice(0, 40),
        avatar_url: avatar,
        role: 'player'
      })
    });
  } catch {}
}

async function request(path, options = {}) {
  if (!configured) throw new Error('Supabase is not configured');
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${body.slice(0, 180)}`);
  }
  return res.status === 204 ? null : res.json();
}

/**
 * Fetches the global leaderboard from Supabase.
 * Enforces highest scores first and deduplicates entries per user.
 */
export async function fetchLeaderboard(limit = 15) {
  if (!configured) throw new Error('Supabase is not configured');
  const currentUid = currentUser()?.id;
  let rows = [];

  try {
    rows = await request(`leaderboard?select=id,score,completion_time,caught_count,player_name,user_id,created_at&limit=${Math.min(50, Math.max(1, limit * 2))}`);
  } catch {
    // Fallback directly to game_scores if view does not exist yet
    rows = await request(`game_scores?select=id,score,completion_time,caught_count,player_name,user_id,created_at&order=score.desc,completion_time.asc&limit=${Math.min(50, Math.max(1, limit * 2))}`);
  }

  // Deduplicate by user_id so each player appears only once with their best score
  const seenUsers = new Set();
  const deduped = [];

  for (const r of rows) {
    const key = r.user_id || r.id;
    if (r.user_id && seenUsers.has(r.user_id)) continue;
    if (r.user_id) seenUsers.add(r.user_id);

    deduped.push({
      id: r.id,
      score: Number(r.score),
      time: Number(r.completion_time || 0),
      caught: Number(r.caught_count || 0),
      playerName: r.player_name || 'Player',
      userId: r.user_id || null,
      isOwner: Boolean(currentUid && r.user_id === currentUid),
      date: r.created_at
    });

    if (deduped.length >= limit) break;
  }

  // Sort highest score first, then lowest time, lowest catches
  deduped.sort((a, b) => b.score - a.score || a.time - b.time || a.caught - b.caught);
  return deduped;
}

export async function fetchPlayerBestScore(userId) {
  if (!configured || !userId) return 0;
  try {
    const profile = await request(`profiles?id=eq.${userId}&select=best_score`);
    if (profile?.length && profile[0]?.best_score !== undefined) {
      return Number(profile[0].best_score);
    }
  } catch {}

  try {
    const rows = await request(`game_scores?user_id=eq.${userId}&select=score&order=score.desc&limit=1`);
    if (rows?.length) return Number(rows[0].score);
  } catch {}

  return 0;
}

export async function fetchMyScores(limit = 10) {
  if (!isAuthorized('manage_own_scores')) return [];
  const u = currentUser();
  const rows = await request(`game_scores?select=id,score,completion_time,caught_count,player_name,created_at&user_id=eq.${u.id}&order=score.desc,completion_time.asc&limit=${Math.min(20, limit)}`);
  return rows.map(r => ({
    id: r.id,
    score: Number(r.score),
    time: Number(r.completion_time),
    caught: Number(r.caught_count),
    playerName: r.player_name || 'Player',
    date: r.created_at
  }));
}

export async function deleteMyScore(scoreId) {
  if (!isAuthorized('delete_own_score')) throw new Error('Sign in required to manage scores');
  await request(`game_scores?id=eq.${encodeURIComponent(scoreId)}`, { method: 'DELETE' });
  return true;
}

export async function submitScore(result, playerName) {
  if (!isAuthorized('submit_score')) throw new Error('Sign in required to authorize score submission');
  const profile = currentUserProfile();
  const cleanName = String(playerName || profile.displayName || 'Player').trim().slice(0, 40);
  const numericScore = Math.round(result.score);

  const rows = await request('rpc/submit_game_score', {
    method: 'POST',
    body: JSON.stringify({
      p_score: numericScore,
      p_completion_time: Math.max(0, Math.round(result.time)),
      p_caught_count: Math.max(0, Math.round(result.caught)),
      p_modaks: Math.max(0, Math.round(result.modaks || 0)),
      p_secret_found: Boolean(result.challenges?.secret),
      p_festival_items: Math.max(0, Math.round(result.festivalItems || 0)),
      p_player_name: cleanName
    })
  });

  // Update cached best score if higher
  if (session && numericScore > (session.bestScore || 0)) {
    session.bestScore = numericScore;
    saveSession(session);
  }

  return Array.isArray(rows) ? rows[0] || null : rows;
}

/**
 * Standard Supabase client object for production integration
 */
export const supabase = {
  auth: {
    signInWithOAuth,
    signInWithPassword,
    signUp: async (options) => {
      if (typeof options === 'object' && options.email) {
        return signUp(options.email, options.password, options.options?.data?.display_name);
      }
      return signUp(...arguments);
    },
    signOut,
    getSession: async () => ({ data: { session }, error: null }),
    getUser: async () => ({ data: { user: currentUser() }, error: null }),
    onAuthStateChange,
    updateUser: async ({ data }) => {
      if (data?.display_name) await updateDisplayName(data.display_name);
      return { data: { user: currentUser() }, error: null };
    }
  },
  from: (table) => ({
    select: (cols = '*') => ({
      order: (col, { ascending = true } = {}) => request(`${table}?select=${encodeURIComponent(cols)}&order=${col}.${ascending ? 'asc' : 'desc'}`),
      eq: (col, val) => request(`${table}?select=${encodeURIComponent(cols)}&${col}=eq.${encodeURIComponent(val)}`)
    })
  }),
  rpc: (fn, args) => request(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) })
};
