/* ============================================================
   LANTERN POST — node-graph courier puzzles, letters as reward
   ============================================================ */

const cv = document.getElementById('map');
const ctx = cv.getContext('2d');

/* ---------- art assets ---------- */
const ART_BASE = 'assets/images/lantern/';
function loadImg(file){ const im = new Image(); im.src = ART_BASE + file; return im; }
const ART = {
  bg:      loadImg('bg.jpg'),
  start:   loadImg('orb-start.png'),
  dest:    loadImg('orb-dest.png'),
  way:     loadImg('orb-way.png'),
  node:    loadImg('orb-node.png'),
  letter:  loadImg('icon-letter.png'),
  road:    loadImg('road.png'),
  signal:  loadImg('node-signal.png'),
};
let artReady = false;
{
  const files = Object.values(ART);
  let loaded = 0;
  files.forEach(im => {
    im.onload = im.onerror = () => { loaded++; if(loaded===files.length){ artReady = true; draw(); } };
  });
}

/* ---------- levels ----------
   node: {id, x, y, type:'start'|'dest'|'way'|'node', refill}
   edge: {a, b, cost, blocked}
*/
const LEVELS = [
{ name:'The First Mile', oil:8, par:2,
  nodes:[
    {id:'S',x:80, y:215,type:'start'},
    {id:'A',x:350,y:120},
    {id:'B',x:350,y:310},
    {id:'D',x:620,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:3},{a:'A',b:'D',cost:3},{a:'S',b:'B',cost:5},{a:'B',b:'D',cost:5} ] },

{ name:'The Waystation', oil:9, par:1,
  nodes:[
    {id:'S',x:70, y:215,type:'start'},
    {id:'A',x:250,y:110},
    {id:'B',x:250,y:320},
    {id:'W',x:430,y:110,type:'way',refill:3},
    {id:'D',x:630,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:4},{a:'S',b:'B',cost:4},{a:'A',b:'W',cost:2},{a:'W',b:'D',cost:5},{a:'B',b:'D',cost:6} ] },

{ name:'Crossroads', oil:12, par:2,
  nodes:[
    {id:'S', x:70, y:215,type:'start'},
    {id:'A', x:220,y:100},
    {id:'B', x:220,y:330},
    {id:'C', x:400,y:215},
    {id:'W1',x:400,y:80, type:'way',refill:4},
    {id:'W2',x:400,y:350,type:'way',refill:2},
    {id:'D', x:640,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:3},{a:'S',b:'B',cost:3},{a:'A',b:'C',cost:4},{a:'B',b:'C',cost:4},
          {a:'A',b:'W1',cost:3},{a:'W1',b:'D',cost:8},{a:'C',b:'D',cost:6},
          {a:'W2',b:'D',cost:5},{a:'B',b:'W2',cost:4} ] },

{ name:'The Long Dark', oil:10, par:0,
  nodes:[
    {id:'S', x:60, y:215,type:'start'},
    {id:'A', x:190,y:110},
    {id:'B', x:190,y:320},
    {id:'C', x:330,y:215},
    {id:'W1',x:330,y:70, type:'way',refill:3},
    {id:'W2',x:480,y:215,type:'way',refill:2},
    {id:'E', x:480,y:110},
    {id:'F', x:480,y:320},
    {id:'D', x:650,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:2},{a:'S',b:'B',cost:2},{a:'A',b:'C',cost:3},{a:'B',b:'C',cost:3},
          {a:'A',b:'W1',cost:4},{a:'W1',b:'E',cost:3},{a:'C',b:'W2',cost:3},
          {a:'W2',b:'E',cost:2},{a:'W2',b:'F',cost:2},{a:'E',b:'D',cost:4},{a:'F',b:'D',cost:4} ] },

{ name:'Toll of the Marsh', oil:14, par:4,
  nodes:[
    {id:'S', x:60, y:215,type:'start'},
    {id:'A', x:200,y:120},
    {id:'B', x:200,y:310},
    {id:'C', x:340,y:120},
    {id:'W1',x:340,y:310,type:'way',refill:4},
    {id:'E', x:480,y:120},
    {id:'W2',x:480,y:310,type:'way',refill:3},
    {id:'D', x:650,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:3},{a:'S',b:'B',cost:3},{a:'A',b:'C',cost:4},{a:'B',b:'W1',cost:4},
          {a:'C',b:'E',cost:4},{a:'W1',b:'C',cost:3},{a:'W1',b:'W2',cost:5},
          {a:'E',b:'D',cost:5},{a:'W2',b:'D',cost:4} ] },

{ name:'The Broken Bridge', oil:11, par:3,
  nodes:[
    {id:'S',x:60, y:215,type:'start'},
    {id:'A',x:230,y:100},
    {id:'B',x:230,y:330},
    {id:'C',x:420,y:100},
    {id:'E',x:420,y:330},
    {id:'W',x:420,y:215,type:'way',refill:3},
    {id:'D',x:660,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:3},{a:'S',b:'B',cost:4},{a:'A',b:'C',cost:4},
          {a:'C',b:'D',cost:0,blocked:true},
          {a:'B',b:'E',cost:4},{a:'E',b:'D',cost:5},
          {a:'A',b:'W',cost:5},{a:'W',b:'D',cost:4},{a:'B',b:'W',cost:3} ] },

{ name:'Night of the Storm', oil:13, par:2,
  nodes:[
    {id:'S', x:60, y:215,type:'start'},
    {id:'A', x:180,y:110},
    {id:'B', x:180,y:320},
    {id:'C', x:320,y:60},
    {id:'M', x:320,y:215},
    {id:'E', x:320,y:370},
    {id:'F', x:470,y:110},
    {id:'W', x:470,y:290,type:'way',refill:5},
    {id:'D', x:660,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:3},{a:'S',b:'B',cost:3},{a:'A',b:'C',cost:4},{a:'A',b:'M',cost:4},
          {a:'B',b:'M',cost:4},{a:'B',b:'E',cost:3},{a:'C',b:'F',cost:4},{a:'M',b:'F',cost:5},
          {a:'M',b:'W',cost:4},{a:'E',b:'W',cost:4},{a:'F',b:'D',cost:5},{a:'W',b:'D',cost:6} ] },

{ name:'The Last Lantern', oil:12, par:0,
  nodes:[
    {id:'S', x:60, y:215,type:'start'},
    {id:'A', x:190,y:100},
    {id:'B', x:190,y:330},
    {id:'C', x:330,y:170},
    {id:'E', x:330,y:300},
    {id:'W1',x:470,y:90, type:'way',refill:3},
    {id:'W2',x:470,y:330,type:'way',refill:4},
    {id:'D', x:660,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:2},{a:'S',b:'B',cost:4},{a:'A',b:'C',cost:3},{a:'B',b:'E',cost:3},
          {a:'C',b:'E',cost:2},{a:'C',b:'W1',cost:4},{a:'E',b:'W2',cost:4},
          {a:'W1',b:'D',cost:6},{a:'W2',b:'D',cost:5} ] },

{ name:'The Homecoming', oil:10, par:2,
  nodes:[
    {id:'S',x:50, y:215,type:'start'},
    {id:'A',x:200,y:90},
    {id:'B',x:200,y:340},
    {id:'C',x:380,y:90},
    {id:'E',x:380,y:340},
    {id:'W',x:380,y:215,type:'way',refill:4},
    {id:'D',x:650,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:3},{a:'S',b:'B',cost:3},{a:'A',b:'C',cost:3},{a:'B',b:'E',cost:3},
          {a:'A',b:'W',cost:5},{a:'B',b:'W',cost:5},{a:'C',b:'W',cost:3},{a:'E',b:'W',cost:3},
          {a:'C',b:'D',cost:6},{a:'E',b:'D',cost:6},{a:'W',b:'D',cost:5} ] },

{ name:'Beacon Chain', oil:15, par:3,
  nodes:[
    {id:'S',x:50, y:215,type:'start'},
    {id:'A',x:180,y:110},
    {id:'B',x:180,y:320},
    {id:'C',x:310,y:60},
    {id:'W1',x:310,y:215,type:'way',refill:4},
    {id:'E',x:310,y:370},
    {id:'F',x:460,y:110},
    {id:'G',x:460,y:320},
    {id:'D',x:650,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:3},{a:'S',b:'B',cost:3},{a:'A',b:'C',cost:3},{a:'A',b:'W1',cost:4},
          {a:'B',b:'W1',cost:4},{a:'B',b:'E',cost:3},{a:'C',b:'F',cost:4},{a:'W1',b:'F',cost:3},
          {a:'W1',b:'G',cost:3},{a:'E',b:'G',cost:4},{a:'F',b:'D',cost:5},{a:'G',b:'D',cost:5},
          {a:'W1',b:'D',cost:9} ] },

{ name:'The Long Return', oil:14, par:2,
  nodes:[
    {id:'S',x:50, y:215,type:'start'},
    {id:'A',x:200,y:100},
    {id:'B',x:200,y:330},
    {id:'C',x:350,y:215},
    {id:'W1',x:350,y:60, type:'way',refill:3},
    {id:'W2',x:350,y:370,type:'way',refill:3},
    {id:'D',x:650,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:4},{a:'S',b:'B',cost:4},{a:'A',b:'C',cost:4},{a:'B',b:'C',cost:4},
          {a:'A',b:'W1',cost:3},{a:'B',b:'W2',cost:3},{a:'W1',b:'C',cost:2},{a:'W2',b:'C',cost:2},
          {a:'C',b:'D',cost:7},{a:'W1',b:'D',cost:6},{a:'W2',b:'D',cost:6} ] },

{ name:'Third Flame Village', oil:16, par:4,
  nodes:[
    {id:'S',x:50, y:215,type:'start'},
    {id:'A',x:180,y:90},
    {id:'B',x:180,y:340},
    {id:'C',x:320,y:90},
    {id:'E',x:320,y:340},
    {id:'W1',x:320,y:215,type:'way',refill:5},
    {id:'F',x:470,y:90},
    {id:'G',x:470,y:340},
    {id:'D',x:650,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:3},{a:'S',b:'B',cost:3},{a:'A',b:'C',cost:3},{a:'B',b:'E',cost:3},
          {a:'A',b:'W1',cost:4},{a:'B',b:'W1',cost:4},{a:'C',b:'W1',cost:2},{a:'E',b:'W1',cost:2},
          {a:'C',b:'F',cost:4},{a:'E',b:'G',cost:4},{a:'W1',b:'F',cost:4},{a:'W1',b:'G',cost:4},
          {a:'F',b:'D',cost:5},{a:'G',b:'D',cost:5},{a:'W1',b:'D',cost:9} ] },

{ name:'Marsh of Embers', oil:13, par:1,
  nodes:[
    {id:'S',x:50, y:215,type:'start'},
    {id:'A',x:210,y:120},
    {id:'B',x:210,y:310},
    {id:'C',x:360,y:215},
    {id:'W',x:360,y:60, type:'way',refill:4},
    {id:'D',x:650,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:4},{a:'S',b:'B',cost:4},{a:'A',b:'C',cost:4},{a:'B',b:'C',cost:4},
          {a:'A',b:'W',cost:3},{a:'C',b:'W',cost:3},{a:'C',b:'D',cost:6},{a:'W',b:'D',cost:7},
          {a:'B',b:'D',cost:9,blocked:true} ] },

{ name:'The Iron Bridge', oil:17, par:3,
  nodes:[
    {id:'S',x:50, y:215,type:'start'},
    {id:'A',x:190,y:90},
    {id:'B',x:190,y:340},
    {id:'C',x:330,y:90},
    {id:'E',x:330,y:340},
    {id:'W1',x:330,y:215,type:'way',refill:5},
    {id:'F',x:480,y:90},
    {id:'G',x:480,y:340},
    {id:'W2',x:480,y:215,type:'way',refill:3},
    {id:'D',x:650,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:3},{a:'S',b:'B',cost:3},{a:'A',b:'C',cost:3},{a:'B',b:'E',cost:3},
          {a:'A',b:'W1',cost:4},{a:'B',b:'W1',cost:4},{a:'C',b:'F',cost:4},{a:'E',b:'G',cost:4},
          {a:'C',b:'W2',cost:3},{a:'E',b:'W2',cost:3},{a:'W1',b:'W2',cost:3},
          {a:'F',b:'D',cost:4},{a:'G',b:'D',cost:4},{a:'W2',b:'D',cost:5},{a:'W1',b:'D',cost:8} ] },

{ name:'Wolves at the Ford', oil:15, par:2,
  nodes:[
    {id:'S',x:50, y:215,type:'start'},
    {id:'A',x:220,y:100},
    {id:'B',x:220,y:330},
    {id:'C',x:400,y:215},
    {id:'W1',x:400,y:80, type:'way',refill:4},
    {id:'W2',x:400,y:350,type:'way',refill:4},
    {id:'D',x:650,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:3},{a:'S',b:'B',cost:3},{a:'A',b:'C',cost:4},{a:'B',b:'C',cost:4},
          {a:'A',b:'W1',cost:3},{a:'B',b:'W2',cost:3},{a:'C',b:'W1',cost:2},{a:'C',b:'W2',cost:2},
          {a:'C',b:'D',cost:6},{a:'W1',b:'D',cost:6},{a:'W2',b:'D',cost:6} ] },

{ name:'The Frozen Span', oil:16, par:3,
  nodes:[
    {id:'S',x:50, y:215,type:'start'},
    {id:'A',x:200,y:90},
    {id:'B',x:200,y:340},
    {id:'C',x:350,y:90},
    {id:'E',x:350,y:340},
    {id:'M',x:350,y:215},
    {id:'W',x:500,y:215,type:'way',refill:5},
    {id:'D',x:650,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:3},{a:'S',b:'B',cost:3},{a:'A',b:'C',cost:3},{a:'B',b:'E',cost:3},
          {a:'A',b:'M',cost:4},{a:'B',b:'M',cost:4},{a:'C',b:'W',cost:4},{a:'E',b:'W',cost:4},
          {a:'M',b:'W',cost:3},{a:'W',b:'D',cost:6},
          {a:'C',b:'D',cost:9,blocked:true},{a:'E',b:'D',cost:9,blocked:true} ] },

{ name:'Last Watch of the Keepers', oil:18, par:4,
  nodes:[
    {id:'S',x:50, y:215,type:'start'},
    {id:'A',x:190,y:80},
    {id:'B',x:190,y:350},
    {id:'C',x:330,y:80},
    {id:'E',x:330,y:350},
    {id:'W1',x:330,y:215,type:'way',refill:5},
    {id:'F',x:480,y:80},
    {id:'G',x:480,y:350},
    {id:'W2',x:480,y:215,type:'way',refill:4},
    {id:'D',x:650,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:3},{a:'S',b:'B',cost:3},{a:'A',b:'C',cost:3},{a:'B',b:'E',cost:3},
          {a:'A',b:'W1',cost:4},{a:'B',b:'W1',cost:4},{a:'C',b:'F',cost:4},{a:'E',b:'G',cost:4},
          {a:'C',b:'W2',cost:3},{a:'E',b:'W2',cost:3},{a:'W1',b:'W2',cost:4},
          {a:'F',b:'D',cost:4},{a:'G',b:'D',cost:4},{a:'W2',b:'D',cost:5},{a:'W1',b:'D',cost:9} ] },

{ name:'The First Flame Returns', oil:20, par:5,
  nodes:[
    {id:'S',x:50, y:215,type:'start'},
    {id:'A',x:180,y:90},
    {id:'B',x:180,y:340},
    {id:'C',x:320,y:90},
    {id:'E',x:320,y:340},
    {id:'W1',x:320,y:215,type:'way',refill:6},
    {id:'F',x:470,y:90},
    {id:'G',x:470,y:340},
    {id:'W2',x:470,y:215,type:'way',refill:5},
    {id:'D',x:650,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:3},{a:'S',b:'B',cost:3},{a:'A',b:'C',cost:3},{a:'B',b:'E',cost:3},
          {a:'A',b:'W1',cost:4},{a:'B',b:'W1',cost:4},{a:'C',b:'F',cost:4},{a:'E',b:'G',cost:4},
          {a:'C',b:'W2',cost:4},{a:'E',b:'W2',cost:4},{a:'W1',b:'W2',cost:4},
          {a:'F',b:'D',cost:4},{a:'G',b:'D',cost:4},{a:'W2',b:'D',cost:5},{a:'W1',b:'D',cost:9} ] },

{ name:'Past the Last Map', oil:19, par:3,
  nodes:[
    {id:'S',x:50, y:215,type:'start'},
    {id:'A',x:190,y:100},
    {id:'B',x:190,y:330},
    {id:'C',x:330,y:215},
    {id:'W1',x:330,y:70, type:'way',refill:4},
    {id:'E',x:470,y:100},
    {id:'F',x:470,y:330},
    {id:'W2',x:470,y:215,type:'way',refill:4},
    {id:'D',x:650,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:3},{a:'S',b:'B',cost:3},{a:'A',b:'C',cost:4},{a:'B',b:'C',cost:4},
          {a:'A',b:'W1',cost:3},{a:'W1',b:'E',cost:4},{a:'C',b:'W2',cost:3},{a:'B',b:'F',cost:4},
          {a:'W2',b:'E',cost:3},{a:'W2',b:'F',cost:3},{a:'C',b:'D',cost:11,blocked:true},
          {a:'E',b:'D',cost:5},{a:'F',b:'D',cost:5},{a:'W2',b:'D',cost:8} ] },

{ name:'The Signal', oil:21, par:3,
  nodes:[
    {id:'S',x:50, y:215,type:'start'},
    {id:'A',x:200,y:100},
    {id:'B',x:200,y:330},
    {id:'W1',x:360,y:100,type:'way',refill:4},
    {id:'W2',x:360,y:330,type:'way',refill:4},
    {id:'C',x:500,y:215},
    {id:'D',x:660,y:215,type:'dest',skin:'signal'} ],
  edges:[ {a:'S',b:'A',cost:4},{a:'S',b:'B',cost:4},{a:'A',b:'W1',cost:3},{a:'B',b:'W2',cost:3},
          {a:'W1',b:'C',cost:5},{a:'W2',b:'C',cost:5},{a:'A',b:'B',cost:6,blocked:true},
          {a:'C',b:'D',cost:6},{a:'W1',b:'D',cost:11,blocked:true},{a:'W2',b:'D',cost:11,blocked:true} ] },

{ name:'The Snuffed Post', oil:18, par:3,
  nodes:[
    {id:'S',x:50, y:215,type:'start'},
    {id:'A',x:200,y:100},
    {id:'B',x:200,y:330},
    {id:'W1',x:360,y:100,type:'way',refill:5,dead:true},
    {id:'W2',x:360,y:330,type:'way',refill:5},
    {id:'C',x:520,y:215},
    {id:'D',x:680,y:215,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:4},{a:'S',b:'B',cost:4},{a:'A',b:'W1',cost:3},{a:'B',b:'W2',cost:3},
          {a:'A',b:'B',cost:7},{a:'W1',b:'C',cost:5},{a:'W2',b:'C',cost:5},{a:'C',b:'D',cost:6} ] },

{ name:'Two Roads', oil:16, par:2,
  nodes:[
    {id:'S', x:50, y:215,type:'start'},
    {id:'A', x:220,y:100},
    {id:'B', x:220,y:330},
    {id:'C', x:400,y:215},
    {id:'D1',x:640,y:100,type:'dest'},
    {id:'D2',x:640,y:330,type:'dest'} ],
  edges:[ {a:'S',b:'A',cost:4},{a:'S',b:'B',cost:4},{a:'A',b:'C',cost:4},{a:'B',b:'C',cost:4},
          {a:'C',b:'D1',cost:6},{a:'C',b:'D2',cost:6},{a:'A',b:'D1',cost:9},{a:'B',b:'D2',cost:9} ],
  letters:{
    D1:{from:'TOMAS, AT THE COAST FORK — TO EDDA', sig:'— T.',
        body:'The chain splits here — one line of spheres curves toward the coast, another cuts inland toward the old iron country. I went coastward; you\'ll get this one first if you\'re reading it, which means you took the other fork. Meet at the point where they rejoin, if they rejoin. Watch yourself, Edda. Whoever built this didn\'t build it for us to follow easily.'},
    D2:{from:'EDDA, AT THE INLAND FORK — TO TOMAS', sig:'— Edda',
        body:'Inland, then. The spheres out here run along an old road that predates the courier network entirely — cut stone, not packed dirt, older than Hollow Light itself. Whoever laid this down did it a long time before they started snuffing beacons. That changes the question. It isn\'t "who is doing this now." It\'s "how long has this been coming."'}
  } },
];

/* ---------- the letters ---------- */
const LETTERS = [
{from:'EDDA, AT HOLLOW LIGHT — TO TOMAS', sig:'— your sister, Edda',
 body:'The night is forty days old now, and still no dawn. The elders say the beacons went out one by one, like someone walking down a hall snuffing candles. I keep the post lamp lit for you. Whatever you find out there, brother — write. A letter is a small light, but it carries.'},
{from:'TOMAS, ON THE COAST ROAD — TO EDDA', sig:'— T.',
 body:'The roads are darker than we feared, but not empty. I fell in with the couriers — lantern-men who walk the old routes trading oil for news. They say the far beacons still burn. Edda, someone is keeping them lit. I mean to find out who. Tell mother I am eating well. It is mostly true.'},
{from:'EDDA, AT HOLLOW LIGHT — TO TOMAS', sig:'— Edda',
 body:'The village voted to ration the oil. Old Brann said lighting the post lamp for one absent boy is a luxury. I told him the lamp is not for you — it is for anyone out there in the dark, and you simply happen to be one of them. He had no answer. The lamp stays lit. Come home.'},
{from:'TOMAS, AT THE COLD LIGHTHOUSE — TO EDDA', sig:'— T.',
 body:'I reached the great lighthouse today. Cold. Empty for years, I think. But in the keeper\'s desk I found a chart, hand-drawn, marking a place inland called the First Flame — the fire they lit all the others from, in the beginning. If it still burns, Edda, we could carry it back. We could relight everything.'},
{from:'EDDA, AT HOLLOW LIGHT — TO TOMAS', sig:'— Edda',
 body:'Mother is ill. The doctor says it is the dark — people were not made for a night this long. In the evenings I read her your letters. All of them, in order, like a story. She always stops me at the same part: the couriers, trading oil for news. "Imagine that," she says. "Kindness, running on schedule."'},
{from:'TOMAS, IN THE HIGH PASS — TO EDDA', sig:'— T.',
 body:'A storm took my lantern on the pass. Three hours in dark so complete I forgot which way was down. Then a light — a stranger, a shepherd, who walked me to her hut and relit my lamp from hers without a word. I asked what I owed. She said, "Pass it on. That is the whole economy up here."'},
{from:'EDDA, AT HOLLOW LIGHT — TO TOMAS', sig:'— Edda',
 body:'Mother died on the seventh of the month, quietly, with your letters on the blanket. I thought I would be alone with it. But that night the whole village came — every one of them carrying a lamp, Brann included, until the square was so bright it threw shadows. The dark is long, Tomas. It is not winning.'},
{from:'TOMAS, ON THE HOME ROAD — TO EDDA', sig:'— your brother, coming home',
 body:'Edda. I found it. The First Flame — smaller than you\'d think, an ember in a firepot no bigger than a kettle, tended by three old keepers who wept when I told them people still looked for it. They gave me a portion to carry. I am two weeks out, walking beacon to beacon, lighting them as I go. Keep the lamp in the window. I\'ll follow it home.'},

{from:'TOMAS, HOME AT HOLLOW LIGHT — TO THE FAR KEEPERS', sig:'— Tomas',
 body:'I am home. Edda met me at the crossroads with mother\'s old lamp, already lit, and we stood there a long time saying nothing. But a firepot this small does no good sitting on a mantel. Tomorrow we walk out again, together this time. If any beacon out there still stands dark, expect us. We are bringing it back.'},

{from:'EDDA, ON THE ROAD WITH TOMAS — TO HOLLOW LIGHT', sig:'— Edda',
 body:'Strange to be the one leaving now, after four years of keeping the lamp for someone else\'s road. Tomas walks like the dark doesn\'t frighten him anymore — I suppose it doesn\'t, when you\'ve carried its opposite in a firepot. We passed three dead beacons today. Tonight, for the first time in longer than anyone remembers, they aren\'t.'},

{from:'OLD NESS, KEEPER OF REEDMOOR — TO TOMAS AND EDDA', sig:'— Old Ness',
 body:'You woke my beacon at midnight and I wept like a child. Forty years I kept watch here for a flame I half-believed was a story we told to make the dark bearable. Come inside, both of you, warm yourselves. I have oil to spare and forty years of questions. Whatever debt the world owes you, start the tally with me.'},

{from:'TOMAS, AT REEDMOOR — TO HOLLOW LIGHT', sig:'— T.',
 body:'Old Ness insists on feeding us until we can\'t walk, let alone carry a flame anywhere. She says every keeper along this stretch kept their post out of stubbornness alone, no proof it would ever matter. I told her it mattered today. She said, "It mattered every night. Today just finally showed its work."'},

{from:'EDDA, IN THE MARSH ROAD — TO THE COUNCIL', sig:'— Edda',
 body:'The marsh took one bridge from us — burned or rotted through, we couldn\'t tell in the dark, and wouldn\'t risk it. We went the long way around, oil running thinner than I liked. Tomas says a blocked road just means the map was wrong, not the destination. I am choosing to believe him. We reach the next beacon by morning.'},

{from:'TOMAS, AT THE IRON BRIDGE — TO EDDA', sig:'— T.',
 body:'Edda, if you\'re reading this you already crossed and I\'m a few hours behind you at the waystation, patching my boots and letting the second beacon here refill my lamp twice over. The bridge held. Everything out here that\'s still standing seems to be standing on purpose, the way people are, when enough of them decide to.'},

{from:'EDDA, AT THE FORD — TO HOLLOW LIGHT', sig:'— Edda',
 body:'Word travels faster than we do now — villages ahead already know two couriers are coming with a piece of the First Flame, and they leave their gates open at night, which I\'m told they haven\'t done in years. Tomas keeps saying we\'re just delivering mail. I think we stopped just delivering mail somewhere around the third beacon.'},

{from:'MIKA, AGE NINE, AT THE FROZEN SPAN — TO THE COURIERS', sig:'— Mika',
 body:'my mom said to say thank you for the light. I never seen the beacon lit before, I am nine. it looks like a small orange star that decided to stay. I want to be a courier when I am big enough to carry oil. please write back if couriers write back. I will keep this letter forever either way.'},

{from:'TOMAS AND EDDA, AT THE LAST WATCH — TO EVERYONE', sig:'— T. & E.',
 body:'The keepers here have kept this post so long they\'ve stopped counting the years, only the visitors — twelve, by their tally, in three decades, and we make thirteen and fourteen. They wanted to give us their own lamp as thanks. We told them to keep it lit instead. That is the only thanks either of us still knows how to accept.'},

{from:'THE FIRST FLAME — TO EVERY KEEPER, EVERY COURIER, EVERY LAMP IN EVERY WINDOW', sig:'— carried onward, by all of you',
 body:'This is the last delivery of this route, though not the last letter — those keep coming, from villages that have their nights back and don\'t quite know what to do with the extra hours except write to strangers about it. The dark isn\'t gone. It was never going to be gone all at once. But it is, tonight, considerably outnumbered. Keep the lamp in the window. Someone is always still walking home.'},

{from:'EDDA, PAST THE LAST MAPPED ROAD — UNSENT', sig:'— Edda (still writing)',
 body:'We ran out of map today. Old Ness warned us the roads stop being roads eventually, just old courier habit worn into the dirt, and she was right. What she didn\'t warn us about: a whole stretch of beacons out here that aren\'t dead from neglect. Someone put them out. On purpose. The oil dishes are dry but the wicks are cut clean through, every one, like a job someone finished. And past the last hill there\'s a light that isn\'t a beacon — too blue, too even, pulsing on a count I can\'t make sense of. Tomas is already walking toward it. I am not putting this letter down until he calls back to me. If he doesn\'t call back —'},

{from:'[UNKNOWN SOURCE — NOT A LETTER]', sig:'— signal continues', holo:true,
 body:'He called back. We both reached it. It isn\'t a fire and it isn\'t a beacon — it\'s a sphere the size of a lantern, hanging waist-high over nothing, built from lines of light too straight and too many to be anyone\'s hand. It has no wick to cut and no oil to give. When Tomas got close, it pulsed once, slower, like it noticed him. Then a second sphere lit on the ridge behind it. Then a third, farther out, and a fourth past that — a whole chain of them, stretching toward the horizon in a direction no courier road has ever gone. Whoever put out the beacons did not stop working when they finished. They kept building something else. We are following the chain. I will write again when there is a fifth.'},

{from:'TOMAS, ALONG THE CHAIN — TO EDDA', sig:'— T.',
 body:'Found a waystation today that should have been good — Old Ness marked it on her map as reliable, oil to spare. Wick cut clean, same as the dead beacons, except this one was still warm. Recently done. Whoever is doing this is ahead of us, not behind us. We went the long way around and made it, but Edda — they know we\'re coming. Or they don\'t care who\'s coming. I\'m not sure which is worse.'},
];
const EPILOGUE = 'All eight letters delivered. Behind you, one by one, the beacons are burning again.';

/* ---------- state ---------- */
let lvlIdx = 0;
let level = null;
let path = [];                 // array of node ids, starts with start node
let departing = false;
let departAnim = null;         // {seg, t, oil, usedRefills}
let stars = new Array(LEVELS.length).fill(false);
let unlocked = 0;              // letters unlocked = levels completed
let storageOK = true;
let hoverNode = null;
let deliveredChoice = [];      // per-level: which dest id was actually delivered to (for branching levels)

const $ = id => document.getElementById(id);

/* ---------- persistence ---------- */
async function loadSave(){
  try{
    const res = await window.storage.get('lanternpost:save');
    if(res && res.value){
      const s = JSON.parse(res.value);
      if(typeof s.unlocked === 'number') unlocked = Math.min(s.unlocked, LEVELS.length);
      if(Array.isArray(s.stars)) stars = LEVELS.map((_,i)=>!!s.stars[i]);
      if(Array.isArray(s.deliveredChoice)) deliveredChoice = s.deliveredChoice;
    }
  }catch(e){ if(!window.storage) storageOK = false; }
  if(deliveredChoice.length < LEVELS.length) deliveredChoice.length = LEVELS.length;
  lvlIdx = Math.min(unlocked, LEVELS.length-1);
  loadLevel(lvlIdx);
}
async function save(){
  if(!storageOK) return;
  try{ await window.storage.set('lanternpost:save', JSON.stringify({unlocked, stars, deliveredChoice})); }
  catch(e){ storageOK = false; }
}

function letterFor(i, destId){
  const lvl = LEVELS[i];
  if(lvl.letters) return lvl.letters[destId] || Object.values(lvl.letters)[0];
  return LETTERS[i];
}

/* ---------- level setup ---------- */
function loadLevel(i){
  lvlIdx = i;
  level = LEVELS[i];
  path = [ level.nodes.find(n=>n.type==='start').id ];
  departing = false; departAnim = null;
  $('lvlNum').textContent = i+1;
  $('lvlTotal').textContent = LEVELS.length;
  $('lvlName').textContent = level.name;
  updateOilHUD();
  draw();
  const hasSignal = level.nodes.some(n=>n.skin==='signal');
  if(hasSignal) idlePulse();
}

let idlePulseRunning = false;
function idlePulse(){
  if(idlePulseRunning) return;
  idlePulseRunning = true;
  (function tick(){
    if(!level.nodes.some(n=>n.skin==='signal')){ idlePulseRunning = false; return; }
    if(!departing) draw();
    requestAnimationFrame(tick);
  })();
}

function nodeById(id){ return level.nodes.find(n=>n.id===id); }
function edgeBetween(a,b){
  return level.edges.find(e => !e.blocked && ((e.a===a&&e.b===b)||(e.a===b&&e.b===a)));
}

/* simulate oil along a path; returns {oil, ok} — refills fire on first visit only */
function simulate(p){
  let oil = level.oil;
  const refilled = new Set();
  for(let i=1;i<p.length;i++){
    const e = edgeBetween(p[i-1], p[i]);
    if(!e) return {oil:-1, ok:false};
    oil -= e.cost;
    if(oil < 0) return {oil, ok:false};
    const n = nodeById(p[i]);
    if(n.type==='way' && !n.dead && !refilled.has(n.id)){ oil += n.refill; refilled.add(n.id); }
  }
  return {oil, ok:true};
}

/* ---------- interaction ---------- */
cv.addEventListener('click', e=>{
  if(departing) return;
  const r = cv.getBoundingClientRect();
  const x = (e.clientX-r.left) * (cv.width/r.width);
  const y = (e.clientY-r.top) * (cv.height/r.height);
  // scale the hit radius so a real ~40px on-screen touch target always
  // maps back to enough canvas-space radius, even when the canvas is
  // shrunk to fit a phone screen
  const scale = cv.width / r.width;
  const hitR = Math.min(44, Math.max(26, 40 * scale));
  const hit = level.nodes.find(n => (n.x-x)**2 + (n.y-y)**2 < hitR**2);
  if(!hit) return;

  const idxInPath = path.indexOf(hit.id);
  if(idxInPath >= 0){
    // backtrack to this node
    path = path.slice(0, idxInPath+1);
  } else {
    const head = path[path.length-1];
    if(!edgeBetween(head, hit.id)) return denyFlash();
    const trial = [...path, hit.id];
    const sim = simulate(trial);
    if(!sim.ok) return denyFlash();
    path = trial;
  }
  updateOilHUD();
  draw();
});

function denyFlash(){
  const box = $('oilBox');
  box.classList.add('deny');
  setTimeout(()=>box.classList.remove('deny'), 350);
}

$('resetBtn').addEventListener('click', ()=>{
  if(departing) return;
  path = [ level.nodes.find(n=>n.type==='start').id ];
  updateOilHUD(); draw();
});

$('departBtn').addEventListener('click', ()=>{
  if(departing) return;
  const head = nodeById(path[path.length-1]);
  if(!head || head.type!=='dest') return;
  departing = true;
  $('departBtn').disabled = true;
  departAnim = {seg:0, t:0, oil:level.oil, refilled:new Set()};
  requestAnimationFrame(stepDepart);
});

/* ---------- depart animation ---------- */
function stepDepart(){
  const a = departAnim;
  a.t += 0.028;
  if(a.t >= 1){
    a.t = 0;
    a.seg++;
    // arrive at node path[a.seg]
    const e = edgeBetween(path[a.seg-1], path[a.seg]);
    a.oil -= e.cost;
    const n = nodeById(path[a.seg]);
    if(n.type==='way' && !n.dead && !a.refilled.has(n.id)){ a.oil += n.refill; a.refilled.add(n.id); toast('+'+n.refill+' oil'); }
    else if(n.type==='way' && n.dead && !a.refilled.has(n.id)){ a.refilled.add(n.id); toast('the lamp here is dead — no oil'); }
    $('oilVal').textContent = a.oil;
    $('oilFill').style.width = Math.max(0, a.oil/level.oil*100) + '%';
    if(a.seg >= path.length-1){
      draw();
      flashDeliver();
      setTimeout(()=>deliver(a.oil), 500);
      return;
    }
  }
  draw();
  requestAnimationFrame(stepDepart);
}

function flashDeliver(){
  const t0 = performance.now();
  (function step(t){
    const p = Math.min(1, (t-t0)/450);
    draw();
    ctx.fillStyle = 'rgba(245,184,61,'+(0.4*(1-p))+')';
    ctx.fillRect(0,0,cv.width,cv.height);
    if(p<1) requestAnimationFrame(step);
  })(t0);
}

function avatarFor(L){
  const full = (L.from || '').toUpperCase();
  const f = full.split('—')[0]; // only match against the sender portion, not "TO ..."
  if(f.includes('UNKNOWN SOURCE') || f.includes('SIGNAL')) return 'signal.jpg';
  if(f.includes('FIRST FLAME')) return 'flame.jpg';
  if(f.includes('MIKA')) return 'mika.jpg';
  if(f.includes('NESS')) return 'old_ness.jpg';
  if(f.includes('BRANN')) return 'brann.jpg';
  if(f.includes('COUNCIL')) return 'council.jpg';
  if(f.includes('TOMAS') && f.includes('EDDA')) return 'tomas_edda.jpg';
  if(f.includes('TOMAS')) return 'tomas.jpg';
  if(f.includes('EDDA')) return 'edda.jpg';
  return 'keeper.jpg';
}

function deliver(remaining){
  const gotStar = remaining >= level.par;
  const destId = path[path.length-1];
  deliveredChoice[lvlIdx] = destId;
  if(lvlIdx === unlocked){
    unlocked++;
    if(gotStar) stars[lvlIdx] = true;
    save();
  } else if(gotStar && !stars[lvlIdx]){
    stars[lvlIdx] = true; save();
  } else {
    save();
  }
  const L = letterFor(lvlIdx, destId);
  $('pFrom').textContent = L.from;
  $('pAvatar').src = ART_BASE + 'characters/' + avatarFor(L);
  $('pBody').textContent = L.body;
  $('pSig').textContent = L.sig;
  $('pMeta').textContent = 'Delivered with ' + remaining + ' oil to spare';
  $('pStar').textContent = gotStar ? '✦ perfect delivery' : '';
  $('paperBox').classList.toggle('holo', !!L.holo);
  $('contBtn').textContent = (lvlIdx < LEVELS.length-1) ? 'NEXT DELIVERY' : 'FINISH';
  $('letterVeil').classList.add('show');
}

$('contBtn').addEventListener('click', ()=>{
  $('letterVeil').classList.remove('show');
  if(lvlIdx < LEVELS.length-1){
    loadLevel(lvlIdx+1);
  } else {
    toast(EPILOGUE, 5000);
    loadLevel(0);
  }
});

/* ---------- archive ---------- */
$('archBtn').addEventListener('click', ()=>{
  const list = $('archList');
  list.innerHTML = '';
  LEVELS.forEach((lvl,i)=>{
    const d = document.createElement('div');
    d.className = 'entry';
    if(i < unlocked){
      const shown = letterFor(i, deliveredChoice[i]);
      d.innerHTML = '<div class="t">'+(i+1)+'. '+shown.from+(stars[i]?' <span style="color:var(--amber)">✦</span>':'')+'</div>'
                  + '<div class="b">'+shown.body+'</div>';
    } else {
      d.innerHTML = '<div class="locked">Letter '+(i+1)+' — not yet delivered</div>';
    }
    list.appendChild(d);
  });
  $('archVeil').classList.add('show');
});
$('archClose').addEventListener('click', ()=> $('archVeil').classList.remove('show'));

/* ---------- toast ---------- */
let toastTimer = null;
function toast(msg, ms=2200){
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), ms);
}

/* ---------- HUD ---------- */
function updateOilHUD(){
  const sim = simulate(path);
  $('oilVal').textContent = sim.oil;
  $('oilFill').style.width = Math.max(0, sim.oil/level.oil*100) + '%';
  const headNode = nodeById(path[path.length-1]);
  $('departBtn').disabled = !(headNode && headNode.type==='dest' && sim.ok);
}

/* ---------- drawing ---------- */
function draw(){
  const W = cv.width, H = cv.height;
  // night sky
  if(artReady){
    ctx.drawImage(ART.bg, 0, 0, W, H);
  } else {
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#0c0d16'); g.addColorStop(1,'#141626');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  }
  ctx.fillStyle = 'rgba(232,234,242,.35)';
  for(let i=0;i<50;i++) ctx.fillRect((i*137)%W, (i*61)%H, 1.4, 1.4);

  // edges
  for(const e of level.edges){
    const a = nodeById(e.a), b = nodeById(e.b);
    const inPath = pathHasEdge(e.a, e.b);
    if(artReady && !e.blocked){
      const dx = b.x-a.x, dy = b.y-a.y;
      const len = Math.hypot(dx,dy), ang = Math.atan2(dy,dx);
      const thick = inPath ? 14 : 9;
      ctx.save();
      ctx.translate(a.x,a.y); ctx.rotate(ang);
      ctx.globalAlpha = inPath ? 1 : 0.45;
      ctx.drawImage(ART.road, 0, -thick/2, len, thick);
      ctx.restore();
      ctx.globalAlpha = 1;
    } else {
      ctx.beginPath();
      ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
      if(e.blocked){
        ctx.setLineDash([5,6]);
        ctx.strokeStyle = 'rgba(229,115,115,.5)';
        ctx.lineWidth = 2;
      } else {
        ctx.setLineDash([]);
        ctx.strokeStyle = inPath ? 'rgba(245,184,61,.9)' : 'rgba(94,100,130,.45)';
        ctx.lineWidth = inPath ? 3.5 : 2;
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // cost label
    const mx = (a.x+b.x)/2, my = (a.y+b.y)/2;
    if(e.blocked){
      ctx.fillStyle = 'rgba(229,115,115,.9)';
      ctx.font = '12px "IBM Plex Mono"'; ctx.textAlign='center';
      ctx.fillText('✕', mx, my-6);
    } else {
      ctx.fillStyle = '#12131c';
      ctx.beginPath(); ctx.arc(mx,my,10,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = inPath ? 'var' : '';
      ctx.fillStyle = inPath ? '#f5b83d' : '#9aa0b4';
      ctx.font = '11px "IBM Plex Mono"'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(e.cost, mx, my+0.5);
    }
  }

  // nodes
  for(const n of level.nodes){
    const inPath = path.includes(n.id);
    const isHead = path[path.length-1] === n.id;
    // glow for lantern positions
    if(inPath){
      const gl = ctx.createRadialGradient(n.x,n.y,2,n.x,n.y,isHead?42:26);
      gl.addColorStop(0,'rgba(245,184,61,'+(isHead?0.30:0.14)+')');
      gl.addColorStop(1,'rgba(245,184,61,0)');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(n.x,n.y,isHead?42:26,0,Math.PI*2); ctx.fill();
    }
    if(artReady){
      const sprite = n.skin==='signal' ? ART.signal
                   : n.type==='start' ? ART.start
                   : n.type==='dest'  ? ART.dest
                   : n.type==='way'   ? ART.way
                   : ART.node;
      const pulse = n.skin==='signal' ? 1 + 0.08*Math.sin(Date.now()/260) : 1;
      const size = (n.type==='node' ? 22 : 34) * pulse;
      ctx.save();
      if(n.dead) ctx.filter = 'grayscale(1) brightness(0.55)';
      ctx.globalAlpha = n.dead ? 0.6 : 1;
      ctx.drawImage(sprite, n.x-size/2, n.y-size/2, size, size);
      ctx.restore();
      if(n.type==='dest' && n.skin!=='signal'){
        const s2 = 18;
        ctx.drawImage(ART.letter, n.x-s2/2, n.y-s2/2, s2, s2);
      }
      if(n.type==='way' && !n.dead){
        ctx.fillStyle = '#eaf6ff';
        ctx.font = 'bold 10px "IBM Plex Mono"'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('+'+n.refill, n.x, n.y+size/2+9);
      } else if(n.type==='way' && n.dead){
        ctx.fillStyle = 'rgba(229,115,115,.85)';
        ctx.font = 'bold 11px "IBM Plex Mono"'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('✕ dead', n.x, n.y+size/2+9);
      }
    } else {
      ctx.beginPath(); ctx.arc(n.x,n.y,15,0,Math.PI*2);
      ctx.fillStyle = n.type==='way' ? '#173040' : '#1c1f2b';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = inPath ? '#f5b83d'
                      : n.type==='way' ? '#5ec8f2'
                      : n.type==='dest' ? '#c9a1f0'
                      : '#3a4056';
      ctx.stroke();

      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font = '13px "IBM Plex Mono"';
      if(n.type==='start'){ ctx.fillStyle='#f5b83d'; ctx.fillText('⌂', n.x, n.y+1); }
      else if(n.type==='dest'){ ctx.fillStyle='#c9a1f0'; ctx.fillText('✉', n.x, n.y+1); }
      else if(n.type==='way'){ ctx.fillStyle='#5ec8f2'; ctx.font='10px "IBM Plex Mono"'; ctx.fillText('+'+n.refill, n.x, n.y+1); }
      else { ctx.fillStyle='#5a6078'; ctx.beginPath(); ctx.arc(n.x,n.y,3,0,Math.PI*2); ctx.fill(); }
    }
  }

  // traveling lantern
  if(departing && departAnim && departAnim.seg < path.length-1){
    const a = nodeById(path[departAnim.seg]);
    const b = nodeById(path[departAnim.seg+1]);
    const t = departAnim.t;
    const x = a.x+(b.x-a.x)*t, y = a.y+(b.y-a.y)*t;
    const gl = ctx.createRadialGradient(x,y,2,x,y,50);
    gl.addColorStop(0,'rgba(245,184,61,.5)'); gl.addColorStop(1,'rgba(245,184,61,0)');
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(x,y,50,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#f5b83d';
    ctx.beginPath(); ctx.arc(x,y,6,0,Math.PI*2); ctx.fill();
  }
}

function pathHasEdge(a,b){
  for(let i=1;i<path.length;i++){
    if((path[i-1]===a&&path[i]===b)||(path[i-1]===b&&path[i]===a)) return true;
  }
  return false;
}

/* ---------- boot ---------- */
level = LEVELS[0];
path = ['S'];
loadSave();   // async; loads progress then calls loadLevel + draw
draw();
