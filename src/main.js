import {createGame,update,moveCharacter,interact,toggleHide,switchCharacter,solvePuzzleStep,closeModal,continueAfterCatch,startGame,pauseGame,restartGame,formatTime,nearestInteraction,AI,CHARACTER} from './engine.js';
import {loadRecords,recordResult} from './records.js';
import {
  isSupabaseConfigured,backendMode,fetchLeaderboard,fetchMyScores,deleteMyScore,submitScore,fetchPlayerBestScore,
  currentUser,isSignedIn,signUp,signIn,signInWithOAuth,signInWithPassword,signOut,getAuthRole,isAuthorized,currentUserProfile,updateDisplayName,
  initSupabaseAuth,onAuthStateChange,getAuthProvider,supabase
} from './supabase.js';
import {currentObjective,tutorialPrompt} from './guidance.js';
import {render,renderStory} from './render.js';

const GOOGLE_ICON=`<svg class="oauth-icon" viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>`;
const GITHUB_ICON=`<svg class="oauth-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`;


const $=s=>document.querySelector(s);const canvas=$('#game'),ctx=canvas.getContext('2d');
const overlay=$('#overlay'),modal=$('#modal'),toast=$('#toast'),context=$('#context');
let game=createGame(),sceneIndex=0,scoreSaved=false,last=performance.now(),soundOn=false,audio=null,lastMessage=0,cinematicTimer=null,finalShown=false,ambientNext=0,ambientBeat=0,stepNext=0;
function resetInput(){keys.clear();Object.keys(touch).forEach(k=>touch[k]=false)}
const keys=new Set(),touch={up:false,down:false,left:false,right:false,run:false};
const scenes=[
  {title:'A Ganesh Chaturthi Morning',body:'Sunrise warms the pandal. Diyas, flowers, rangoli and puja items wait for the celebration.',art:'morning'},
  {title:'The Modaks Are Ready',body:'Maa Parvati finishes a fresh plate of modaks while festival preparations continue.',art:'modaks'},
  {title:'A Familiar Aroma…',body:'Ganesha pauses. The fragrance of modaks has definitely found him.',art:'smell'},
  {title:'“These modaks are for the celebration.”',body:'Parvati: “Wait until the puja is ready.” Ganesha: “Of course, Maa.” After she leaves: “One little modak…”',art:'promise'}
];

function safeStore(){try{return localStorage}catch{return null}}
function board(){return loadRecords(safeStore()).runs;}
async function saveScore(){
  if(scoreSaved)return true;
  scoreSaved=recordResult(safeStore(),game.final);
  if(isSupabaseConfigured()&&isSignedIn()){
    try{
      await submitScore(game.final);
      toastMsg('Score synced to shared leaderboard');
    }catch(err){
      console.warn('Shared leaderboard unavailable; local score kept.',err.message);
    }
  }else if(isSupabaseConfigured()){
    toastMsg('Score saved locally · Sign in to sync online');
  }
  return scoreSaved;
}
function show(){overlay.classList.remove('hidden');overlay.inert=false;resetInput();requestAnimationFrame(()=>{modal.querySelector('button')?.focus({preventScroll:true});modal.scrollTop=0;})}
function hide(){overlay.classList.add('hidden');overlay.inert=true;resetInput();delete modal.dataset.mode;}
function btn(label,id,secondary=false){return `<button ${id?`data-action="${id}"`:''} class="${secondary?'secondary':''}">${label}</button>`}

async function getBestScoreDisplay(){
  const localBest=loadRecords(safeStore())?.bestScore||0;
  if(!isSupabaseConfigured()||!isSignedIn())return localBest;
  try{
    const onlineBest=await fetchPlayerBestScore(currentUser()?.id);
    return Math.max(localBest,onlineBest);
  }catch{
    return localBest;
  }
}

function updateAuthUI(){
  const btnEl=$('#auth-btn');
  if(!btnEl)return;
  const p=currentUserProfile(),role=getAuthRole(),signed=isSignedIn();
  btnEl.dataset.role=role;
  if(signed){
    btnEl.innerHTML=`<span class="role-dot"></span><span>${escapeHtml(p.displayName)}</span>`;
    btnEl.title=`Signed in as ${p.displayName} (${role==='admin'?'Admin':role==='moderator'?'Moderator':'Player'})`;
  }else{
    btnEl.innerHTML=`<span class="role-dot"></span><span>Guest</span>`;
    btnEl.title='Guest mode · Click to sign in or create account';
  }
}

function mainMenu(){
  toast.classList.remove('show');toast.textContent='';stepNext=0;clearTimeout(cinematicTimer);
  game=createGame();finalShown=false;lastMessage=0;scoreSaved=false;resetInput();show();
  updateAuthUI();
  const p=currentUserProfile(),signed=isSignedIn(),role=getAuthRole();
  modal.innerHTML=`<div class="tag">CONTEST POLISH v3 · GANESH CHATURTHI</div>
<h2>Ganesha’s Modak Mission</h2>
<p><b>Sneak. Solve. Celebrate.</b></p>
<p>Collect the modaks, help complete the festival preparations, sneak past Maa Parvati as she prepares the puja, and bring the celebration to life.</p>
<p class="auth-status">${signed?`Signed in as <b>${escapeHtml(p.displayName)}</b> <span class="auth-pill ${role}">${role==='admin'?'Admin':role==='moderator'?'Moderator':'Player'}</span>`:`Playing in <b>Guest Mode</b> <span class="auth-pill guest">Guest</span>`}</p>
<div class="modal-actions">
  ${btn('PLAY','cinematic')}
  ${btn('HOW TO PLAY','how',true)}
  ${btn('LEADERBOARD','board',true)}
  ${btn(signed?'ACCOUNT & ACCESS':'SIGN IN / REGISTER',signed?'account':'auth',true)}
</div>`;
}

async function accountMenu(message=''){
  show();
  const p=currentUserProfile(),role=getAuthRole(),signed=isSignedIn();
  if(!signed){authMenu('signin');return;}
  const bestScore=await getBestScoreDisplay();
  modal.innerHTML=`<div class="tag">PLAYER ACCOUNT</div>
<h2>${escapeHtml(p.displayName)}</h2>
<div class="account-card">
  <div class="account-header">
    <div class="account-user">
      <div class="account-avatar">${p.avatarUrl?`<img src="${escapeHtml(p.avatarUrl)}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`:'🪔'}</div>
      <div class="account-details">
        <b>${escapeHtml(p.displayName)}</b>
        <span>${escapeHtml(p.email||'OAuth Account')}</span>
      </div>
    </div>
    <span class="auth-pill ${role}">${role==='admin'?'Admin':role==='moderator'?'Moderator':'Player'}</span>
  </div>
  <div class="account-info-grid">
    <div class="account-info-item">
      <span>Authentication Provider</span>
      <strong>${escapeHtml(p.provider||getAuthProvider())}</strong>
    </div>
    <div class="account-info-item">
      <span>Best Score</span>
      <strong style="color:var(--gold);font-family:Georgia,serif;font-size:18px;">${bestScore>0?bestScore:'—'}</strong>
    </div>
  </div>
  <div class="permissions-title" style="margin-top:10px">Update Display Name</div>
  <div class="name-edit-form">
    <input id="edit-display-name" class="name-input" value="${escapeHtml(p.displayName)}" maxlength="40" placeholder="Display name" autocomplete="nickname">
    <button data-action="save-name">Save</button>
  </div>
</div>
${message?`<p class="auth-message">${escapeHtml(message)}</p>`:''}
<div class="modal-actions">
  ${btn('MY SCORES','board-mine')}
  ${btn('SIGN OUT','signout',true)}
  ${btn('BACK','menu',true)}
</div>`;
}

function authMenu(mode='signin',message=''){
  show();
  const isSignUp=mode==='signup';
  modal.innerHTML=`<div class="tag">WELCOME, PLAYER</div>
<h2>${isSignUp?'Create Account':'Welcome, Player'}</h2>
<p class="fine">${isSignUp?'Create an account to save your scores and compete on the leaderboard.':'Save your scores and compete on the leaderboard.'}</p>

<button class="oauth-btn google" data-action="oauth-google" aria-label="Continue with Google">
  ${GOOGLE_ICON}
  <span>Continue with Google</span>
</button>

<button class="oauth-btn github" data-action="oauth-github" aria-label="Continue with GitHub">
  ${GITHUB_ICON}
  <span>Continue with GitHub</span>
</button>

<div class="auth-divider"><span>OR</span></div>

${message?`<p class="auth-message error">${escapeHtml(message)}</p>`:''}

<div class="auth-form">
  ${isSignUp?`
    <label class="auth-field-label" for="auth-name">Player Name</label>
    <input id="auth-name" class="name-input" maxlength="40" placeholder="Display name (for leaderboard)" autocomplete="nickname">
  `:''}
  <label class="auth-field-label" for="auth-email">Email</label>
  <input id="auth-email" class="name-input" type="email" placeholder="player@example.com" autocomplete="email">
  <label class="auth-field-label" for="auth-password">Password</label>
  <input id="auth-password" class="name-input" type="password" minlength="6" placeholder="${isSignUp?'At least 6 characters':'Enter your password'}" autocomplete="${isSignUp?'new-password':'current-password'}">
</div>

<div class="modal-actions auth-actions">
  ${isSignUp
    ?`<button class="auth-submit-btn" data-action="do-signup">CREATE ACCOUNT</button>`
    :`<button class="auth-submit-btn" data-action="do-signin">SIGN IN</button>`
  }
  ${isSignUp
    ?`<button class="link-btn" data-action="auth-mode-signin">Already have an account? <b>Sign In</b></button>`
    :`<button class="link-btn" data-action="auth-mode-signup">Don’t have an account? <b>Create Account</b></button>`
  }
  <button class="secondary" data-action="auth-guest">CONTINUE AS GUEST</button>
</div>`;
}

async function doAuth(kind){
  const email=$('#auth-email')?.value.trim();
  const password=$('#auth-password')?.value||'';
  const name=$('#auth-name')?.value.trim()||'Player';

  if(!email||password.length<6){
    authMenu(kind,'Enter a valid email and a password of at least 6 characters.');
    return;
  }

  try{
    if(kind==='signup'){
      const data=await signUp(email,password,name);
      updateAuthUI();
      if(data.access_token){
        if(game.completed&&!scoreSaved)await saveScore();
        accountMenu('Account created and signed in.');
        toastMsg(`Welcome, ${name}!`);
      }else{
        authMenu('signin','Account created! Please check your email to verify your account, then sign in.');
      }
    }else{
      await signIn(email,password);
      updateAuthUI();
      if(game.completed&&!scoreSaved)await saveScore();
      accountMenu('Signed in successfully — online score saving authorized.');
      toastMsg('Signed in — online score saving enabled.');
    }
  }catch(err){
    authMenu(kind,err.message);
  }
}

function howTo(){
  show();
  modal.innerHTML=`<div class="tag">HOW TO PLAY</div><h2>Festival Mission</h2><p>Explore the puja room, living room, kitchen, courtyard, storage area and secret passage. Observe Parvati, use hiding spots and distractions, solve three festival puzzles, switch to Mushak for tiny passages, collect five modaks and finish every preparation objective.</p><p><b>Desktop:</b> WASD / arrows move · Shift run · E interact · Space hide · Q switch · Tab objectives · Esc pause.</p><p><b>Mobile:</b> Direction pad plus Use, Run, Hide and Mushak buttons.</p><p class="fine">Leaderboard mode: ${backendMode()}.</p><div class="modal-actions">${btn('BACK','menu',true)}${btn('START','cinematic')}</div>`;
}

async function showBoard(view='all'){
  const local=board();
  show();
  const signed=isSignedIn();
  const showTabs=isSupabaseConfigured()&&signed;
  const bestScore=await getBestScoreDisplay();

  modal.innerHTML=`<div class="tag">${isSupabaseConfigured()?'GLOBAL LEADERBOARD':'LOCAL LEADERBOARD'}</div>
<h2>${view==='mine'?'My Submitted Scores':(isSupabaseConfigured()?'Global Leaderboard':'Your Best Runs')}</h2>
${signed&&bestScore>0?`
<div class="your-best-callout">
  <span>YOUR BEST</span>
  <strong>${bestScore}</strong>
</div>`:''}
${showTabs?`<div class="leaderboard-tabs">${btn('Global Board','board-all',view!=='all')}${btn('My Scores','board-mine',view==='all')}</div>`:''}
<p class="fine">${isSupabaseConfigured()?'Authenticated scores synced and ordered by highest score first.':'Stored on this browser only. Configure Supabase for a shared board.'}</p>
<p class="leader-status">Loading scores…</p>
<div class="modal-actions">
  ${game.completed?btn('RESULTS','results'):''}
  ${btn(signed?'ACCOUNT':'SIGN IN / REGISTER',signed?'account':'auth',true)}
  ${btn('MAIN MENU','menu',true)}
</div>`;

  let rows=[];
  if(!isSupabaseConfigured()){
    rows=local.map((r,i)=>({rank:i+1,player:'You',score:r.score,time:r.time,caught:r.caught,isOwner:true}));
  }else if(view==='mine'){
    try{
      const mine=await fetchMyScores(15);
      rows=mine.map((r,i)=>({id:r.id,rank:i+1,player:r.playerName,score:r.score,time:r.time,caught:r.caught,isOwner:true}));
    }catch(err){
      const status=modal.querySelector('.leader-status');
      if(status)status.textContent='Could not load personal scores: '+err.message;
      return;
    }
  }else{
    try{
      const online=await fetchLeaderboard(15);
      rows=online.map((r,i)=>({id:r.id,rank:i+1,player:r.playerName,score:r.score,time:r.time,caught:r.caught,isOwner:r.isOwner}));
    }catch(err){
      const status=modal.querySelector('.leader-status');
      if(status)status.textContent='Shared board unavailable; showing local records.';
      rows=local.map((r,i)=>({rank:i+1,player:'You',score:r.score,time:r.time,caught:r.caught,isOwner:true}));
    }
  }

  const status=modal.querySelector('.leader-status');
  if(!rows.length){
    if(status)status.textContent=view==='mine'?'No personal scores synced yet. Complete the mission to set one!':'No scores yet. Complete the mission to set the first one.';
    return;
  }

  if(status){
    status.outerHTML=`<table class="leader-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Player</th>
          <th>Score</th>
          <th>Time</th>
          <th>Catches</th>
          ${view==='mine'?'<th>Action</th>':''}
        </tr>
      </thead>
      <tbody>
        ${rows.map(r=>`<tr class="${r.isOwner?'owner-row':''}">
          <td>${r.rank}</td>
          <td><b>${escapeHtml(r.player||'Player')}</b>${r.isOwner?'<span class="owner-tag">YOU</span>':''}</td>
          <td>${r.score}</td>
          <td>${formatTime(r.time)}</td>
          <td>${r.caught}</td>
          ${view==='mine'&&r.id?`<td><button class="del-btn" data-action="del-score" data-id="${escapeHtml(r.id)}" title="Delete score">🗑 Delete</button></td>`:view==='mine'?'<td>—</td>':''}
        </tr>`).join('')}
      </tbody>
    </table>`;
  }
}


function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function cinematic(i=0){clearTimeout(cinematicTimer);if(i>=scenes.length){missionStart();return}const s=scenes[i];sceneIndex=i;show();modal.innerHTML=`<div class="cinematic"><div class="tag">CINEMATIC · ${i+1}/${scenes.length}</div><canvas id="story-art" class="cinematic-art" aria-label="Original festival illustration with Ganesha, Maa Parvati, Mushak and modaks"></canvas><h3>${s.title}</h3><p>${s.body}</p><div class="modal-actions">${btn('SKIP','skip',true)}${btn(i===scenes.length-1?'MISSION START':'NEXT',`scene:${i+1}`)}</div></div>`;cinematicTimer=setTimeout(()=>cinematic(i+1),4500)}
function missionStart(){clearTimeout(cinematicTimer);startGame(game);hide();toastMsg('MISSION · Prepare the Ganesh Chaturthi celebration.');canvas.focus();}
function objectives(){if(game.phase!=='playing'||game.modal)return;const o=game.objectives;show();modal.innerHTML=`<div class="tag">FESTIVAL PREPARATION</div><h2>Objectives</h2><div class="objective-panel">${row('🍬 Modaks',o.modaks,5)}${row('🌺 Flowers',o.flowers,3)}${row('🌿 Durva',o.durva,3)}${row('🪔 Diyas',o.diyas,2)}${row('🎨 Rangoli',o.rangoli,1)}${row('🎊 Decorations',o.decorations,3)}</div><p>Festival clock: ${game.countdownExpired?'Free play':formatTime(game.remaining)} · running makes noise. Catch: +10 seconds and −50 points.</p><p>Optional goals: under 5:00 · no catches · Secret Modak.</p><p>Bonus puzzles: Festival Box ${game.puzzle.box?'✓':'·'} · Diya Sequence ${game.puzzle.diya?'✓':'·'} · Bell Distraction ${game.puzzle.bell?'✓':'·'} · Secret Passage ${game.puzzle.secretLever?'✓':'·'}</p><div class="modal-actions">${btn('RESUME','resume')}</div>`;pauseGame(game,true)}
const row=(name,a,b)=>`<div class="objective-row ${a>=b?'complete':''}"><span>${a>=b?'✓ ':''}${name}</span><b>${a}/${b}</b></div>`;
function pauseMenu(){if(game.phase!=='playing'||game.modal)return;pauseGame(game,true);show();modal.innerHTML=`<div class="tag">PAUSED</div><h2>Festival Break</h2><p>Take a look at Parvati’s patrol, then continue your route.</p><div class="modal-actions">${btn('RESUME','resume')}${btn('OBJECTIVES','objectives',true)}${btn('RESTART','restart',true)}${btn('MAIN MENU','menu',true)}</div>`;}
const puzzleConfig={
 boxPuzzle:{title:'Festival Box',hint:'Repeat the symbols carved into the lid.',target:['diya','flower','durva'],labels:{diya:'🪔 Diya',flower:'🌺 Flower',durva:'🌿 Durva'},options:['flower','durva','diya'],reward:'Unlocks the Golden Modak · +80'},
 diyaPuzzle:{title:'Light the Directions',hint:'Begin at sunrise. Follow the clockwise path.',target:['east','south','west','north'],labels:{east:'E →',south:'S ↓',west:'W ←',north:'N ↑'},options:['north','west','east','south'],reward:'Opens the passage shortcut · +90'},
 rangoli:{title:'Recreate the Rangoli',hint:'Copy the petals from 1 to 4. The pattern stays visible.',target:['saffron','pink','green','blue'],labels:{saffron:'Saffron',pink:'Pink',green:'Green',blue:'Blue'},options:['blue','green','saffron','pink'],reward:'First try +150 · completion after a retry +100'}
};
function puzzleUI(type){
 const p=puzzleConfig[type];show();modal.innerHTML=`<div class="tag">FESTIVAL PUZZLE</div><h2>${p.title}</h2><p>${p.hint}</p><div class="pattern" aria-label="Pattern to reproduce">${p.target.map((v,i)=>`<div class="pattern-token ${v}"><small>${i+1}</small><span>${p.labels[v]}</span></div>`).join('')}</div><div id="sequence-progress" class="sequence-progress" role="status">Your sequence: —</div><div class="puzzle-grid">${p.options.map(v=>`<button class="symbol ${v}" data-choice="${v}" aria-label="Choose ${p.labels[v]}">${p.labels[v]}</button>`).join('')}</div><p class="fine">${p.reward}<br>A wrong choice makes a small sound nearby. Time and movement pause while choosing.</p>${btn('BACK TO GAME','puzzle-cancel',true)}`;
}
function puzzleProgress(){if(!game.modal)return;const p=puzzleConfig[game.modal.type];const el=$('#sequence-progress');if(el)el.textContent='Your sequence: '+(game.modal.sequence.map(v=>p.labels[v]).join(' → ')||'Try again · —');}
function caughtUI(){show();modal.innerHTML=`<div class="tag">CAUGHT · GAME OVER</div><h2>“Ganesha! Again?”</h2><p>Maa Parvati has spotted Ganesha. The stealth attempt is over — nobody is harmed.</p><p><b>If Ganesha gets caught, the game is over.</b></p><div class="modal-actions">${btn('PLAY AGAIN','restart')}${btn('MAIN MENU','menu',true)}</div>`;}
function celebrationUI(){
 if(finalShown)return;finalShown=true;const f=game.final;saveScore();const best=loadRecords(safeStore());show();
 const challenges=[['master','MASTER','Finish under 5:00'],['stealth','STEALTH','No catches'],['secret','SECRET','Find the Secret Modak']];
 const p=currentUserProfile(),signed=isSignedIn();
 modal.innerHTML=`<div class="tag">🪔 GANESH CHATURTHI CELEBRATION 🪔</div><h2>Ganpati Bappa Morya!</h2><div class="tag">MISSION COMPLETE</div><h3>${f.rating}</h3><div class="challenge-heading">${Object.values(f.challenges).filter(Boolean).length} / 3 CHALLENGES COMPLETE</div><div class="challenges">${challenges.map(([key,title,desc])=>`<div class="${f.challenges[key]?'achieved':''}"><b>${f.challenges[key]?'✓':'○'} ${title}</b><small>${desc}</small></div>`).join('')}</div><div class="score-breakdown"><span>Final score</span><b>${f.score}</b><span>Completion time</span><b>${formatTime(f.time)}</b><span>Modaks</span><b>${f.modaks} collected${f.challenges.secret?' · Secret ✓':''}</b><span>Festival items</span><b>${f.festivalItems} / 11</b><span>Puzzles</span><b>${f.puzzles} / 2</b><span>Rangoli</span><b>${f.rangoli} / 1</b><span>Times caught</span><b>${f.caught}</b><span>Stealth bonus</span><b>+${f.stealthBonus}</b><span>Time bonus</span><b>+${f.timeBonus}</b><span>Festival bonus</span><b>+${f.festivalBonus}</b></div><p class="personal-best">BEST SCORE ${best.bestScore??'—'} · BEST TIME ${best.bestTime===null?'—':formatTime(best.bestTime)} · LOWEST CATCHES ${best.lowestCatches??'—'}</p>${isSupabaseConfigured()?(signed?`<div class="sync-callout"><p>🛡️ <b>Authorized Submission:</b> Synced to the global leaderboard under <b>${escapeHtml(p.displayName)}</b>.</p></div>`:`<div class="sync-callout"><p>🎮 <b>Guest Run Saved Locally:</b> Sign in to authorize and sync this score to the global leaderboard!</p>${btn('SIGN IN & SYNC SCORE','celebration-auth')}</div>`):'<p class="fine">Result saved on this browser. Configure Supabase for a shared leaderboard.</p>'}<div class="modal-actions">${btn('PLAY AGAIN','restart')}${btn('LEADERBOARD','board',true)}${btn('MAIN MENU','menu',true)}</div>`;
}

function toastMsg(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toast.classList.remove('show'),1800)}
function audioCtx(){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return null;if(!audio)audio=new Audio();return audio}catch{return null}}
function tone(freq=440,d=.08,type='sine',gain=.04){if(!soundOn)return;const a=audioCtx();if(!a||a.state!=='running')return;const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(gain,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+d);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+d)}
function cue(msg){if(/collected|solved|opened|mastered/.test(msg)){tone(660,.09);setTimeout(()=>tone(880,.1),70)}else if(/HIDDEN/.test(msg))tone(330,.1);else if(/caught/i.test(msg))tone(180,.2,'triangle',.06);else if(/noise|little/.test(msg))tone(240,.12,'square',.025)}
function ambientPulse(now){if(!soundOn||!['playing','celebration'].includes(game.phase)||game.paused||game.modal||now<ambientNext)return;ambientNext=now+(game.celebration?230:820);ambientBeat=(ambientBeat+1)%4;tone(ambientBeat===0?110:ambientBeat===2?135:220,.11,ambientBeat%2?'sine':'triangle',game.celebration?.04:.009)}
function victoryCue(){[110,165,130,196,523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,i<4?.12:.25,i<4?'triangle':'sine',i<4?.035:.05),i*120))}

function syncModal(){if(game.modal?.type==='caught'){if(modal.dataset.mode!=='caught'){modal.dataset.mode='caught';caughtUI()}return}if(game.modal&&['boxPuzzle','diyaPuzzle','rangoli'].includes(game.modal.type)){if(modal.dataset.mode!==game.modal.type){modal.dataset.mode=game.modal.type;puzzleUI(game.modal.type)}return}if(!game.modal)delete modal.dataset.mode;}
function use(){const r=interact(game);if(r?.type==='noise'){toastMsg(r.id==='bell'?'Bell rings — Parvati investigates!':'Clang! Parvati heard that.');tone(r.id==='bell'?720:280,.25,'triangle',.05)}if(game.modal)syncModal();}

modal.addEventListener('click',e=>{
  const target=e.target.closest('[data-action]');
  const a=target?.dataset.action;
  if(a){
    if(a==='cinematic')cinematic(0);
    else if(a==='how')howTo();
    else if(a==='menu')mainMenu();
    else if(a==='board')showBoard('all');
    else if(a==='board-all')showBoard('all');
    else if(a==='board-mine')showBoard('mine');
    else if(a==='my-scores')showBoard('mine');
    else if(a==='oauth-google'){
      signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}}).catch(err=>authMenu('signin',err.message));
    }
    else if(a==='oauth-github'){
      signInWithOAuth({provider:'github',options:{redirectTo:window.location.origin}}).catch(err=>authMenu('signin',err.message));
    }
    else if(a==='auth'||a==='auth-mode-signin')authMenu('signin');
    else if(a==='auth-mode-signup')authMenu('signup');
    else if(a==='auth-guest'){toastMsg('Playing as Guest · Scores saved locally');mainMenu();}
    else if(a==='account')accountMenu();
    else if(a==='celebration-auth')authMenu('signin','Sign in to save your score to the global leaderboard.');
    else if(a==='do-signin')doAuth('signin');
    else if(a==='do-signup')doAuth('signup');
    else if(a==='save-name'){
      const newName=$('#edit-display-name')?.value.trim();
      if(!newName){accountMenu('Display name cannot be empty.');return;}
      updateDisplayName(newName).then(()=>{
        updateAuthUI();
        accountMenu('Display name updated!');
        toastMsg('Display name updated');
      }).catch(err=>accountMenu(err.message));
    }
    else if(a==='del-score'){
      const id=target?.dataset.id;
      if(id){
        deleteMyScore(id).then(()=>{
          toastMsg('Score deleted');
          showBoard('mine');
        }).catch(err=>toastMsg('Could not delete: '+err.message));
      }
    }
    else if(a==='signout'){
      signOut().finally(()=>{updateAuthUI();mainMenu();toastMsg('Signed out');});
    }
    else if(a==='results'){finalShown=false;celebrationUI();}
    else if(a==='skip')missionStart();
    else if(a.startsWith('scene:'))cinematic(+a.split(':')[1]);
    else if(a==='resume'){pauseGame(game,false);closeModal(game);hide();canvas.focus();}
    else if(a==='objectives')objectives();
    else if(a==='restart'){
      game=restartGame();toast.classList.remove('show');toast.textContent='';stepNext=0;finalShown=false;scoreSaved=false;lastMessage=0;hide();canvas.focus();
    }
    else if(a==='continue'){continueAfterCatch(game);}
    else if(a==='puzzle-cancel'){closeModal(game);hide();canvas.focus();}
    else if(a==='close-modal'){closeModal(game);hide();canvas.focus();}
    else if(a==='save'){
      const saved=saveScore($('#player-name')?.value);
      toastMsg(saved?'Score saved locally':'Local score storage is unavailable');
      if(saved)showBoard('all');
    }
  }
  const c=e.target.closest('[data-choice]')?.dataset.choice;
  if(c){
    if(c==='reset'){game.modal.sequence=[];toastMsg('Sequence reset');return;}
    const r=solvePuzzleStep(game,c);
    tone(r.ok?560:200,.08,r.ok?'sine':'square',.04);
    if(r.done){hide();toastMsg('Puzzle complete!');canvas.focus();}
    else{puzzleProgress();if(r.reset)toastMsg('A small sound… Parvati may investigate nearby.');}
  }
});


function resume(){pauseGame(game,false);hide();canvas.focus();}
window.addEventListener('keydown',e=>{
 const isOverlay=!overlay.classList.contains('hidden');
 if(isOverlay){
  if(e.key==='Tab'){
   const els=[...modal.querySelectorAll('button,input')].filter(x=>!x.disabled);const first=els[0],last=els.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;
  }
  if(e.key==='Escape'&&game.phase==='playing'){
   e.preventDefault();if(game.modal?.type==='caught'){return;}else if(game.modal){closeModal(game);hide();canvas.focus();}else if(game.paused)resume();
  }return;
 }
 if(game.phase!=='playing')return;
 if(e.target instanceof HTMLButtonElement && [' ','Enter'].includes(e.key))return;
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Tab'].includes(e.key))e.preventDefault();
 if(e.repeat&&['e','E',' ','q','Q','Tab','Escape'].includes(e.key))return;
 if(e.key)keys.add(e.key.toLowerCase());
 if(e.key==='Escape')pauseMenu();else if(e.key?.toLowerCase()==='e')use();else if(e.key===' ')toggleHide(game);else if(e.key?.toLowerCase()==='q')switchCharacter(game);else if(e.key==='Tab')objectives();
});
window.addEventListener('keyup',e=>{if(e.key)keys.delete(e.key.toLowerCase());});
function focusLost(){resetInput();if(game.phase==='playing'&&!game.paused&&!game.modal)pauseMenu();}
window.addEventListener('blur',focusLost);document.addEventListener('visibilitychange',()=>{if(document.hidden)focusLost()});
window.addEventListener('resize',resetInput);window.addEventListener('orientationchange',focusLost);
$('#pause').addEventListener('click',pauseMenu);$('#objectives').addEventListener('click',objectives);$('#sound').addEventListener('click',()=>{soundOn=!soundOn;$('#sound').textContent=soundOn?'Sound on':'Sound off';$('#sound').setAttribute('aria-label',soundOn?'Turn sound off':'Turn sound on');if(soundOn){const a=audioCtx();if(a)a.resume().then(()=>tone(523,.12)).catch(()=>{});}});
$('#auth-btn')?.addEventListener('click',()=>{if(isSignedIn())accountMenu();else authMenu('signin');});

for(const b of document.querySelectorAll('[data-dir]')){const d=b.dataset.dir;const set=v=>{touch[d]=v};b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);set(true)});b.addEventListener('pointerup',()=>set(false));b.addEventListener('pointercancel',()=>set(false));b.addEventListener('lostpointercapture',()=>set(false))}
const runB=$('#touch-run');runB.addEventListener('pointerdown',e=>{e.preventDefault();runB.setPointerCapture(e.pointerId);touch.run=true});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>runB.addEventListener(ev,()=>touch.run=false));$('#touch-hide').addEventListener('click',()=>toggleHide(game));$('#touch-interact').addEventListener('click',use);$('#touch-switch').addEventListener('click',()=>switchCharacter(game));

function hud(){
  $('#count').innerHTML=`${game.objectives.modaks} <small>/ 5</small>`;$('#score').textContent=game.score;$('#timer').textContent=formatTime(game.elapsed);$('#timer').title=game.countdownExpired?'Free play · festival is ready when you are':`Festival clock ${formatTime(game.remaining)}`;
  $('#state-label').textContent=`PARVATI · ${{CALM:'● SAFE',SUSPICIOUS:'? SUSPICIOUS',ALERT:'! ALERT',SEARCH:'⌕ SEARCH',RETURN:'↶ RETURN'}[game.parvati.state]}`;document.querySelector('.awareness').dataset.state=game.parvati.state;$('#awareness-fill').style.width=`${Math.round(game.parvati.awareness*100)}%`;
  const r=nearestInteraction(game);let t='';if(game.player.hidden)t='HIDDEN · Space / HIDE to leave';else if(r.interaction)t=`E / USE · ${r.interaction.label}`;else if(r.hide&&game.character===CHARACTER.ganesha)t='Space / HIDE · Hide here';else if(game.character===CHARACTER.mushak)t='MUSHAK · Q / SWITCH to return to Ganesha';context.textContent=t;
  $('#tutorial').textContent=tutorialPrompt(game,matchMedia('(pointer:coarse),(max-width:820px)').matches);
  const goal=currentObjective(game);$('#current-objective').textContent=goal.title;
  $('#touch-switch').textContent=game.character===CHARACTER.mushak?'GANESHA':'MUSHAK';
}
function input(dt){if(game.phase!=='playing'||game.paused||game.modal)return;const dx=(keys.has('d')||keys.has('arrowright')||touch.right?1:0)-(keys.has('a')||keys.has('arrowleft')||touch.left?1:0);const dy=(keys.has('s')||keys.has('arrowdown')||touch.down?1:0)-(keys.has('w')||keys.has('arrowup')||touch.up?1:0);moveCharacter(game,dx,dy,dt,keys.has('shift')||touch.run);if((dx||dy)&&!game.player.hidden&&game.elapsed>=stepNext){const running=keys.has('shift')||touch.run;stepNext=game.elapsed+(game.character==='mushak'?.18:running?.23:.4);tone(game.character==='mushak'?390:running?115:155,.035,'triangle',.014)}}
function loop(now){game.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;const dt=Math.min(.05,(now-last)/1000||0);last=now;ambientPulse(now);input(dt);update(game,dt);const view=render(canvas,ctx,game,now/1000);$('#location').textContent=view.zone;hud();syncModal();while(lastMessage<game.messages.length){const m=game.messages[lastMessage++];toastMsg(m);cue(m)}while(game.events.length){const e=game.events.shift();if(e.type==='ai'){if(e.state==='ALERT'){tone(392,.12,'triangle',.045);setTimeout(()=>tone(523,.15,'triangle',.035),110);}else if(e.state==='SUSPICIOUS')tone(440,.16,'sine',.02);}else if(e.type==='pickup'){tone(e.variant==='secret'?1047:e.variant==='golden'?880:660,.12,'sine',.04);}else if(e.type==='puzzle'||e.type==='secret'){[523,659,784].forEach((f,i)=>setTimeout(()=>tone(f,.16),i*90));}else if(e.type==='switch')tone(990,.06,'sine',.02);}if(game.completed){document.querySelector('.game-shell').classList.add('celebrating');if(game.celebrationTime>.05&&!game.celebrationCue){game.celebrationCue=true;victoryCue();hide();}if(game.celebrationTime>=(game.reducedMotion?3:11))celebrationUI();}else document.querySelector('.game-shell').classList.remove('celebrating');const art=$('#story-art');if(art&&!overlay.classList.contains('hidden'))renderStory(art,art.getContext('2d'),sceneIndex,now/1000);requestAnimationFrame(loop)}

if(isSupabaseConfigured()){
  initSupabaseAuth().then(({session,error})=>{
    updateAuthUI();
    if(error){
      authMenu('signin',error);
      toastMsg(error);
    }else if(session?.user){
      const p=currentUserProfile();
      toastMsg(`Signed in as ${p.displayName}`);
    }
  }).catch(()=>{});
  onAuthStateChange(()=>{updateAuthUI();});
}

mainMenu();requestAnimationFrame(loop);
