/* ============================================================
   Nostos — global roommate matching by lifestyle compatibility
   Working name lives in CONFIG.BRAND (one-line swap).
   ============================================================ */
const CONFIG = { BRAND: 'Nostos' };
const $ = s => document.querySelector(s);
const fmt = (n, c) => c.sym + n.toLocaleString(c.locale);

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

/* Trait scales — ordinal indexes drive similarity (1 − distance/max) */
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

const PEOPLE = [
 {name:'Ananya', age:26, job:'Product designer', city:'bengaluru', area:'Koramangala', budget:18000, verified:true,  langs:['English','Hindi','Kannada'], sleep:1, clean:0, guests:1, smoke:0, pets:1, food:0, work:0, line:'Calm 2BHK near 80 Feet Road. I cook, I clean, and I water plants that are not mine.'},
 {name:'Rohan', age:28, job:'Backend engineer', city:'bengaluru', area:'HSR Layout', budget:16000, verified:true,  langs:['English','Hindi'], sleep:3, clean:2, guests:2, smoke:1, pets:1, food:3, work:1, relocate:true, line:'Night owl, gamer, biryani enthusiast. Weekends get loud; weekdays do not exist before noon.'},
 {name:'Priya', age:25, job:'CA trainee', city:'bengaluru', area:'Koramangala', budget:15000, verified:true,  langs:['English','Hindi','Tamil'], sleep:0, clean:1, guests:0, smoke:0, pets:2, food:0, work:2, line:'Up at 5:30 to study. Quiet house, early nights, everything in its place by Sunday.'},
 {name:'Maya', age:27, job:'Grad student, Columbia', city:'newyork', area:'Astoria', budget:1450, verified:true,  langs:['English','Spanish'], sleep:1, clean:0, guests:1, smoke:0, pets:1, food:4, work:3, line:'Thesis hermit on weekdays, brunch enthusiast on Sundays. Looking for a calm, kind home base.'},
 {name:'Jordan', age:29, job:'ER nurse', city:'newyork', area:'Jersey City', budget:1600, verified:true,  langs:['English'], sleep:0, clean:0, guests:0, smoke:0, pets:2, food:3, work:2, line:'Hospital shifts mean I sleep early and value quiet like rent money. Rent is always on the 1st.'},
 {name:'Sofia', age:26, job:'Chef', city:'newyork', area:'Bushwick', budget:1350, verified:true,  langs:['English','Spanish','Italian'], sleep:3, clean:1, guests:2, smoke:1, pets:1, food:3, work:2, line:'Kitchen hours, so my midnight is your noon. Trade-off: you will eat extremely well.'},
 {name:'Tom', age:28, job:'School teacher', city:'london', area:'Hackney', budget:1050, verified:true,  langs:['English'], sleep:1, clean:1, guests:1, smoke:0, pets:1, food:4, work:2, line:'Marking books at the kitchen table, pub quiz on Thursdays. Easy-going, pays on time, owns a hoover and uses it.'},
 {name:'Zara', age:25, job:'PhD researcher', city:'london', area:'Stratford', budget:950, verified:true,  langs:['English','Urdu','Hindi'], sleep:2, clean:0, guests:0, smoke:0, pets:2, food:0, work:0, line:'Lab by day, novels by night. I keep a spotless kitchen and a very full bookshelf.'},
 {name:'Lena', age:26, job:'Architect', city:'berlin', area:'Neukölln', budget:780, verified:true,  langs:['German','English'], sleep:1, clean:0, guests:1, smoke:0, pets:1, food:1, work:1, line:'Studio flat hunting with one more person. Plants, bicycles, and a firm no-shoes rule at the door.'},
 {name:'Felix', age:30, job:'Software developer', city:'berlin', area:'Friedrichshain', budget:900, verified:false, langs:['German','English'], sleep:3, clean:2, guests:2, smoke:2, pets:0, food:3, work:0, relocate:true, line:'Club-adjacent lifestyle, home by 4 AM, asleep till noon. Has a cat named Kernel who judges everyone equally.'}
];

const WEIGHTS = {sleep:20, clean:20, guests:15, budget:15, food:10, work:10, pets:5, smoke:5};
const AVA_COLORS = ['#FF6B4A','#0E7C7B','#7A5EA8','#D97706','#2D6CB5','#B5446E','#4C7A3F','#8A6D1F'];

const QUIZ = [
 {key:'city', q:'Where are you landing?', hint:'We open city by city — your answers build your profile either way.', type:'city'},
 {key:'budget', q:'Your monthly budget for a room?', type:'budget'},
 {key:'sleep', q:'When do you usually sleep?', type:'single', scale:'sleep'},
 {key:'clean', q:'Your cleaning style?', type:'single', scale:'clean'},
 {key:'guests', q:'Guests and gatherings?', type:'single', scale:'guests'},
 {key:'smoke', q:'Smoking?', type:'single', scale:'smoke'},
 {key:'pets', q:'Pets?', type:'single', scale:'pets'},
 {key:'food', q:'Food at home?', type:'single', scale:'food'},
 {key:'work', q:'Your days look like…', type:'single', scale:'work'},
 {key:'breakers', q:'Any deal-breakers?', hint:'These are hard filters. Anyone who clashes simply never appears.', type:'multi',
  options:['Smoking indoors','Pets in the home','A very different sleep schedule','Frequent overnight guests','None — I am flexible']}
];

/* ---------- state ---------- */
let profile = {}, qi = 0, deck = [], idx = 0, matches = [], hiddenCount = 0, chatPerson = null;
const store = { get waitlist(){ try{return JSON.parse(localStorage.getItem('an_waitlist')||'[]')}catch(e){return[]} },
                set waitlist(v){ try{localStorage.setItem('an_waitlist', JSON.stringify(v))}catch(e){} } };

/* ---------- helpers ---------- */
function show(id){ ['home','quiz','deck','matches','chat','safety'].forEach(v=>$('#view-'+v).classList.toggle('hidden', v!==id)); window.scrollTo({top:0}); }
function initials(n){ return n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
function avaColor(n){ let h=0; for(const ch of n) h=(h*31+ch.charCodeAt(0))>>>0; return AVA_COLORS[h%AVA_COLORS.length]; }
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
    sleep: simOrdinal(profile.sleep, m.sleep, 3),
    clean: simOrdinal(profile.clean, m.clean, 2),
    guests: simOrdinal(profile.guests, m.guests, 2),
    budget: 1 - Math.min(Math.abs(m.budget - profile.budget) / (0.6 * profile.budget), 1),
    food: simFood(profile.food, m.food),
    work: simWork(profile.work, m.work),
    pets: simPets(profile.pets, m.pets),
    smoke: simSmoke(profile.smoke, m.smoke)
  };
  let total = 0; for(const k in WEIGHTS) total += WEIGHTS[k] * parts[k];
  const why = [], talk = [];
  const city = CITIES[profile.city];
  if(parts.budget >= .85) why.push(`Budget fits: ${fmt(m.budget, city.cur)}/mo vs your ${fmt(profile.budget, city.cur)}`);
  ['sleep','clean','guests','food','work'].forEach(k=>{
    if(parts[k] >= .99) why.push(`${TRAIT_LABEL[k]} matches yours: ${SCALES[k][profile[k]]}`);
  });
  const sharedLang = m.langs.filter(l=>['English'].includes(l));
  if(m.city === profile.city) why.push(`Same city: ${city.name} · ${m.area}`);
  const worst = Object.keys(parts).sort((a,b)=>parts[a]-parts[b])[0];
  if(parts[worst] < .6 && TRAIT_LABEL[worst]) talk.push(`Worth a chat — ${TRAIT_LABEL[worst].toLowerCase()}: they're “${SCALES[worst][m[worst]]}”, you're “${SCALES[worst][profile[worst]]}”`);
  return { pct: Math.round(total), why: why.slice(0,3), talk: talk.slice(0,1), parts };
}
function breaksDeal(m){
  const b = profile.breakers || [];
  if(b.includes('Smoking indoors') && m.smoke === 2) return true;
  if(b.includes('Pets in the home') && m.pets === 0) return true;
  if(b.includes('A very different sleep schedule') && Math.abs(m.sleep - profile.sleep) >= 2) return true;
  if(b.includes('Frequent overnight guests') && m.guests === 2) return true;
  return false;
}

/* ---------- home / waitlist ---------- */
function initHome(){
  document.title = `${CONFIG.BRAND} — Find your people. Come home.`;
  document.querySelectorAll('[data-brand]').forEach(el=>el.textContent = CONFIG.BRAND);
  const sel = $('#waitCity');
  sel.innerHTML = Object.values(CITIES).map(c=>`<option>${c.name}, ${c.country}</option>`).join('');
  $('#cityChips').innerHTML = Object.values(CITIES).map(c=>`<span class="chip">${c.name}</span>`).join('');
  $('#waitlistForm').addEventListener('submit', e=>{
    e.preventDefault();
    const list = store.waitlist;
    list.push({city: sel.value, email: $('#waitEmail').value, at: new Date().toISOString()});
    store.waitlist = list;
    $('#waitOk').classList.remove('hidden'); e.target.classList.add('hidden');
  });
  $('#startQuiz').addEventListener('click', startQuiz);
  $('#homeSafety').addEventListener('click', ()=>show('safety'));
  $('#navSafety').addEventListener('click', ()=>show('safety'));
  $('#safetyBack').addEventListener('click', ()=>show('home'));
  $('#safetyQuiz').addEventListener('click', startQuiz);
}

/* ---------- quiz ---------- */
function startQuiz(){ profile = {}; qi = 0; matches = []; show('quiz'); renderQ(); }
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
      b.addEventListener('click', ()=>{ profile.city = key; profile.budget = c.def; advance(); });
      box.appendChild(b);
    });
    body.appendChild(box);
  }
  if(step.type === 'budget'){
    const c = CITIES[profile.city];
    const wrap = document.createElement('div'); wrap.className = 'budget-wrap';
    wrap.innerHTML = `<div class="budget-out" id="bOut">${fmt(c.def, c.cur)}</div>
      <input type="range" id="bRange" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.def}">
      <div class="budget-scale"><span>${fmt(c.min, c.cur)}</span><span>${fmt(c.max, c.cur)}+</span></div>`;
    body.appendChild(wrap);
    wrap.querySelector('#bRange').addEventListener('input', e=>{
      profile.budget = +e.target.value;
      wrap.querySelector('#bOut').textContent = fmt(profile.budget, c.cur);
    });
    profile.budget = c.def;
    next.classList.remove('hidden');
    next.onclick = advance;
  }
  if(step.type === 'single'){
    const box = document.createElement('div'); box.className = 'opts';
    SCALES[step.scale].forEach((label, i)=>{
      const b = document.createElement('button'); b.className = 'opt'; b.textContent = label;
      b.addEventListener('click', ()=>{ profile[step.key] = i; advance(); });
      box.appendChild(b);
    });
    body.appendChild(box);
  }
  if(step.type === 'multi'){
    const chosen = new Set();
    const box = document.createElement('div'); box.className = 'opts multi';
    step.options.forEach(label=>{
      const b = document.createElement('button'); b.className = 'opt'; b.textContent = label;
      b.addEventListener('click', ()=>{
        if(label.startsWith('None')){ chosen.clear(); box.querySelectorAll('.opt').forEach(o=>o.classList.remove('sel')); chosen.add(label); b.classList.add('sel'); }
        else { chosen.delete('None — I am flexible'); box.querySelectorAll('.opt').forEach(o=>{ if(o.textContent.startsWith('None')) o.classList.remove('sel'); });
               if(chosen.has(label)){ chosen.delete(label); b.classList.remove('sel'); } else { chosen.add(label); b.classList.add('sel'); } }
      });
      box.appendChild(b);
    });
    body.appendChild(box);
    next.classList.remove('hidden');
    next.onclick = ()=>{ profile.breakers = [...chosen]; advance(); };
  }
}
function advance(){ qi++; if(qi >= QUIZ.length){ buildDeck(); } else renderQ(); }
$('#quizBackBtn').addEventListener('click', ()=>{ if(qi > 0){ qi--; renderQ(); } else show('home'); });

/* ---------- deck ---------- */
function buildDeck(){
  const inCity = PEOPLE.filter(p=>p.city === profile.city);
  const reloc = PEOPLE.filter(p=>p.city !== profile.city && p.relocate);
  let pool = inCity.length ? inCity : reloc;
  hiddenCount = pool.filter(breaksDeal).length;
  deck = pool.filter(p=>!breaksDeal(p))
             .map(p=>({p, s: scorePerson(p)}))
             .sort((a,b)=>b.s.pct - a.s.pct);
  idx = 0;
  $('#deckCity').textContent = CITIES[profile.city].name;
  const note = $('#deckNote');
  if(!inCity.length){
    note.textContent = `${CITIES[profile.city].name} opens soon — the waitlist decides where we launch next. Meanwhile, these verified people are open to relocating there.`;
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
  const {p:m, s} = deck[idx], city = CITIES[profile.city];
  $('#deckCount').textContent = `${idx+1} of ${deck.length}`;
  const traitCells = ['sleep','clean','guests','smoke','pets','food','work'].map(k=>{
    const diff = s.parts[k] < .6 ? ' diff' : '';
    return `<div class="trait${diff}"><b>${TRAIT_LABEL[k]}</b>${SCALES[k][m[k]]}</div>`;
  }).join('');
  box.innerHTML = `<div class="card mate-card">
    <div class="mate-top">
      <div class="avatar" style="background:${avaColor(m.name)}">${initials(m.name)}</div>
      <div>
        <div class="mate-name">${m.name}, ${m.age}${m.verified ? '<span class="verified">✓ ID verified</span>' : ''}</div>
        <div class="mate-sub">${m.job}<br>${m.area}, ${CITIES[m.city].name} · ${fmt(m.budget, CITIES[m.city].cur)}/mo · Speaks ${m.langs.join(', ')}</div>
      </div>
    </div>
    <div class="score-row">
      <div class="score-ring" style="--p:${s.pct}"><div class="in"><span class="big">${s.pct}%</span><span class="lbl">Match</span></div></div>
      <div class="score-why"><b>Why you match</b><ul>
        ${s.why.map(w=>`<li>${w}</li>`).join('')}
        ${s.talk.map(t=>`<li class="talk">${t}</li>`).join('')}
      </ul></div>
    </div>
    <p class="mate-line">“${m.line}”</p>
    <div class="traits">${traitCells}</div>
  </div>`;
}
$('#btnNo').addEventListener('click', ()=>{ idx++; renderCard(); });
$('#btnYes').addEventListener('click', ()=>{ matches.push(deck[idx]); idx++; renderCard(); });
$('#editProfile').addEventListener('click', startQuiz);

/* ---------- matches + chat ---------- */
function renderMatches(){
  show('matches');
  const L = $('#matchList');
  if(!matches.length){
    L.innerHTML = `<div class="card empty">No connections this round.<br>Loosen one preference — or join the waitlist and we'll bring your city to you.</div>`;
    return;
  }
  L.innerHTML = matches.map((d, i)=>`<div class="card">
    <div class="match-row">
      <div class="avatar" style="background:${avaColor(d.p.name)}">${initials(d.p.name)}</div>
      <div><b>${d.p.name}, ${d.p.age}</b>${d.p.verified ? '<span class="verified">✓ ID verified</span>' : ''}<br>
      <span class="muted">${d.p.area} · ${d.p.job}</span></div>
      <div class="sc">${d.s.pct}%</div>
    </div>
    <div class="match-actions">
      <button class="btn btn-go" data-chat="${i}">💬 Chat</button>
      <button class="btn btn-ghost" data-safety="1">Safety steps</button>
    </div></div>`).join('');
  L.querySelectorAll('[data-chat]').forEach(b=>b.addEventListener('click', ()=>openChat(matches[+b.dataset.chat])));
  L.querySelectorAll('[data-safety]').forEach(b=>b.addEventListener('click', ()=>show('safety')));
}
$('#againBtn').addEventListener('click', ()=>show('home'));

function openChat(d){
  chatPerson = d;
  $('#chatName').textContent = `${d.p.name}, ${d.p.age} · ${d.s.pct}% match`;
  $('#chatVerified').classList.toggle('hidden', !d.p.verified);
  const log = $('#chatLog');
  log.innerHTML = `<div class="msg sys">You connected with ${d.p.name}. Chat here until you've video-called and met in public.</div>
    <div class="msg them">Hi! ${d.s.pct}% is honestly the highest match I've seen here. ${d.s.why[0] ? d.s.why[0].replace(/^.*?— /,'') : 'Our schedules line up.'} Want to swap weekend routines and see if this could work?</div>`;
  $('#icebreakers').innerHTML = ['Ask about their Sunday routine','The guest rule: what works for you?','Bills: split even, or split by room size?']
    .map(t=>`<button class="ice">${t}</button>`).join('');
  document.querySelectorAll('.ice').forEach(b=>b.addEventListener('click', ()=>{ sendMsg(b.textContent); }));
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
function sendMsg(text){
  const log = $('#chatLog');
  log.insertAdjacentHTML('beforeend', `<div class="msg me"></div>`);
  log.lastElementChild.textContent = text;
  log.scrollTop = log.scrollHeight;
  setTimeout(()=>{
    log.insertAdjacentHTML('beforeend', `<div class="msg them"></div>`);
    log.lastElementChild.textContent = REPLIES[replyIdx++ % REPLIES.length];
    log.scrollTop = log.scrollHeight;
  }, 650);
}
$('#chatForm').addEventListener('submit', e=>{
  e.preventDefault();
  const v = $('#chatInput').value.trim(); if(!v) return;
  $('#chatInput').value = ''; sendMsg(v);
});
$('#chatBack').addEventListener('click', ()=>show('matches'));
$('#planCall').addEventListener('click', ()=>{
  $('#chatLog').insertAdjacentHTML('beforeend', `<div class="msg sys">📹 Video call proposed for tomorrow evening. ${chatPerson.p.name} gets the same prompt — no phone numbers exchanged.</div>`);
  $('#chatLog').scrollTop = $('#chatLog').scrollHeight;
});
$('#planMeet').addEventListener('click', ()=>{
  $('#chatLog').insertAdjacentHTML('beforeend', `<div class="msg sys">☕ Public meet suggested: a café near ${chatPerson.p.area}, daytime. Tell a friend where you'll be.</div>`);
  $('#chatLog').scrollTop = $('#chatLog').scrollHeight;
});

initHome();
