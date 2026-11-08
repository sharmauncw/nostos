/* ============================================================
   Nostos — global roommate matching by lifestyle compatibility
   Front end + Supabase backend (auth, profiles, swipes, matches,
   realtime chat, ID verification, waitlist).
   Brand name lives in CONFIG.BRAND (one-line swap).
   ============================================================ */
const CONFIG = {
  BRAND: 'Nostos',
  SB_URL: 'https://rvvsggosuihjuzuevexa.supabase.co',
  SB_KEY: 'sb_publishable_YCndyw5gYHWUcx8AavPIRg_AWDXliTc'
};
const $ = s => document.querySelector(s);
const fmt = (n, c) => c.sym + n.toLocaleString(c.locale);
const sb = (window.supabase && CONFIG.SB_URL)
  ? window.supabase.createClient(CONFIG.SB_URL, CONFIG.SB_KEY) : null;

const CITIES = {
  bengaluru:{name:'Bengaluru', country:'India',        cur:{sym:'₹', locale:'en-IN'}, min:8000,  max:40000, step:1000, def:17000},
  mumbai:   {name:'Mumbai',    country:'India',        cur:{sym:'₹', locale:'en-IN'}, min:12000, max:60000, step:1000, def:25000},
  newyork:  {name:'New York',  country:'USA',          cur:{sym:'$', locale:'en-US'}, min:900,   max:3000,  step:50,   def:1500},
  austin:   {name:'Austin',    country:'USA',          cur:{sym:'$', locale:'en-US'}, min:700,   max:2200,  step:50,   def:1100},
  london:   {name:'London',    country:'UK',           cur:{sym:'£', locale:'en-GB'}, min:700,   max:2000,  step:25,   def:1100},
  berlin:   {name:'Berlin',    country:'Germany',      cur:{sym:'€', locale:'de-DE'}, min:500,   max:1500,  step:25,   def:850},
  toronto:  {name:'Toronto',   country:'Canada',       cur:{sym:'C$',locale:'en-CA'}, min:800,   max:2200,  step:50,   def:1300},
  sydney:   {name:'Sydney',    country:'Australia',    cur:{sym:'A$',locale:'en-AU'}, min:900,   max:2600,  step:50,   def:1500},
  dubai:    {name:'Dubai',     country:'UAE',          cur:{sym:'AED ',locale:'en-US'},min:2000,  max:6000,  step:100,  def:3500},
  singapore:{name:'Singapore', country:'Singapore',    cur:{sym:'S$',locale:'en-SG'}, min:800,   max:2400,  step:50,   def:1400}
};
const SCALES = {
  sleep:['Before 10 PM','Around 11 PM','Around midnight','2 AM · night owl'],
  clean:['Spotless · daily tidy','Tidy · weekend reset','Relaxed · clean when needed'],
  guests:['Quiet home','Friends over sometimes','Social hub'],
  smoke:['Never','Outside only','Yes · indoors too'],
  pets:['I have a pet','Love pets · none of my own','Rather not live with pets'],
  food:['Vegetarian','Vegan','Eggetarian','Non-vegetarian','No preference'],
  work:['Work from home','Hybrid','Office / campus daily','Student']
};
const TRAIT_LABEL = {sleep:'Sleep', clean:'Cleaning', guests:'Guests', smoke:'Smoking', pets:'Pets', food:'Food', work:'Work style'};
const WEIGHTS = {sleep:20, clean:20, guests:15, budget:15, food:10, work:10, pets:5, smoke:5};
const AVA_COLORS = ['#FF6B4A','#0E7C7B','#7A5EA8','#D97706','#2D6CB5','#B5446E','#4C7A3F','#8A6D1F'];

/* Fallback sample people — used only if the backend is unreachable */
const FALLBACK_PEOPLE = [
 {id:'fb1', display_name:'Ananya', age:26, job:'Product designer', city:'bengaluru', area:'Koramangala', budget:18000, verified:true, is_sample:true, langs:['English','Hindi','Kannada'], sleep:1, clean:0, guests:1, smoke:0, pets:1, food:0, work:0, line:'Calm 2BHK near 80 Feet Road. I cook, I clean, and I water plants that are not mine.'},
 {id:'fb2', display_name:'Rohan', age:28, job:'Backend engineer', city:'bengaluru', area:'HSR Layout', budget:16000, verified:true, is_sample:true, langs:['English','Hindi'], sleep:3, clean:2, guests:2, smoke:1, pets:1, food:3, work:1, line:'Night owl, gamer, biryani enthusiast. Weekends get loud; weekdays do not exist before noon.'},
 {id:'fb3', display_name:'Maya', age:27, job:'Grad student, Columbia', city:'newyork', area:'Astoria', budget:1450, verified:true, is_sample:true, langs:['English','Spanish'], sleep:1, clean:0, guests:1, smoke:0, pets:1, food:4, work:3, line:'Thesis hermit on weekdays, brunch enthusiast on Sundays. Looking for a calm, kind home base.'},
 {id:'fb4', display_name:'Tom', age:28, job:'School teacher', city:'london', area:'Hackney', budget:1050, verified:true, is_sample:true, langs:['English'], sleep:1, clean:1, guests:1, smoke:0, pets:1, food:4, work:2, line:'Marking books at the kitchen table, pub quiz on Thursdays. Easy-going, pays on time, owns a hoover and uses it.'},
 {id:'fb5', display_name:'Lena', age:26, job:'Architect', city:'berlin', area:'Neukölln', budget:780, verified:true, is_sample:true, langs:['German','English'], sleep:1, clean:0, guests:1, smoke:0, pets:1, food:1, work:1, line:'Studio flat hunting with one more person. Plants, bicycles, and a firm no-shoes rule at the door.'}
];

const QUIZ = [
 {key:'city', q:'Where are you landing?', hint:'We open city by city — your answers build your profile either way.', type:'city'},
 {key:'budget', q:'Your monthly budget for a room?', type:'budget'},
 {key:'sleep', q:'When do you usually sleep?', type:'single', scale:'sleep'},
 {key:'clean', q:'Your cleaning style?', type:'single', scale:'clean'},
 {key:'guests', q:'Guests and gatherings?', type:'single', scale:'guests'},
 {key:'smoke', q:'Smoking?', type:'single', scale:'smoke'},
 {key:'pets', q:'Pets in the home?', type:'single', scale:'pets'},
 {key:'food', q:'Food at home?', type:'single', scale:'food'},
 {key:'work', q:'Your days look like…', type:'single', scale:'work'},
 {key:'breakers', q:'Any deal-breakers?', hint:'These are hard filters. Anyone who clashes simply never appears.', type:'multi',
  options:['Smoking indoors','Pets in the home','A very different sleep schedule','Frequent overnight guests','None — I am flexible']}
];

/* ---------- state ---------- */
let user = null, myProfile = null;
let quiz = {}, qi = 0, deck = [], idx = 0, hiddenCount = 0;
let dbMatches = [], sampleMatches = [], currentChat = null, chatChannel = null;

/* ---------- scoring engine (unchanged) ---------- */
function simOrdinal(a,b,max){ return 1 - Math.abs(a-b)/max; }
function simFood(a,b){
  if(a===b) return 1;
  const F=SCALES.food, A=F[a], B=F[b];
  if(A==='No preference'||B==='No preference') return .85;
  const pair=[A,B].sort().join('|');
  const M={'Eggetarian|Vegetarian':.7,'Vegan|Vegetarian':.8,'Eggetarian|Non-vegetarian':.6,'Non-vegetarian|Vegetarian':.35,'Non-vegetarian|Vegan':.3,'Eggetarian|Vegan':.65};
  return M[pair] ?? .5;
}
function simWork(a,b){
  if(a===b) return 1;
  const W=SCALES.work, A=W[a], B=W[b];
  if(A==='Hybrid'||B==='Hybrid') return .65;
  if(A==='Student'||B==='Student') return .55;
  return .35;
}
function simPets(a,b){ if(a===b) return 1; const s=new Set([a,b]); if(s.has(0)&&s.has(1)) return .9; if(s.has(1)&&s.has(2)) return .35; return .1; }
function simSmoke(a,b){ if(a===b) return 1; const s=new Set([a,b]); if(s.has(0)&&s.has(2)) return .05; return .52; }
function scorePerson(m){
  const parts = {
    sleep: simOrdinal(quiz.sleep, m.sleep, 3),
    clean: simOrdinal(quiz.clean, m.clean, 2),
    guests: simOrdinal(quiz.guests, m.guests, 2),
    budget: 1 - Math.min(Math.abs(m.budget - quiz.budget) / (0.6 * quiz.budget), 1),
    food: simFood(quiz.food, m.food),
    work: simWork(quiz.work, m.work),
    pets: simPets(quiz.pets, m.pets),
    smoke: simSmoke(quiz.smoke, m.smoke)
  };
  let total = 0; for(const k in WEIGHTS) total += WEIGHTS[k] * parts[k];
  const why = [], talk = [];
  const city = CITIES[quiz.city];
  if(parts.budget >= .85) why.push(`Budget fits: ${fmt(m.budget, CITIES[m.city].cur)}/mo vs your ${fmt(quiz.budget, city.cur)}`);
  ['sleep','clean','guests','food','work'].forEach(k=>{
    if(parts[k] >= .99) why.push(`${TRAIT_LABEL[k]} matches yours: ${SCALES[k][quiz[k]]}`);
  });
  if(m.city === quiz.city) why.push(`Same city: ${city.name} · ${m.area}`);
  const worst = Object.keys(parts).sort((a,b)=>parts[a]-parts[b])[0];
  if(parts[worst] < .6 && TRAIT_LABEL[worst]) talk.push(`Worth a chat — ${TRAIT_LABEL[worst].toLowerCase()}: they're “${SCALES[worst][m[worst]]}”, you're “${SCALES[worst][quiz[worst]]}”`);
  return { pct: Math.round(total), why: why.slice(0,3), talk: talk.slice(0,1), parts };
}
function breaksDeal(m){
  const b = quiz.breakers || [];
  if(b.includes('Smoking indoors') && m.smoke === 2) return true;
  if(b.includes('Pets in the home') && m.pets === 0) return true;
  if(b.includes('A very different sleep schedule') && Math.abs(m.sleep - quiz.sleep) >= 2) return true;
  if(b.includes('Frequent overnight guests') && m.guests === 2) return true;
  return false;
}

/* ---------- helpers ---------- */
let currentView = 'home';
function show(id){ currentView = id; ['home','quiz','deck','matches','chat','safety','auth','basics','verify'].forEach(v=>{ const el=$('#view-'+v); if(el) el.classList.toggle('hidden', v!==id); }); window.scrollTo({top:0}); }
function initials(n){ return (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
function avaColor(n){ let h=0; for(const ch of (n||'')) h=(h*31+ch.charCodeAt(0))>>>0; return AVA_COLORS[h%AVA_COLORS.length]; }
function esc(t){ const d=document.createElement('div'); d.textContent = t ?? ''; return d.innerHTML; }

/* ---------- auth ---------- */
async function refreshAuth(){
  if(!sb) { updateAccountBtn(); return; }
  const { data } = await sb.auth.getSession();
  user = data.session?.user ?? null;
  myProfile = null;
  if(user){
    const { data: prof } = await sb.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    myProfile = prof ?? null;
    if(myProfile){ quiz = profileToQuiz(myProfile); }
  }
  updateAccountBtn();
}
function profileToQuiz(p){
  return { city:p.city, budget:p.budget, sleep:p.sleep, clean:p.clean, guests:p.guests,
           smoke:p.smoke, pets:p.pets, food:p.food, work:p.work, breakers:p.breakers||[] };
}
function updateAccountBtn(){
  const b = $('#navAccount');
  b.textContent = user ? (user.email.split('@')[0] + ' · Sign out') : 'Sign in';
}
$('#navAccount').addEventListener('click', async ()=>{
  if(user){ if(confirm('Sign out of ' + CONFIG.BRAND + '?')){ await sb.auth.signOut(); user=null; myProfile=null; updateAccountBtn(); show('home'); } }
  else show('auth');
});
$('#authBack').addEventListener('click', ()=>show('home'));
$('#authForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const email = $('#authEmail').value.trim(); if(!email || !sb) return;
  const { error } = await sb.auth.signInWithOtp({ email, options:{ emailRedirectTo: location.origin + location.pathname } });
  if(error){ alert('Could not send the link: ' + error.message); return; }
  $('#authSent').classList.remove('hidden'); e.target.classList.add('hidden');
});
if(sb) sb.auth.onAuthStateChange(async (event)=>{
  /* Only route into the post-login flow when the user is actually on a
     sign-in screen. A session event firing mid-session (token refresh,
     page reload) must never yank the user out of what they're doing. */
  if(event === 'SIGNED_IN' && (currentView === 'auth' || currentView === 'basics')){
    await refreshAuth(); afterLogin();
  }
});

/* ---------- quiz ---------- */
function startQuiz(){
  try{ const saved = JSON.parse(localStorage.getItem('nostos_quiz')||'null'); if(saved && !myProfile) quiz = saved; }catch(e){}
  if(myProfile) quiz = profileToQuiz(myProfile);
  qi = 0; show('quiz'); renderQ();
}
function saveQuizLocal(){ try{ localStorage.setItem('nostos_quiz', JSON.stringify(quiz)); }catch(e){} }
function renderQ(){
  const step = QUIZ[qi], total = QUIZ.length;
  $('#progressBar').style.width = ((qi)/total*100) + '%';
  $('#quizCount').textContent = `${qi+1} of ${total}`;
  $('#quizQ').textContent = step.q;
  const hint = $('#quizHint');
  if(step.hint){ hint.textContent = step.hint; hint.classList.remove('hidden'); } else hint.classList.add('hidden');
  const body = $('#quizBody'), next = $('#quizNext');
  next.classList.add('hidden'); body.innerHTML = '';

  if(step.type === 'city'){
    const box = document.createElement('div'); box.className = 'opts';
    Object.entries(CITIES).forEach(([key,c])=>{
      const b = document.createElement('button'); b.className = 'opt'; b.textContent = `${c.name} · ${c.country}`;
      b.addEventListener('click', ()=>{ quiz.city = key; quiz.budget = c.def; advance(); });
      box.appendChild(b);
    });
    body.appendChild(box);
  }
  if(step.type === 'budget'){
    const c = CITIES[quiz.city];
    const wrap = document.createElement('div'); wrap.className = 'budget-wrap';
    wrap.innerHTML = `<div class="budget-out" id="bOut">${fmt(quiz.budget ?? c.def, c.cur)}</div>
      <input type="range" id="bRange" min="${c.min}" max="${c.max}" step="${c.step}" value="${quiz.budget ?? c.def}">
      <div class="budget-scale"><span>${fmt(c.min, c.cur)}</span><span>${fmt(c.max, c.cur)}+</span></div>`;
    body.appendChild(wrap);
    wrap.querySelector('#bRange').addEventListener('input', e=>{
      quiz.budget = +e.target.value;
      wrap.querySelector('#bOut').textContent = fmt(quiz.budget, c.cur);
    });
    if(quiz.budget == null) quiz.budget = c.def;
    next.classList.remove('hidden'); next.onclick = advance;
  }
  if(step.type === 'single'){
    const box = document.createElement('div'); box.className = 'opts';
    SCALES[step.scale].forEach((label, i)=>{
      const b = document.createElement('button'); b.className = 'opt'; b.textContent = label;
      b.addEventListener('click', ()=>{ quiz[step.key] = i; advance(); });
      box.appendChild(b);
    });
    body.appendChild(box);
  }
  if(step.type === 'multi'){
    const chosen = new Set(quiz.breakers || []);
    const box = document.createElement('div'); box.className = 'opts multi';
    step.options.forEach(label=>{
      const b = document.createElement('button'); b.className = 'opt' + (chosen.has(label) ? ' sel' : ''); b.textContent = label;
      b.addEventListener('click', ()=>{
        if(label.startsWith('None')){ chosen.clear(); box.querySelectorAll('.opt').forEach(o=>o.classList.remove('sel')); chosen.add(label); b.classList.add('sel'); }
        else { chosen.delete('None — I am flexible'); box.querySelectorAll('.opt').forEach(o=>{ if(o.textContent.startsWith('None')) o.classList.remove('sel'); });
               if(chosen.has(label)){ chosen.delete(label); b.classList.remove('sel'); } else { chosen.add(label); b.classList.add('sel'); } }
      });
      box.appendChild(b);
    });
    body.appendChild(box);
    next.classList.remove('hidden');
    next.onclick = ()=>{ quiz.breakers = [...chosen]; advance(); };
  }
}
function advance(){ saveQuizLocal(); qi++; if(qi >= QUIZ.length){ finishQuiz(); } else renderQ(); }
$('#quizBackBtn').addEventListener('click', ()=>{ if(qi > 0){ qi--; renderQ(); } else show('home'); });

async function finishQuiz(){
  if(!sb){ buildDeck(FALLBACK_PEOPLE); return; }            // offline fallback: local demo
  if(!user){ $('#authTitle').textContent = 'Your matches are ready — sign in to see them'; show('auth'); return; }
  if(!myProfile){ show('basics'); return; }
  await saveTraits();
  buildDeck();
}
function afterLogin(){
  const hasQuiz = quiz && quiz.city;
  if(hasQuiz && !myProfile){ show('basics'); return; }
  if(hasQuiz && myProfile){ saveTraits().then(buildDeck); return; }
  show('home');
}
async function saveTraits(){
  if(!myProfile) return;
  const upd = { city:quiz.city, budget:quiz.budget, sleep:quiz.sleep, clean:quiz.clean, guests:quiz.guests,
    smoke:quiz.smoke, pets:quiz.pets, food:quiz.food, work:quiz.work, breakers:quiz.breakers||[] };
  const { data } = await sb.from('profiles').update(upd).eq('id', myProfile.id).select().single();
  if(data) myProfile = data;
}
$('#basicsForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const row = {
    user_id: user.id,
    display_name: $('#bName').value.trim(),
    age: +$('#bAge').value,
    job: $('#bJob').value.trim() || null,
    area: $('#bArea').value.trim() || null,
    langs: $('#bLangs').value.split(',').map(s=>s.trim()).filter(Boolean),
    line: $('#bLine').value.trim() || null,
    city: quiz.city, budget: quiz.budget, sleep: quiz.sleep, clean: quiz.clean, guests: quiz.guests,
    smoke: quiz.smoke, pets: quiz.pets, food: quiz.food, work: quiz.work, breakers: quiz.breakers||[]
  };
  const { data, error } = await sb.from('profiles').insert(row).select().single();
  if(error){ alert('Could not create your profile: ' + error.message); return; }
  myProfile = data;
  buildDeck();
});

/* ---------- deck ---------- */
async function buildDeck(preset){
  let pool = preset ?? [];
  let inCity = true;
  if(sb && !preset){
    const { data } = await sb.from('profiles').select('*').eq('city', quiz.city);
    pool = data ?? [];
    if(myProfile) pool = pool.filter(p=>p.id !== myProfile.id);
    if(myProfile){
      const { data: sw } = await sb.from('swipes').select('target').eq('swiper', myProfile.id);
      const swiped = new Set((sw||[]).map(s=>s.target));
      pool = pool.filter(p=>!swiped.has(p.id));
      const { data: bl } = await sb.from('blocks').select('blocked').eq('blocker', myProfile.id);
      const blocked = new Set((bl||[]).map(b=>b.blocked));
      pool = pool.filter(p=>!blocked.has(p.id));
    }
    if(!pool.length){
      const { data: samples } = await sb.from('profiles').select('*').eq('is_sample', true);
      pool = samples ?? []; inCity = false;
    }
  }
  hiddenCount = pool.filter(breaksDeal).length;
  deck = pool.filter(p=>!breaksDeal(p)).map(p=>({p, s: scorePerson(p)})).sort((a,b)=>b.s.pct - a.s.pct);
  idx = 0;
  $('#deckCity').textContent = CITIES[quiz.city].name;
  const note = $('#deckNote');
  if(!inCity){
    note.textContent = `${CITIES[quiz.city].name} is just opening — the waitlist decides where we grow next. Meanwhile, meet some of our verified community members (sample profiles, marked as such).`;
    note.classList.remove('hidden');
  } else if(hiddenCount){
    note.textContent = `${hiddenCount} ${hiddenCount===1?'person was':'people were'} hidden by your deal-breakers.`;
    note.classList.remove('hidden');
  } else note.classList.add('hidden');
  show('deck'); renderCard();
}
function renderCard(){
  const box = $('#deck');
  if(idx >= deck.length){ renderMatches(); return; }
  const {p:m, s} = deck[idx];
  $('#deckCount').textContent = `${idx+1} of ${deck.length}`;
  const traitCells = ['sleep','clean','guests','smoke','pets','food','work'].map(k=>{
    const diff = s.parts[k] < .6 ? ' diff' : '';
    return `<div class="trait${diff}"><b>${TRAIT_LABEL[k]}</b>${SCALES[k][m[k]]}</div>`;
  }).join('');
  box.innerHTML = `<div class="card mate-card">
    <div class="mate-top">
      <div class="avatar" style="background:${avaColor(m.display_name)}">${initials(m.display_name)}</div>
      <div>
        <div class="mate-name">${esc(m.display_name)}, ${m.age}${m.verified ? '<span class="verified">✓ ID verified</span>' : ''}${m.is_sample ? '<span class="sample-badge">Sample profile</span>' : ''}</div>
        <div class="mate-sub">${esc(m.job || '')}<br>${esc(m.area || '')}, ${CITIES[m.city].name} · ${fmt(m.budget, CITIES[m.city].cur)}/mo · Speaks ${(m.langs||[]).join(', ')}</div>
      </div>
    </div>
    <div class="score-row">
      <div class="score-ring" style="--p:${s.pct}"><div class="in"><span class="big">${s.pct}%</span><span class="lbl">Match</span></div></div>
      <div class="score-why"><b>Why you match</b><ul>
        ${s.why.map(w=>`<li>${esc(w)}</li>`).join('')}
        ${s.talk.map(t=>`<li class="talk">${esc(t)}</li>`).join('')}
      </ul></div>
    </div>
    <p class="mate-line">“${esc(m.line || '')}”</p>
    <div class="traits">${traitCells}</div>
    <div class="card-actions">
      <button data-act="report">Report</button><button data-act="block">Block</button>
    </div>
  </div>`;
  box.querySelector('[data-act="report"]').addEventListener('click', ()=>reportPerson(m));
  box.querySelector('[data-act="block"]').addEventListener('click', ()=>blockPerson(m));
}
async function swipe(dir){
  const cur = deck[idx]; if(!cur) return;
  const m = cur.p;
  if(dir === 'like'){
    if(m.is_sample || !sb){ sampleMatches.push(cur); }
    else if(myProfile){
      await sb.from('swipes').insert({ swiper: myProfile.id, target: m.id, direction: 'like' });
      const a = myProfile.id < m.id ? myProfile.id : m.id, b = myProfile.id < m.id ? m.id : myProfile.id;
      const { data: match } = await sb.from('matches').select('*').eq('user_a', a).eq('user_b', b).maybeSingle();
      if(match) alert(`It's a match! You and ${m.display_name} liked each other. Find them in your matches.`);
    }
  } else if(sb && myProfile && !m.is_sample){
    await sb.from('swipes').insert({ swiper: myProfile.id, target: m.id, direction: 'pass' });
  }
  idx++; renderCard();
}
$('#btnNo').addEventListener('click', ()=>swipe('pass'));
$('#btnYes').addEventListener('click', ()=>swipe('like'));
$('#editProfile').addEventListener('click', startQuiz);
async function reportPerson(m){
  if(!sb || !myProfile || m.is_sample){ alert('Thanks — our team has noted this profile.'); return; }
  const reason = prompt('What happened? (optional)') ?? '';
  await sb.from('reports').insert({ reporter: myProfile.id, reported: m.id, reason });
  alert('Reported. Our team will review. You won\'t see this profile again.');
  if(sb) await sb.from('blocks').insert({ blocker: myProfile.id, blocked: m.id });
  idx++; renderCard();
}
async function blockPerson(m){
  if(sb && myProfile && !m.is_sample) await sb.from('blocks').insert({ blocker: myProfile.id, blocked: m.id });
  idx++; renderCard();
}

/* ---------- matches + chat ---------- */
async function loadDbMatches(){
  dbMatches = [];
  if(!sb || !myProfile) return;
  const { data } = await sb.from('matches').select('*')
    .or(`user_a.eq.${myProfile.id},user_b.eq.${myProfile.id}`).order('created_at', { ascending:false });
  for(const mt of (data ?? [])){
    const otherId = mt.user_a === myProfile.id ? mt.user_b : mt.user_a;
    const { data: other } = await sb.from('profiles').select('*').eq('id', otherId).single();
    if(other) dbMatches.push({ matchId: mt.id, p: other, s: scorePerson(other) });
  }
}
async function renderMatches(){
  await loadDbMatches();
  show('matches');
  const L = $('#matchList');
  const all = [
    ...dbMatches.map(d=>({ ...d, real:true })),
    ...sampleMatches.map(d=>({ ...d, real:false }))
  ];
  if(!all.length){
    L.innerHTML = `<div class="card empty">No connections yet.<br>When you and someone like each other, they'll appear here. Sample profiles you connect with show a preview chat.</div>`;
    return;
  }
  L.innerHTML = all.map((d, i)=>`<div class="card">
    <div class="match-row">
      <div class="avatar" style="background:${avaColor(d.p.display_name)}">${initials(d.p.display_name)}</div>
      <div><b>${esc(d.p.display_name)}, ${d.p.age}</b>${d.p.verified ? '<span class="verified">✓ ID verified</span>' : ''}${d.p.is_sample ? '<span class="sample-badge">Sample</span>' : ''}<br>
      <span class="muted">${esc(d.p.area || '')} · ${esc(d.p.job || '')}</span></div>
      <div class="sc">${d.s.pct}%</div>
    </div>
    <div class="match-actions">
      <button class="btn btn-go" data-chat="${i}">💬 Chat</button>
      <button class="btn btn-ghost" data-safety="1">Safety steps</button>
    </div></div>`).join('');
  L.querySelectorAll('[data-chat]').forEach(b=>b.addEventListener('click', ()=>openChat(all[+b.dataset.chat])));
  L.querySelectorAll('[data-safety]').forEach(b=>b.addEventListener('click', ()=>show('safety')));
}
$('#againBtn').addEventListener('click', ()=>show('home'));

function appendMsg(body, mine, sys){
  const log = $('#chatLog');
  const div = document.createElement('div');
  div.className = 'msg ' + (sys ? 'sys' : mine ? 'me' : 'them');
  div.textContent = body;
  log.appendChild(div); log.scrollTop = log.scrollHeight;
}
async function openChat(d){
  currentChat = d;
  if(chatChannel && sb){ sb.removeChannel(chatChannel); chatChannel = null; }
  $('#chatName').textContent = `${d.p.display_name}, ${d.p.age} · ${d.s.pct}% match`;
  $('#chatVerified').classList.toggle('hidden', !d.p.verified);
  const log = $('#chatLog'); log.innerHTML = '';
  $('#icebreakers').innerHTML = ['Ask about their Sunday routine','The guest rule: what works for you?','Bills: split even, or split by room size?']
    .map(t=>`<button class="ice">${t}</button>`).join('');
  document.querySelectorAll('.ice').forEach(b=>b.addEventListener('click', ()=>{ sendMsg(b.textContent); }));

  if(d.real && sb){
    appendMsg(`You matched with ${d.p.display_name}. Chat here until you've video-called and met in public.`, false, true);
    const { data: msgs } = await sb.from('messages').select('*').eq('match_id', d.matchId).order('created_at');
    (msgs ?? []).forEach(m=>appendMsg(m.body, m.sender === myProfile.id));
    chatChannel = sb.channel('chat-' + d.matchId)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`match_id=eq.${d.matchId}` },
        payload => { if(payload.new.sender !== myProfile.id) appendMsg(payload.new.body, false); })
      .subscribe();
  } else {
    appendMsg(`Sample profile — this is a preview of how chat feels on ${CONFIG.BRAND}.`, false, true);
    appendMsg(`Hi! ${d.s.pct}% is honestly the highest match I've seen here. ${d.s.why[0] ? d.s.why[0] : 'Our schedules line up.'} Want to swap weekend routines and see if this could work?`, false);
  }
  show('chat');
}
const REPLIES = [
  'Sunday is slow for me — market run, big cooking session, calls home. You?',
  'That works for me. I care most about the kitchen and bathroom staying sane.',
  'Even split is easiest, honestly. Less math, fewer feelings.',
  'Want to do a quick video call this week? Ten minutes is enough to get a feel.',
  'I can show you the place on the call too — daylight version, not the listing photos.'
];
let replyIdx = 0;
async function sendMsg(text){
  if(!text) return;
  if(currentChat?.real && sb){
    appendMsg(text, true);
    await sb.from('messages').insert({ match_id: currentChat.matchId, sender: myProfile.id, body: text });
  } else {
    appendMsg(text, true);
    setTimeout(()=>appendMsg(REPLIES[replyIdx++ % REPLIES.length], false), 650);
  }
}
$('#chatForm').addEventListener('submit', e=>{
  e.preventDefault();
  const v = $('#chatInput').value.trim(); if(!v) return;
  $('#chatInput').value = ''; sendMsg(v);
});
$('#chatBack').addEventListener('click', ()=>renderMatches());
$('#planCall').addEventListener('click', ()=>{
  if(currentChat) appendMsg(`📹 Video call proposed. ${currentChat.p.display_name} gets the same prompt — no phone numbers exchanged.`, false, true);
});
$('#planMeet').addEventListener('click', ()=>{
  if(currentChat) appendMsg(`☕ Public meet suggested: a café near ${currentChat.p.area}, daytime. Tell a friend where you'll be.`, false, true);
});

/* ---------- waitlist ---------- */
function initHome(){
  document.title = `${CONFIG.BRAND} — Find your people. Come home.`;
  document.querySelectorAll('[data-brand]').forEach(el=>el.textContent = CONFIG.BRAND);
  const sel = $('#waitCity');
  sel.innerHTML = Object.values(CITIES).map(c=>`<option>${c.name}, ${c.country}</option>`).join('');
  $('#cityChips').innerHTML = Object.values(CITIES).map(c=>`<span class="chip">${c.name}</span>`).join('');
  $('#waitlistForm').addEventListener('submit', async e=>{
    e.preventDefault();
    const email = $('#waitEmail').value.trim();
    if(sb) await sb.from('waitlist').insert({ city: sel.value, email });
    else { try{ const l = JSON.parse(localStorage.getItem('nostos_waitlist')||'[]'); l.push({city:sel.value, email}); localStorage.setItem('nostos_waitlist', JSON.stringify(l)); }catch(err){} }
    $('#waitOk').classList.remove('hidden'); e.target.classList.add('hidden');
  });
  $('#startQuiz').addEventListener('click', startQuiz);
  $('#homeSafety').addEventListener('click', ()=>show('safety'));
  $('#navSafety').addEventListener('click', ()=>show('safety'));
  $('#safetyBack').addEventListener('click', ()=>show('home'));
  $('#safetyQuiz').addEventListener('click', startQuiz);
  $('#navVerify').addEventListener('click', openVerify);
  $('#verifyBack').addEventListener('click', ()=>show('home'));
}

/* ---------- verification ---------- */
async function openVerify(){
  if(!sb){ show('verify'); return; }
  if(!user){ $('#authTitle').textContent = 'Sign in to get verified'; show('auth'); return; }
  if(!myProfile){ alert('Create your profile first — take the quiz and finish your profile, then come back here.'); startQuiz(); return; }
  show('verify'); renderVerify();
}
function renderVerify(){
  const st = myProfile.verification_status;
  const label = { unsubmitted:'Not submitted yet', pending:'⏳ In review — we\'ll update your badge here', approved:'✓ Verified — your badge is live', rejected:'Not approved — try a clearer photo of your ID' }[st];
  $('#verifyStatus').textContent = 'Status: ' + label;
  $('#verifyForm').classList.toggle('hidden', st === 'pending' || st === 'approved');
  if(myProfile.is_admin) loadAdminQueue(); else $('#adminCard').classList.add('hidden');
}
$('#verifyForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const f = $('#idFile').files[0]; if(!f) return;
  const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${user.id}/id-${Date.now()}.${ext}`;
  try{
    const { error } = await sb.storage.from('id-docs').upload(path, f);
    if(error) throw error;
    const { error: uerr } = await sb.from('profiles').update({ verification_status:'pending' }).eq('id', myProfile.id);
    if(uerr) throw uerr;
  }catch(err){ alert('Upload failed: ' + (err.message || err)); show('verify'); return; }
  myProfile.verification_status = 'pending';
  $('#verifyOk').classList.remove('hidden');
  show('verify');
  renderVerify();
});
async function loadAdminQueue(){
  const { data } = await sb.from('profiles').select('*').eq('verification_status', 'pending');
  const card = $('#adminCard');
  if(!data || !data.length){ card.classList.remove('hidden'); $('#adminList').innerHTML = '<p class="muted">Nobody waiting for review.</p>'; return; }
  card.classList.remove('hidden');
  $('#adminList').innerHTML = data.map(p=>`<div class="admin-row">
      <span><b>${esc(p.display_name)}</b> · ${esc(CITIES[p.city]?.name || p.city)}</span>
      <span><button class="btn btn-ghost" data-view="${p.user_id}">View ID</button>
      <button class="btn btn-go" data-approve="${p.id}">Approve</button>
      <button class="btn btn-ghost" data-reject="${p.id}">Reject</button></span>
    </div>`).join('');
  $('#adminList').querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click', async ()=>{
    const { data: files } = await sb.storage.from('id-docs').list(b.dataset.view);
    if(files && files.length){
      const { data: signed } = await sb.storage.from('id-docs').createSignedUrl(`${b.dataset.view}/${files[0].name}`, 300);
      if(signed) window.open(signed.signedUrl, '_blank');
    } else alert('No document found for this user.');
  }));
  $('#adminList').querySelectorAll('[data-approve]').forEach(b=>b.addEventListener('click', async ()=>{
    await sb.from('profiles').update({ verification_status:'approved', verified:true }).eq('id', b.dataset.approve);
    loadAdminQueue();
  }));
  $('#adminList').querySelectorAll('[data-reject]').forEach(b=>b.addEventListener('click', async ()=>{
    await sb.from('profiles').update({ verification_status:'rejected', verified:false }).eq('id', b.dataset.reject);
    loadAdminQueue();
  }));
}

/* ---------- boot ---------- */
initHome();
refreshAuth();
