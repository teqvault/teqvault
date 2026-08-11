/* ============================================================
   TEN WORDS — daily narrative deduction puzzle
   ============================================================ */

const STORIES = [
{ title:'THE LIGHTHOUSE KEEPER',
  segments:['The keeper climbed the ',' stairs every ',' before dusk, carrying a ',' of oil and a ',' she refused to let die. Sailors who passed the ',' point swore her light was the ',' thing they trusted in a ',' that gave them little else. When the storms came, she didn\u2019t ',' \u2014 she simply lit the next ',', and the next, until ',' finally broke.'],
  answers:['spiral','evening','tin','flame','rocky','only','world','run','wick','dawn'] },

{ title:'THE CARTOGRAPHER',
  segments:['She drew maps of places that didn\u2019t ',' exist, filling the edges with ',' she hoped were true. Her father called it a ',' of time; she called it ','. When the first ship reached the ',' she\u2019d sketched from a half-remembered ',', she didn\u2019t feel ',' \u2014 she felt ',', like a door long shut had finally ','. She folded the map and began the ',' one.'],
  answers:['yet','guesses','waste','faith','island','dream','surprised','relief','opened','next'] },

{ title:'THE LAST ORCHARD',
  segments:['Nobody had watered the ',' since the well went ',', but the old trees kept ',' anyway, stubborn as the ',' that refused to leave. Every spring the children came to ',' what little fruit survived, and every spring their ',' pretended not to notice how ',' the harvest had grown. Nobody said the word ',' out loud. They just kept ',', the way people do when a place still feels like ','.'],
  answers:['orchard','dry','blooming','town','pick','parents','thin','dying','coming','home'] },

{ title:'THE RADIO OPERATOR',
  segments:['For three years she broadcast into the ',', never certain anyone was ','. She read the news, the ',', sometimes just her own ',', because silence felt like giving ','. Then one night a voice answered \u2014 ',', far away, impossibly ','. It said only three words: ',' talking, please. She hasn\u2019t gone ',' since, and neither, as far as she knows, has ','.'],
  answers:['static','listening','weather','thoughts','up','faint','real','keep','quiet','he'] },

{ title:'THE DEBT',
  segments:['He\u2019d promised to repay every ',' before he left, but the list had grown ',' than the time he had ','. So he started with the ',' ones \u2014 a fixed fence, a returned ',', a name spoken kindly at the right ','. He never got to the ',' debts, the ones that mattered ','. But the town remembered the ',' ones longest, and called that, in the ',', enough.'],
  answers:['favor','longer','left','smallest','book','moment','big','most','small','end'] },

{ title:'THE UNDERSTUDY',
  segments:['She\u2019d learned every ',' in the play without ever expecting to ',' one. Understudies rarely ',' on, everyone told her, so she stopped ',' and just kept ',', because the words deserved someone who ','. When the lead lost her ',' an hour before curtain, panic found her ','. She walked onto a stage built for someone ',' and made it, for one ',', hers.'],
  answers:['line','speak','go','hoping','learning','cared','voice','ready','else','night'] },

{ title:'THE SIGNAL FIRE',
  segments:['They kept a fire burning on the ',' long after the war had ',', not because anyone was still ',', but because someone always had to ','. It became less a warning and more a ',' \u2014 that if you ever came home ',', there would be a ',' on the hill to walk ','. Even after the last soldier ',', the fire stayed lit, out of pure ','.'],
  answers:['ridge','ended','coming','watch','promise','lost','light','toward','returned','habit'] },

{ title:'THE APPRENTICE SMITH',
  segments:['The old smith never said the boy had ',', only that his hands hadn\u2019t learned to ',' motion yet. Years of failed blades taught the boy more than any ',' could have \u2014 how heat ',' mistakes the cold never will, how a good ',' takes patience no one can ','. The day his first sword didn\u2019t ',' under the hammer, the old man said nothing, just ',' once, and handed him the ',' piece of iron, like it was already ','.'],
  answers:['talent','waste','praise','forgives','edge','rush','crack','nodded','next','settled'] },
];

const MAX_GUESSES = 6;
let mode = 'daily';           // 'daily' | 'practice'
let storyIdx = 0;
let story = null;
let bankWords = [];           // words not yet placed
let placed = [];              // length 10, null or word
let selected = null;          // currently selected bank word
let history = [];             // array of arrays of 'green'|'yellow'
let finished = false;
let won = false;
let stats = { streak:0, maxStreak:0, lastDay:-1, played:0, wins:0 };
let storageOK = true;
let practiceCache = {};       // per-practice-index saved state (session only)

const $ = id => document.getElementById(id);

function todayIndex(){
  return Math.floor(Date.now()/86400000);
}

/* ---------- persistence ---------- */
async function loadStats(){
  try{
    const res = await window.storage.get('tenwords:stats');
    if(res && res.value) stats = Object.assign(stats, JSON.parse(res.value));
  }catch(e){ if(!window.storage) storageOK = false; }
}
async function saveStats(){
  if(!storageOK) return;
  try{ await window.storage.set('tenwords:stats', JSON.stringify(stats)); }catch(e){ storageOK=false; }
}
async function loadDaily(dayNum){
  try{
    const res = await window.storage.get('tenwords:day:'+dayNum);
    if(res && res.value) return JSON.parse(res.value);
  }catch(e){}
  return null;
}
async function saveDaily(dayNum, data){
  if(!storageOK) return;
  try{ await window.storage.set('tenwords:day:'+dayNum, JSON.stringify(data)); }catch(e){}
}

/* ---------- setup ---------- */
function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

async function startDaily(){
  mode = 'daily';
  $('tabDaily').classList.add('active'); $('tabPractice').classList.remove('active');
  const day = todayIndex();
  storyIdx = day % STORIES.length;
  story = STORIES[storyIdx];
  finished = false; won = false; history = [];
  placed = new Array(10).fill(null);

  const saved = await loadDaily(day);
  if(saved){
    history = saved.history;
    finished = true;
    won = saved.won;
    placed = story.answers.slice();
    bankWords = [];
  } else {
    bankWords = shuffle(story.answers);
  }
  $('hudLeft').textContent = 'Day #' + (day - firstDay + 1);
  renderStreak();
  render();
  if(finished) showResultFromHistory();
}

function startPractice(idx){
  mode = 'practice';
  $('tabPractice').classList.add('active'); $('tabDaily').classList.remove('active');
  storyIdx = idx;
  story = STORIES[storyIdx];
  const cached = practiceCache[storyIdx];
  if(cached){
    ({history, finished, won, placed, bankWords} = cached);
  } else {
    history = []; finished = false; won = false;
    placed = new Array(10).fill(null);
    bankWords = shuffle(story.answers);
  }
  $('hudLeft').textContent = 'Practice \u00b7 story ' + (idx+1) + ' / ' + STORIES.length;
  $('hudStreak').textContent = '';
  render();
  if(finished) showResultFromHistory();
}

let firstDay = todayIndex(); // reference point so "Day #" starts at 1 the first time it's opened

/* ---------- tabs ---------- */
$('tabDaily').addEventListener('click', ()=>{ if(mode!=='daily') startDaily(); });
$('tabPractice').addEventListener('click', ()=>{ if(mode!=='practice') startPractice(storyIdx); });

/* ---------- placement ---------- */
function onBankClick(word, chipEl){
  if(finished) return;
  if(selected === word){ selected = null; }
  else { selected = word; }
  render();
}
function onBlankClick(i){
  if(finished) return;
  if(selected){
    const prevWordAtBlank = placed[i];
    placed[i] = selected;
    bankWords = bankWords.filter(w => w !== selected);
    if(prevWordAtBlank) bankWords.push(prevWordAtBlank);
    selected = null;
  } else if(placed[i]){
    bankWords.push(placed[i]);
    placed[i] = null;
  }
  render();
}

$('clearBtn').addEventListener('click', ()=>{
  if(finished) return;
  placed.forEach(w => { if(w) bankWords.push(w); });
  placed = new Array(10).fill(null);
  selected = null;
  render();
});

$('submitBtn').addEventListener('click', async ()=>{
  if(finished || placed.some(w=>!w)) return;
  const result = placed.map((w,i)=> w===story.answers[i] ? 'green' : 'yellow');
  history.push(result);
  const allGreen = result.every(r=>r==='green');
  const outOfTries = history.length >= MAX_GUESSES;

  if(allGreen || outOfTries){
    finished = true; won = allGreen;
    if(mode==='daily'){
      const day = todayIndex();
      await saveDaily(day, {history, won});
      stats.played++;
      if(won){
        stats.wins++;
        stats.streak = (stats.lastDay === day-1) ? stats.streak+1 : 1;
        stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      } else {
        stats.streak = 0;
      }
      stats.lastDay = day;
      await saveStats();
      renderStreak();
    } else {
      practiceCache[storyIdx] = {history, finished, won, placed, bankWords};
    }
    render();
    setTimeout(showResultFromHistory, 350);
  } else {
    render();
    toast((MAX_GUESSES - history.length) + ' guesses left');
  }
});

/* ---------- rendering ---------- */
function render(){
  $('storyTitle').textContent = story.title;
  const sEl = $('sentence');
  sEl.innerHTML = '';
  const lastGuess = history.length ? history[history.length-1] : null;
  for(let i=0;i<story.segments.length;i++){
    sEl.appendChild(document.createTextNode(story.segments[i]));
    if(i < story.answers.length){
      const b = document.createElement('span');
      b.className = 'blank';
      const word = finished ? story.answers[i] : placed[i];
      if(word){ b.textContent = word; b.classList.add('filled'); }
      else { b.textContent = '\u2014'; }
      if(finished){
        b.classList.add(won ? 'g-green' : (placed[i]===story.answers[i] ? 'g-green' : 'g-yellow'));
      } else if(lastGuess){
        // no persistent per-blank coloring outside history; keep neutral
      }
      b.addEventListener('click', ()=>onBlankClick(i));
      sEl.appendChild(b);
    }
  }

  const bankEl = $('bank');
  bankEl.innerHTML = '';
  bankWords.forEach(w=>{
    const c = document.createElement('span');
    c.className = 'chip' + (selected===w ? ' selected' : '');
    c.textContent = w;
    c.addEventListener('click', ()=>onBankClick(w, c));
    bankEl.appendChild(c);
  });

  $('submitBtn').disabled = finished || placed.some(w=>!w);
  $('clearBtn').disabled = finished;

  const hEl = $('history');
  hEl.innerHTML = '';
  history.forEach((row,i)=>{
    const r = document.createElement('div'); r.className = 'hrow';
    const n = document.createElement('span'); n.className='n'; n.textContent = (i+1);
    const sq = document.createElement('div'); sq.className='squares';
    row.forEach(res=>{
      const s = document.createElement('div'); s.className = 'sq ' + res; sq.appendChild(s);
    });
    r.appendChild(n); r.appendChild(sq);
    hEl.appendChild(r);
  });
}

function renderStreak(){
  if(mode==='daily') $('hudStreak').textContent = stats.streak>0 ? (stats.streak + ' day streak') : '';
}

/* ---------- result modal ---------- */
function shareText(){
  const label = mode==='daily' ? 'Ten Words Day #' + ($('hudLeft').textContent.replace('Day #','')) : 'Ten Words \u00b7 practice';
  const lines = history.map(row => row.map(r => r==='green' ? '\ud83d\udfe9' : '\ud83d\udfe8').join(''));
  const summary = won ? (history.length + '/' + MAX_GUESSES) : 'X/' + MAX_GUESSES;
  return label + ' \u2014 ' + summary + '\n' + lines.join('\n');
}

function fullStoryText(){
  let s = '';
  for(let i=0;i<story.segments.length;i++){
    s += story.segments[i];
    if(i < story.answers.length) s += story.answers[i];
  }
  return s;
}

function showResultFromHistory(){
  $('rKick').textContent = story.title;
  $('rResult').textContent = won ? 'SOLVED \u2014 ' + history.length + '/' + MAX_GUESSES : 'OUT OF GUESSES';
  $('rResult').className = 'result ' + (won ? 'win' : 'lose');
  $('rBody').textContent = fullStoryText();
  $('resultVeil').classList.add('show');
}
$('closeBtn').addEventListener('click', ()=> $('resultVeil').classList.remove('show'));
$('shareBtn').addEventListener('click', async ()=>{
  try{
    await navigator.clipboard.writeText(shareText());
    toast('Copied to clipboard');
  }catch(e){
    toast('Copy failed \u2014 select manually');
  }
});

/* ---------- practice cycling on result close if desired ---------- */
$('resultVeil').addEventListener('click', (e)=>{
  if(e.target.id === 'resultVeil') $('resultVeil').classList.remove('show');
});

/* ---------- toast ---------- */
let toastTimer=null;
function toast(msg, ms=1800){
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), ms);
}

/* practice next-story affordance via title tap */
$('storyTitle').addEventListener('dblclick', ()=>{
  if(mode==='practice'){
    startPractice((storyIdx+1) % STORIES.length);
  }
});

/* ---------- boot ---------- */
(async function boot(){
  await loadStats();
  await startDaily();
})();
