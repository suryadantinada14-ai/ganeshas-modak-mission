/** Supabase Auth & Authorization + Leaderboard. Never put a service-role key in browser code. */
const config=globalThis.__GMM_SUPABASE__||{};
const url=String(config.url||'').replace(/\/$/,'');
const anonKey=String(config.anonKey||'');
const configured=Boolean(url&&anonKey&&/^https:\/\//i.test(url));
const SESSION_KEY='gmm.supabase.session';
let session=loadSession();
function loadSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
function saveSession(s){session=s;try{s?localStorage.setItem(SESSION_KEY,JSON.stringify(s)):localStorage.removeItem(SESSION_KEY)}catch{}return session}
function token(){return session?.access_token||anonKey}
const headers=()=>({'apikey':anonKey,'Authorization':`Bearer ${token()}`,'Content-Type':'application/json'});

export function isSupabaseConfigured(){return configured}
export function backendMode(){return configured?'Supabase authorized authentication + shared leaderboard':'Local browser records'}
export function currentUser(){return session?.user||null}
export function isSignedIn(){return Boolean(currentUser()&&session?.access_token)}

export function getAuthRole(){
  const u=currentUser();
  if(!u||!session?.access_token)return 'guest';
  if(u.app_metadata?.role==='admin'||u.user_metadata?.role==='admin')return 'admin';
  return 'authenticated_player';
}

export function isAuthorized(permission){
  const role=getAuthRole();
  switch(permission){
    case 'submit_score':
    case 'manage_own_scores':
    case 'delete_own_score':
    case 'manage_profile':
      return role==='authenticated_player'||role==='admin';
    case 'moderate_leaderboard':
      return role==='admin';
    case 'view_leaderboard':
    case 'play_game':
      return true;
    default:
      return false;
  }
}

export function currentUserProfile(){
  const u=currentUser();
  if(!u)return {id:null,email:null,displayName:'Guest Player',role:'guest'};
  const displayName=u.user_metadata?.display_name||u.email?.split('@')[0]||'Player';
  return {
    id:u.id,
    email:u.email||null,
    displayName,
    role:getAuthRole()
  };
}

async function authRequest(path,body,method='POST'){
  if(!configured)throw new Error('Supabase is not configured');
  const res=await fetch(`${url}/auth/v1/${path}`,{
    method,
    headers:{apikey:anonKey,'Content-Type':'application/json',...(session?.access_token?{'Authorization':`Bearer ${session.access_token}`}:{})},
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.msg||data.message||data.error_description||`Authentication failed (${res.status})`);
  return data;
}

export async function signUp(email,password,displayName){
  const cleanName=String(displayName||'Player').trim().slice(0,40);
  const data=await authRequest('signup',{email,password,data:{display_name:cleanName,role:'authenticated_player'}});
  if(data.access_token)saveSession(data);
  return data;
}

export async function signIn(email,password){
  const data=await authRequest('token?grant_type=password',{email,password});
  saveSession(data);
  return data;
}

export async function signOut(){
  try{if(session?.access_token)await authRequest('logout')}finally{saveSession(null)}
}

export async function updateDisplayName(displayName){
  if(!isAuthorized('manage_profile'))throw new Error('Sign in required to update display name');
  const clean=String(displayName||'').trim().slice(0,40);
  if(!clean)throw new Error('Display name cannot be empty');
  const data=await authRequest('user',{data:{display_name:clean}},'PUT');
  if(session?.user){
    session.user.user_metadata=session.user.user_metadata||{};
    session.user.user_metadata.display_name=clean;
    saveSession(session);
  }
  return clean;
}

async function request(path,options={}){
  if(!configured)throw new Error('Supabase is not configured');
  const res=await fetch(`${url}/rest/v1/${path}`,{...options,headers:{...headers(),...(options.headers||{})}});
  if(!res.ok){
    const body=await res.text().catch(()=>'');
    throw new Error(`Supabase ${res.status}: ${body.slice(0,180)}`);
  }
  return res.status===204?null:res.json();
}

export async function fetchLeaderboard(limit=10){
  const rows=await request(`leaderboard?select=id,score,completion_time,caught_count,player_name,user_id,created_at&limit=${Math.min(50,Math.max(1,limit))}`);
  const currentUid=currentUser()?.id;
  return rows.map(r=>({
    id:r.id,
    score:Number(r.score),
    time:Number(r.completion_time),
    caught:Number(r.caught_count),
    playerName:r.player_name||'Player',
    userId:r.user_id||null,
    isOwner:Boolean(currentUid&&r.user_id===currentUid),
    date:r.created_at
  }));
}

export async function fetchMyScores(limit=10){
  if(!isAuthorized('manage_own_scores'))return [];
  const u=currentUser();
  const rows=await request(`game_scores?select=id,score,completion_time,caught_count,player_name,created_at&user_id=eq.${u.id}&order=score.desc,completion_time.asc&limit=${Math.min(20,limit)}`);
  return rows.map(r=>({
    id:r.id,
    score:Number(r.score),
    time:Number(r.completion_time),
    caught:Number(r.caught_count),
    playerName:r.player_name||'Player',
    date:r.created_at
  }));
}

export async function deleteMyScore(scoreId){
  if(!isAuthorized('delete_own_score'))throw new Error('Sign in required to manage scores');
  await request(`game_scores?id=eq.${encodeURIComponent(scoreId)}`,{method:'DELETE'});
  return true;
}

export async function submitScore(result,playerName){
  if(!isAuthorized('submit_score'))throw new Error('Sign in required to authorize score submission');
  const profile=currentUserProfile();
  const cleanName=String(playerName||profile.displayName||'Player').trim().slice(0,40);
  const rows=await request('rpc/submit_game_score',{
    method:'POST',
    body:JSON.stringify({
      p_score:Math.round(result.score),
      p_completion_time:Math.max(0,Math.round(result.time)),
      p_caught_count:Math.max(0,Math.round(result.caught)),
      p_modaks:Math.max(0,Math.round(result.modaks||0)),
      p_secret_found:Boolean(result.challenges?.secret),
      p_festival_items:Math.max(0,Math.round(result.festivalItems||0)),
      p_player_name:cleanName
    })
  });
  return Array.isArray(rows)?rows[0]||null:rows;
}

