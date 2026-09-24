import test from 'node:test';
import assert from 'node:assert/strict';

const old = globalThis.__GMM_SUPABASE__;
globalThis.__GMM_SUPABASE__ = {};
const mod = await import('../src/supabase.js');

test('Supabase integration is safely disabled without public configuration', async () => {
  assert.equal(mod.isSupabaseConfigured(), false);
  assert.equal(mod.backendMode(), 'Local browser records');
  await assert.rejects(() => mod.fetchLeaderboard(), /not configured/);
  await assert.rejects(() => mod.signInWithOAuth({ provider: 'google' }), /not configured/);
});

test('Authorization defaults safely to guest permissions when unauthenticated', async () => {
  assert.equal(mod.getAuthRole(), 'guest');
  assert.equal(mod.isAuthorized('submit_score'), false);
  assert.equal(mod.isAuthorized('manage_own_scores'), false);
  assert.equal(mod.isAuthorized('delete_own_score'), false);
  assert.equal(mod.isAuthorized('manage_profile'), false);
  assert.equal(mod.isAuthorized('moderate_leaderboard'), false);
  assert.equal(mod.isAuthorized('view_leaderboard'), true);
  assert.equal(mod.isAuthorized('play_game'), true);

  const profile = mod.currentUserProfile();
  assert.equal(profile.role, 'guest');
  assert.equal(profile.id, null);
  assert.equal(profile.displayName, 'Guest Player');
  assert.equal(profile.provider, 'guest');

  await assert.rejects(() => mod.submitScore({ score: 100, time: 60, caught: 0 }), /sign in required/i);
  await assert.rejects(() => mod.updateDisplayName('GaneshaFan'), /sign in required/i);
  await assert.rejects(() => mod.deleteMyScore('score-123'), /sign in required/i);
});

test('Supabase OAuth supports Google and GitHub providers', async () => {
  // Mock configured state for unit tests
  globalThis.__GMM_SUPABASE__ = {
    url: 'https://test-project.supabase.co',
    anonKey: 'test-anon-key'
  };
  const configuredMod = await import(`../src/supabase.js?t=${Date.now()}`);

  assert.equal(configuredMod.isSupabaseConfigured(), true);

  const googleRes = await configuredMod.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: 'http://localhost:5173' }
  });
  assert.equal(googleRes.data.provider, 'google');
  assert.match(googleRes.data.url, /test-project\.supabase\.co\/auth\/v1\/authorize/);
  assert.match(googleRes.data.url, /provider=google/);
  assert.match(googleRes.data.url, /redirect_to=http%3A%2F%2Flocalhost%3A5173/);

  const githubRes = await configuredMod.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: 'https://test.netlify.app' }
  });
  assert.equal(githubRes.data.provider, 'github');
  assert.match(githubRes.data.url, /provider=github/);
  assert.match(githubRes.data.url, /redirect_to=https%3A%2F%2Ftest\.netlify\.app/);

  await assert.rejects(() => configuredMod.signInWithOAuth({ provider: 'unsupported_provider' }), /unsupported/i);

  // Test onAuthStateChange listener
  let receivedEvent = null;
  const sub = configuredMod.onAuthStateChange((event) => { receivedEvent = event; });
  assert.equal(typeof sub.data.subscription.unsubscribe, 'function');
  sub.data.subscription.unsubscribe();

  // Test client SDK parity
  assert.equal(typeof configuredMod.supabase.auth.signInWithOAuth, 'function');
  assert.equal(typeof configuredMod.supabase.auth.signInWithPassword, 'function');
  assert.equal(typeof configuredMod.supabase.auth.signUp, 'function');
  assert.equal(typeof configuredMod.supabase.auth.signOut, 'function');
  assert.equal(typeof configuredMod.supabase.auth.onAuthStateChange, 'function');
});

globalThis.__GMM_SUPABASE__ = old;
