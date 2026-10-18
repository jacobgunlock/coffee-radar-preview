// Drawn placeholder art for drinks without a verified photo.
//
// Inline SVG built from data the drink already has: the vessel from its name
// and is_iced/is_hot, one liquid colour from the flavor in its name, and up to
// three flavor icons from flavor_profile. No assets, no licensing. The art is
// always labelled as a drawing where it is shown; it must never pass for a photo.
//
// Loaded by public/index.html and public/prototypes/placeholders.html.
// Exposes window.DrinkArt = { svg, vessel, badge, explain, ICONS, INK }.
(function () {
'use strict';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function hashStr(s) { let h = 0; for (const ch of s || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
function flavorsOf(d) { try { return JSON.parse(d.flavor_profile || '[]'); } catch { return []; } }
function isMatcha(d) {
  return `${d.drink_name} ${d.description || ''} ${flavorsOf(d).join(' ')}`.toLowerCase().includes('matcha');
}
const DEFAULT_THEME = { bg: '#F5EFEB', ink: '#2A201A', accent: '#A16207' };

const INK = '#1C1917';
const MILK = '#F3EAD8';
const CREAM = '#FFFDF6';
const GLASS = '#F1F8F9';

function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// Liquid colour: first keyword that matches the drink's flavors + name.
const LIQUIDS = [
  [/hojicha/, '#9C5A3C', 'hojicha'],
  [/matcha|spirulina|spinach|superfood/, '#86B35A', 'matcha'],
  [/pumpkin/, '#E8893A', 'pumpkin'],
  [/strawberr/, '#F4A6B8', 'strawberry'],
  [/raspberr/, '#E0457B', 'raspberry'],
  [/blackberr|blueberr/, '#6F5BA7', 'berry'],
  [/lavender|earl grey/, '#B79CD9', 'lavender'],
  [/mango|pineapple|peach|colada/, '#F6B94A', 'yellow fruit'],
  [/watermelon|hibiscus|dragonfruit|bloody/, '#EF5B6E', 'red fruit'],
  [/lemon|lime/, '#F3DC5C', 'citrus'],
  [/corn/, '#F2D46B', 'corn'],
  [/chocolate|mocha|s'mores|cocoa/, '#6B4230', 'chocolate'],
  [/kombucha|ginger beer|cider|appelstroop/, '#D9A441', 'amber'],
  [/chai/, '#C79A6B', 'chai'],
  [/black tea|jasmine|tea\b/, '#C98F4A', 'tea'],
  [/caramel|butterscotch|brown sugar|miso|brown butter/, '#C98A4B', 'caramel'],
  [/cold brew|espresso|coffee|americano|brew|qishr|pour over/, '#4A2E20', 'coffee'],
];
const COFFEE = '#4A2E20';

// One colour per drink. The flavor in the drink's name beats the rest of
// flavor_profile ("Raspberry Espresso Tonic" is raspberry), then milk or
// coffee tints it rather than adding a second layer.
function liquidOf(d) {
  const name = d.drink_name.toLowerCase();
  const hay = `${flavorsOf(d).join(' ')} ${name}`.toLowerCase();
  const hit = LIQUIDS.find(([re]) => re.test(name)) || LIQUIDS.find(([re]) => re.test(hay));
  const key = hit ? hit[2] : 'latte';
  const base = hit ? hit[1] : '#C9A07A';
  const milky = /latte|milk|cream|white coffee|condensed|foam|einsp|fog|frapp|shake/.test(hay) && !/tonic|kombucha|refresher/.test(hay);
  const hasCoffee = /espresso|coffee|cold brew|americano|dirty/.test(hay);
  let color = base;
  if (key === 'coffee') color = milky ? '#C9A07A' : COFFEE;
  else if (key === 'latte') color = base;
  else if (key === 'chocolate') color = milky ? '#8B5A3C' : base;   // milk + cocoa mixes to grey otherwise
  else if (hasCoffee && !milky) {
    // Black coffee only takes a warm flavor's tint; pale ones (lemon, blueberry, corn) turn to mud.
    color = ['pumpkin', 'caramel', 'raspberry', 'strawberry', 'red fruit', 'amber', 'chai'].includes(key) ? mix(color, COFFEE, 0.3) : COFFEE;
  } else if (milky) color = mix(color, MILK, key === 'matcha' ? 0.2 : 0.35);
  return { base, color, milky, hasCoffee, key };
}

// Vessel: name first (a frappe is a frappe whatever the flags say), then flags.
function vesselOf(d, h) {
  const name = d.drink_name.toLowerCase();
  const hay = `${name} ${flavorsOf(d).join(' ')}`.toLowerCase();
  if (/frapp|smoothie|superfoodthie|blend|\bshake\b(?! up)/.test(name)) return ['blended', 'name says blended'];
  if (/tonic|soda|refresher|kombucha|espressoda|ginger beer|lemonade|lemon drop|bloody|guzzler|wuzzler/.test(hay)) return ['highball', 'tonic / soda / refresher'];
  const icedOnly = d.is_iced && !d.is_hot;
  const hotOnly = d.is_hot && !d.is_iced;
  if (isMatcha(d) && !/tonic/.test(hay)) return ['iced', 'matcha'];
  if (icedOnly) return ['iced', 'is_iced only'];
  if (/cold brew|iced|cold|shaken/.test(name)) return ['iced', 'name says cold'];
  if (hotOnly) return [h % 2 ? 'mug' : 'togo', 'is_hot only'];
  if (d.is_iced && d.is_hot) return [['mug', 'iced', 'togo'][h % 3], 'hot or iced, varied per drink'];
  return [h % 2 ? 'mug' : 'togo', 'no flags, default hot'];
}

// ------------------------------------------------------------ vessels
// Each is drawn around (0,0) = bottom centre and returns
// { sil: silhouette for the hard shadow, art: the drawing, extras: steam etc. }
function steam(xs, y) {
  return xs.map(x => `<path d="M${x},${y} q-6,-7 0,-14 q6,-7 0,-14" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".75"/>`).join('');
}
function latteArt(cy, color) {
  return `<path d="M0,${cy + 4} C-10,${cy - 2} -7,${cy - 8} 0,${cy - 4} C7,${cy - 8} 10,${cy - 2} 0,${cy + 4}Z" fill="${color}"/>`;
}

function drawMug(o) {
  const body = 'M-38,-78 L38,-78 L34,-10 Q33,0 22,0 L-22,0 Q-33,0 -34,-10 Z';
  const handle = 'M36,-64 C62,-64 62,-22 33,-22';
  const decor = [
    '',
    `<path d="M-36.9,-58 L36.9,-58 L36.1,-44 L-36.1,-44 Z" fill="${o.accent}" stroke="${INK}" stroke-width="2.5"/>`,
    [-20, 0, 20].map(x => `<circle cx="${x}" cy="-40" r="4.5" fill="${o.accent}" stroke="${INK}" stroke-width="2"/>`).join(''),
  ][o.h % 3];
  const surface = o.liq.color;
  return {
    sil: `<path d="${body}"/><path d="${handle}" fill="none" stroke="${INK}" stroke-width="12"/>`,
    art: `<path d="${handle}" fill="none" stroke="${INK}" stroke-width="12"/>
          <path d="${handle}" fill="none" stroke="${o.cup}" stroke-width="6"/>
          <path d="${body}" fill="${o.cup}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
          ${decor}
          <ellipse cx="0" cy="-78" rx="38" ry="8" fill="${surface}" stroke="${INK}" stroke-width="3"/>
          ${o.liq.milky ? latteArt(-78, CREAM) : ''}`,
    extras: steam([-14, 0, 14], -92),
    top: -120,
  };
}

function drawTogo(o) {
  const body = 'M-32,-86 L32,-86 L25,0 L-25,0 Z';
  const lid = 'M-37,-86 L37,-86 L35,-95 L-35,-95 Z';
  const dome = 'M-30,-95 L-26,-104 L26,-104 L30,-95 Z';
  return {
    sil: `<path d="${body}"/><path d="${lid}"/><path d="${dome}"/>`,
    art: `<path d="${body}" fill="${o.cup}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
          <path d="M-29.9,-62 L29.9,-62 L27.5,-28 L-27.5,-28 Z" fill="${o.accent}" stroke="${INK}" stroke-width="2.5"/>
          <circle cx="0" cy="-45" r="8" fill="${CREAM}" stroke="${INK}" stroke-width="2"/>
          <path d="${lid}" fill="${CREAM}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
          <path d="${dome}" fill="${CREAM}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
          <rect x="8" y="-103" width="10" height="3" rx="1.5" fill="${INK}"/>`,
    extras: steam([-8, 8], -110),
    top: -134,
  };
}

// Straight-sided glass: half width at height y, for filling liquid to a level.
function glassPath(topY, topHW, botHW) {
  return `M${-topHW},${topY} L${topHW},${topY} L${botHW},-6 Q${botHW - 0.5},0 ${botHW - 7},0 L${-botHW + 7},0 Q${-botHW + 0.5},0 ${-botHW},-6 Z`;
}
function iceCubes(spots) {
  return spots.map(([x, y, r]) => `<rect x="${x - 9}" y="${y - 9}" width="18" height="18" rx="3.5" transform="rotate(${r} ${x} ${y})" fill="#FFFFFF" fill-opacity=".6" stroke="${INK}" stroke-width="2"/>`).join('');
}

function drawIced(o) {
  const outline = glassPath(-104, 34, 28);
  const hw = y => 28 + ((-y) - 6) * (6 / 98);
  const L = -84;
  const straw = `<rect x="-4" y="-138" width="8" height="118" rx="2" transform="rotate(10)" fill="${o.accent}" stroke="${INK}" stroke-width="2.5"/>`;
  return {
    sil: `<path d="${outline}"/><rect x="-4" y="-138" width="8" height="118" transform="rotate(10)"/>`,
    art: `<path d="${outline}" fill="${GLASS}"/>
          ${straw}
          <path d="${glassPath(L, hw(L), 28)}" fill="${o.liq.color}"/>
          ${iceCubes([[-15, -86, -14], [8, -78, 16], [-4, -64, 6]])}
          <path d="M-26,-96 L-21,-18" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity=".7"/>
          <path d="${outline}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
    extras: '',
    top: -140,
  };
}

function drawHighball(o) {
  const outline = glassPath(-118, 26, 25);
  const hw = y => 25 + ((-y) - 6) * (1 / 112);
  const L = -100;
  const hay = o.d.drink_name.toLowerCase() + ' ' + flavorsOf(o.d).join(' ');
  const layers = `<path d="${glassPath(L, hw(L), 25)}" fill="${o.liq.color}"/>`;
  const bubbles = [[-12, -40, 2.5], [6, -52, 3], [-4, -28, 2], [12, -34, 2.5], [-14, -64, 2], [2, -86, 2.5]]
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFFFFF" stroke="${INK}" stroke-width="1.4"/>`).join('');
  // A citrus wheel only where the drink has citrus in it.
  const wheelColor = /lime/.test(hay) ? '#A7D46F' : /lemon|orange|yuzu|grapefruit/.test(hay) ? '#F3DC5C' : null;
  const wheel = !wheelColor ? '' : `<circle cx="24" cy="-118" r="14" fill="${wheelColor}" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="24" cy="-118" r="9" fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity=".8"/>
    ${[0, 60, 120].map(a => `<path d="M24,-127 L24,-109" stroke="#FFFFFF" stroke-width="1.5" transform="rotate(${a} 24 -118)" opacity=".8"/>`).join('')}`;
  return {
    sil: `<path d="${outline}"/>${wheelColor ? '<circle cx="24" cy="-118" r="14"/>' : ''}`,
    art: `<path d="${outline}" fill="${GLASS}"/>
          ${layers}${bubbles}
          ${iceCubes([[-10, -100, 12], [9, -92, -10]])}
          <path d="M-18,-110 L-16,-18" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity=".7"/>
          <path d="${outline}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
          ${wheel}`,
    extras: '',
    top: -134,
  };
}

function drawBlended(o) {
  const cup = 'M-30,-80 L30,-80 L24,-3 Q23.5,0 20,0 L-20,0 Q-23.5,0 -24,-3 Z';
  const cream = 'M-31,-86 C-35,-100 -19,-105 -15,-98 C-13,-115 13,-115 15,-98 C19,-105 35,-100 31,-86 Z';
  const dome = 'M-34,-86 C-34,-130 34,-130 34,-86 Z';
  const drizzle = mix(o.liq.base, INK, 0.3);
  const drizzled = ['caramel', 'chocolate'].includes(o.liq.key);
  const straw = `<rect x="-4" y="-156" width="8" height="80" rx="2" transform="rotate(8)" fill="${o.accent}" stroke="${INK}" stroke-width="2.5"/>`;
  return {
    sil: `<path d="${cup}"/><path d="${dome}"/><rect x="-4" y="-156" width="8" height="80" transform="rotate(8)"/>`,
    art: `<path d="${cup}" fill="${o.liq.color}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
          ${straw}
          <path d="${cream}" fill="${CREAM}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
          ${drizzled ? `<path d="M-20,-96 q5,-5 10,0 t10,0 t10,0 t10,0" fill="none" stroke="${drizzle}" stroke-width="3" stroke-linecap="round"/>` : ''}
          <path d="${dome}" fill="#FFFFFF" fill-opacity=".28" stroke="${INK}" stroke-width="3"/>
          <rect x="-36" y="-88" width="72" height="7" rx="2" fill="${CREAM}" stroke="${INK}" stroke-width="3"/>`,
    extras: '',
    top: -158,
  };
}

const VESSELS = { mug: drawMug, togo: drawTogo, iced: drawIced, highball: drawHighball, blended: drawBlended };
const VESSEL_SCALE = { mug: 0.95, togo: 0.98, iced: 0.9, highball: 0.9, blended: 0.8 };

// ------------------------------------------------------------ flavor icons
// Each glyph fits roughly inside ±10 around (0,0) and is drawn on a white badge.
const S = `stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"`;
// Helpers for the multi-part glyphs below.
const seeds = pts => pts.map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0,-3.8 C2.4,-2 2.4,2 0,3.4 C-2.4,2 -2.4,-2 0,-3.8 Z" fill="#2E2A27" ${S}/><path d="M-0.6,-1.8 L-0.6,0.8" stroke="#8A837D" stroke-width="0.9" stroke-linecap="round"/></g>`).join('');
const kernels = [];
for (const y of [-9, -6, -3, 0, 3]) for (const x of [-2.4, 0, 2.4]) if ((x * x) / 25 + ((y + 2) ** 2) / 90 < 0.72) kernels.push(`<circle cx="${x}" cy="${y}" r="1.15" fill="#FBE28A" stroke="#D9A826" stroke-width=".6"/>`);
const loop = (x, y, c) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${c}" stroke="${INK}" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="1.1" fill="#FFFFFF" stroke="${INK}" stroke-width=".8"/>`;
const wisp = d => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#D6D3D1" stroke-width="2" stroke-linecap="round"/>`;
const ICONS = {
  maple: `<path d="M0,-10 L2.2,-5 L6,-7.5 L5,-2 L10,-3 L7.5,1 L9.5,3 L3,4 L4,8 L1,6.2 L0,9 L-1,6.2 L-4,8 L-3,4 L-9.5,3 L-7.5,1 L-10,-3 L-5,-2 L-6,-7.5 L-2.2,-5 Z" fill="#E0533B" ${S}/><path d="M0,6 L0,11" stroke="${INK}" stroke-width="1.6"/>`,
  pumpkin: `<ellipse cx="-4" cy="2" rx="5.5" ry="7" fill="#E8893A" ${S}/><ellipse cx="4" cy="2" rx="5.5" ry="7" fill="#E8893A" ${S}/><ellipse cx="0" cy="2" rx="4" ry="7.5" fill="#F09A4C" ${S}/><path d="M0,-5 Q1,-9 3.5,-10" fill="none" stroke="#3F7A3A" stroke-width="2.4" stroke-linecap="round"/>`,
  cardamom: `<g transform="rotate(-35)"><ellipse cx="0" cy="0" rx="5" ry="10" fill="#A3C26B" ${S}/><path d="M0,-9 L0,9" stroke="${INK}" stroke-width="1.2"/><path d="M0,-10 L0,-12.5" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/></g>`,
  honey: `<path d="M-8,-4.6 L0,-9.2 L8,-4.6 L8,4.6 L0,9.2 L-8,4.6 Z" fill="#F5B82E" ${S}/><path d="M-4,-2.3 L0,-4.6 L4,-2.3 L4,2.3 L0,4.6 L-4,2.3 Z" fill="#FAD36B" ${S}/>`,
  apple: `<path d="M0,-4 C-3,-7 -10,-6 -9,1 C-8,7 -4,10 0,8.5 C4,10 8,7 9,1 C10,-6 3,-7 0,-4 Z" fill="#E4453A" ${S}/><path d="M0,-4 L1,-9" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/><path d="M1.5,-7.5 Q6,-11 7,-7 Q4,-5 1.5,-7.5Z" fill="#6BAA4F" ${S}/>`,
  cinnamon: `<g transform="rotate(-30)"><rect x="-3.5" y="-10" width="7" height="20" rx="3" fill="#A0522D" ${S}/><path d="M0,-10 L0,10" stroke="${INK}" stroke-width="1"/><ellipse cx="0" cy="-10" rx="3.5" ry="1.8" fill="#C77A4A" ${S}/></g>`,
  spice: `<path d="${Array.from({ length: 16 }, (_, i) => { const a = i * Math.PI / 8 - Math.PI / 2, r = i % 2 ? 3.5 : 10; return `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`; }).join(' ')} Z" fill="#8B4A2B" ${S}/><circle r="2" fill="#D9A06A"/>`,
  caramel: `<path d="M-6,-3 L-11,-6.5 L-10,0 L-11,6.5 L-6,3 Z" fill="#F2D16B" ${S}/><path d="M6,-3 L11,-6.5 L10,0 L11,6.5 L6,3 Z" fill="#F2D16B" ${S}/>
    <rect x="-6.5" y="-5.5" width="13" height="11" rx="3" fill="#C98A4B" ${S}/>
    <path d="M-4,-3 L0,-3" stroke="#F3D3A8" stroke-width="1.6" stroke-linecap="round"/>`,
  bean: `<ellipse rx="6.5" ry="9.5" transform="rotate(25)" fill="#5A3522" ${S}/><path d="M-2,-8 Q3,-2 -1,2 Q-4,6 1.5,8.5" transform="rotate(25)" fill="none" stroke="#C49A6C" stroke-width="1.6"/>`,
  corn: `<ellipse cx="0" cy="-2" rx="5" ry="9.5" fill="#F5CE3E" ${S}/>${kernels.join('')}
    <path d="M-1,11 C-9,8 -10.5,-1 -6.5,-7.5 C-6,0 -4,6 -1,11 Z" fill="#7DB35A" ${S}/>
    <path d="M1,11 C9,8 10.5,-1 6.5,-7.5 C6,0 4,6 1,11 Z" fill="#8CC266" ${S}/>`,
  sesame: seeds([[-5, -4.5, -25], [3, -6.5, 20], [6.5, 1, 70], [-3.5, 3, -60], [2, 7.5, 10]]),
  rosemary: `<path d="M-6,10 Q0,0 6,-10" fill="none" stroke="#4E6B3A" stroke-width="1.8" stroke-linecap="round"/>${[[-4, 5], [-1, 0], [2, -5], [4.5, -8.5]].map(([x, y]) => `<ellipse cx="${x - 3}" cy="${y - 1}" rx="3.5" ry="1.4" transform="rotate(-30 ${x - 3} ${y - 1})" fill="#6E9A55" stroke="${INK}" stroke-width="1"/><ellipse cx="${x + 3}" cy="${y + 1}" rx="3.5" ry="1.4" transform="rotate(-30 ${x + 3} ${y + 1})" fill="#6E9A55" stroke="${INK}" stroke-width="1"/>`).join('')}`,
  banana: `<path d="M-7.5,-7 L-7,-10.5 L-4,-10.5 L-3.5,-7 Z" fill="#8A6A2E" ${S}/>
    <path d="M-7.5,-7 C-10.5,2 -4,10 9.5,7.5 L9,4.3 C-0.5,5 -3.5,0 -3.5,-7 Z" fill="#F7D04A" ${S}/>
    <path d="M-5.6,-4.5 C-7,2 -2,6.5 7.5,6.2" fill="none" stroke="#D9A826" stroke-width="1.1"/>
    <circle cx="9.2" cy="6" r="1.3" fill="#5A4520"/>`,
  lemon: `<circle r="9.5" fill="#F3DC5C" ${S}/><circle r="6.5" fill="#FBEFA0" stroke="#E0C13A" stroke-width="1"/>${[0, 60, 120].map(a => `<path d="M0,-6.5 L0,6.5" stroke="#E0C13A" stroke-width="1" transform="rotate(${a})"/>`).join('')}`,
  lime: `<circle r="9.5" fill="#8CC152" ${S}/><circle r="6.5" fill="#C8E59B" stroke="#6FA23A" stroke-width="1"/>${[0, 60, 120].map(a => `<path d="M0,-6.5 L0,6.5" stroke="#6FA23A" stroke-width="1" transform="rotate(${a})"/>`).join('')}`,
  strawberry: `<path d="M0,10 C-7,6 -10,-1 -8,-5 C-6,-8 6,-8 8,-5 C10,-1 7,6 0,10 Z" fill="#E4455E" ${S}/><path d="M-6,-6 L-2,-9 L0,-6 L2,-9 L6,-6 L0,-4 Z" fill="#5FA54A" ${S}/>${[[-3, -1], [3, -1], [0, 3], [-4, 3.5], [4, 3.5], [0, -2.5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".8" fill="#FBE3A0"/>`).join('')}`,
  raspberry: `${[[-3.5, -3], [3.5, -3], [0, 0.5], [-3.5, 4], [3.5, 4], [0, 7.5], [0, -6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="#D6336C" stroke="${INK}" stroke-width="1.2"/>`).join('')}`,
  blueberry: `<circle cx="-4" cy="3" r="6" fill="#4F5FB0" ${S}/><circle cx="4.5" cy="-2.5" r="6" fill="#5B6BC0" ${S}/><path d="M4.5,-5.2 L5.3,-3.5 L7.1,-3.4 L5.7,-2.2 L6.1,-0.4 L4.5,-1.4 L2.9,-0.4 L3.3,-2.2 L1.9,-3.4 L3.7,-3.5 Z" fill="#2F3A7A" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/><path d="M-7,1 Q-6.5,-1 -4.5,-1.5" fill="none" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>`,
  blackberry: `${[[-3.5, -3], [3.5, -3], [0, 0.5], [-3.5, 4], [3.5, 4], [0, 7.5], [0, -6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="#3B2A55" stroke="${INK}" stroke-width="1.2"/>`).join('')}`,
  pistachio: `<ellipse rx="7" ry="9.5" transform="rotate(20)" fill="#E6CFA2" ${S}/><ellipse rx="4.5" ry="7" transform="rotate(20)" fill="#93C154" ${S}/>`,
  chocolate: `<rect x="-9" y="-7" width="18" height="14" rx="2" fill="#6B4230" ${S}/><path d="M-3,-7 L-3,7 M3,-7 L3,7 M-9,0 L9,0" stroke="#4A2C1F" stroke-width="1.3"/>`,
  whitechoc: `<rect x="-9" y="-7" width="18" height="14" rx="2" fill="#F7EBD3" ${S}/><path d="M-3,-7 L-3,7 M3,-7 L3,7 M-9,0 L9,0" stroke="#D9C39C" stroke-width="1.3"/>`,
  vanilla: `${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-5.5" rx="3.6" ry="5.5" transform="rotate(${a})" fill="#FFF4D6" ${S}/>`).join('')}<circle r="2.6" fill="#F2C84B" ${S}/>`,
  lavender: `<path d="M0,10 L0,-4" stroke="#5D7A45" stroke-width="1.8" stroke-linecap="round"/>${[[-2.5, -9], [2.5, -9], [-2.5, -4.5], [2.5, -4.5], [-2.5, 0], [2.5, 0], [0, -12]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.4" ry="2.9" fill="#9B7FD1" stroke="${INK}" stroke-width="1"/>`).join('')}`,
  peach: `<path d="M0,-6 C-8,-10 -11,0 -8,5 C-5,10 5,10 8,5 C11,0 8,-10 0,-6 Z" fill="#F7A072" ${S}/><path d="M0,-6 Q-2,1 0,8" fill="none" stroke="#D97A4E" stroke-width="1.3"/><path d="M1,-7 Q6,-12 8,-8 Q4,-5 1,-7Z" fill="#6BAA4F" ${S}/>`,
  marshmallow: `<rect x="-10" y="-7" width="10.5" height="11" rx="3" fill="#FFFFFF" ${S}/><ellipse cx="-4.75" cy="-7" rx="5.25" ry="2" fill="#FFF8EE" ${S}/>
    <rect x="-2.5" y="-2" width="12" height="11.5" rx="3" fill="#FFFFFF" ${S}/><ellipse cx="3.5" cy="-2" rx="6" ry="2.3" fill="#D9A06A" ${S}/>
    <path d="M-1.5,1 Q3.5,2.6 8.5,1" fill="none" stroke="#E8C49A" stroke-width="1.6"/>`,
  nut: `<path d="M-8,-1 C-8,6 -4,10.5 0,10.5 C4,10.5 8,6 8,-1 Z" fill="#C4884A" ${S}/>
    <path d="M-5,2 Q-4.2,6 -1,7.8" fill="none" stroke="#E6B27A" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M-10,-0.5 C-10,-7 -5,-9 0,-9 C5,-9 10,-7 10,-0.5 Z" fill="#7A4B25" ${S}/>
    <path d="M-7,-2 L-4.5,-7 M-3,-1.5 L-0.5,-8.5 M1.5,-1.5 L4,-8.2 M5.5,-1.5 L7.5,-6" stroke="#5A3519" stroke-width="1" stroke-linecap="round"/>
    <path d="M0,-9 Q0.5,-11.5 2,-12.5" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`,
  ginger: `<path d="M-10.5,2 C-10.5,-2 -7.5,-3 -5.5,-2 C-5.5,-6.5 -2,-8.5 0,-6.5 C1,-10.5 5.5,-10.5 6.5,-7 C9.5,-8 11.5,-4.5 9.5,-1.5 C11.5,1.5 9.5,4.5 6.5,3.5 C6.5,7.5 2,8.5 0,5.5 C-2,8.5 -7.5,7.5 -7.5,4.5 C-9.5,5.5 -10.5,4 -10.5,2 Z" fill="#E3BE7A" ${S}/>
    <path d="M-5.5,-2 Q-3.5,0.5 -4.5,2.5 M0,-6.5 Q2,-4 1,-1 M6.5,-7 Q5.2,-4.8 6.4,-2.6 M6.5,3.5 Q4.5,2 3,3.5" fill="none" stroke="#B88E46" stroke-width="1.1" stroke-linecap="round"/>
    <ellipse cx="-9.2" cy="2.2" rx="1.6" ry="2.2" fill="#F6DFA8" stroke="${INK}" stroke-width="1"/>`,
  coconut: `<g transform="translate(0 2)"><path d="M-10.5,-1 A10.5,9.5 0 0 0 10.5,-1 Z" fill="#7A4B2A" ${S}/>
    <path d="M-7,3 L-5,5 M-2,5.5 L0,7 M4,4 L6,6" stroke="#4E2F1A" stroke-width="1" stroke-linecap="round"/>
    <ellipse cx="0" cy="-1" rx="10.5" ry="4.2" fill="#FFFDF6" ${S}/><ellipse cx="0" cy="-1" rx="7.4" ry="2.6" fill="#EFE6D4"/></g>`,
  mango: `<path d="M-2,-9 C8,-10 11,2 5,8 C0,12 -9,8 -8,1 C-7,-4 -6,-8 -2,-9 Z" fill="#F6B13B" ${S}/>
    <path d="M-1,-8.6 C7.5,-9.4 10.2,1.5 5,7.4 C5.6,0.5 3.5,-5 -1,-8.6 Z" fill="#F0683E"/>
    <path d="M-2,-9 C8,-10 11,2 5,8 C0,12 -9,8 -8,1 C-7,-4 -6,-8 -2,-9 Z" fill="none" ${S}/>
    <path d="M-5,-2 Q-5.5,2 -3.5,4.5" fill="none" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" opacity=".7"/>
    <path d="M-2,-9 Q3,-14.5 8.5,-11.5 Q3.5,-8 -2,-9 Z" fill="#5FA54A" ${S}/>`,
  pineapple: `<path d="M-3,-5 L-5,-11 L-1,-7 L0,-12 L1,-7 L5,-11 L3,-5 Z" fill="#5FA54A" ${S}/><ellipse cx="0" cy="3" rx="6.5" ry="8" fill="#F5C842" ${S}/><path d="M-5,0 L3,8 M-3,-4 L6,5 M5,0 L-3,8 M3,-4 L-6,5" stroke="#C99A22" stroke-width="1"/>`,
  watermelon: `<path d="M-10,-3 A10,10 0 0 0 10,-3 Z" fill="#6BAA4F" ${S}/><path d="M-8.5,-3 A8.5,8.5 0 0 0 8.5,-3 Z" fill="#EF5B6E"/>${[[-4, 0], [0, 2.5], [4, 0]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx=".9" ry="1.4" fill="${INK}"/>`).join('')}`,
  hibiscus: `${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-5.5" rx="4.2" ry="5.8" transform="rotate(${a})" fill="#E23D5C" ${S}/>`).join('')}<circle r="2.2" fill="#FBD34D" ${S}/>`,
  dragonfruit: `<path d="M0,-11 Q-3,-14 -4,-10.5 M0,-11 Q3,-14 4,-10.5" fill="#8CC152" ${S}/>
    <path d="M-9.2,-5 Q-13,-6 -11,-2.5 Z M9.2,-5 Q13,-6 11,-2.5 Z M-8,6 Q-11,9 -7,9.2 Z M8,6 Q11,9 7,9.2 Z" fill="#8CC152" ${S}/>
    <ellipse rx="9.5" ry="10.5" fill="#E8508C" ${S}/><ellipse rx="7" ry="8" fill="#FFFFFF" stroke="#C43D74" stroke-width=".9"/>
    ${[[-3, -4], [2, -5], [4, -1], [-4, 1], [0, 0], [3, 4], [-2, 5], [0, -2.5], [-1, 3]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx=".8" ry=".6" fill="${INK}"/>`).join('')}`,
  tealeaf: `<path d="M-8,8 C-9,-2 -2,-9 8,-9 C9,1 2,8 -8,8 Z" fill="#6E9A55" ${S}/><path d="M-8,8 L3,-3" stroke="#3F6230" stroke-width="1.3"/>`,
  hojicha: `<path d="M-8,8 C-9,-2 -2,-9 8,-9 C9,1 2,8 -8,8 Z" fill="#9C5A3C" ${S}/><path d="M-8,8 L3,-3" stroke="#5E3321" stroke-width="1.3"/>`,
  carrot: `<path d="M-1,-6 L-4.5,-12 M0.5,-6 L0.5,-12.5 M2,-6 L5.5,-11.5" stroke="#5FA54A" stroke-width="2.4" stroke-linecap="round"/><path d="M-5,-6 Q0,-8 5,-6 Q4,2 0.5,11 Q-0.5,11.5 -1,10.5 Q-4,2 -5,-6 Z" fill="#F08A2C" ${S}/><path d="M-3.5,-1.5 L-1,-1.5 M1,2.5 L3,2.5 M-2.5,5.5 L-0.5,5.5" stroke="#C4661A" stroke-width="1.1" stroke-linecap="round"/>`,
  sugar: `<rect x="-9" y="-2" width="9" height="9" rx="1.5" fill="#E7C08C" ${S}/><rect x="0" y="-2" width="9" height="9" rx="1.5" fill="#D9A866" ${S}/><rect x="-4.5" y="-10" width="9" height="9" rx="1.5" fill="#F0D1A4" ${S}/>`,
  donut: `<circle r="9.5" fill="#E2B071" ${S}/><path d="M-8.5,-2 Q-9,-8 0,-9 Q9,-8 8.5,-2 Q7,2 3,0 Q0,3 -3,0 Q-7,2 -8.5,-2 Z" fill="#F29CB7"/><circle r="3.2" fill="#FFFFFF" ${S}/>`,
  cereal: `${loop(-5.5, -2.5, '#F25C54')}${loop(0.5, -4.5, '#FBD34D')}${loop(6, -2, '#8CC152')}${loop(-2.5, -7.8, '#B57BE0')}${loop(3.8, -8.6, '#F59E42')}
    <path d="M-10.5,-0.5 L10.5,-0.5 Q9.5,9.5 0,9.5 Q-9.5,9.5 -10.5,-0.5 Z" fill="#4FB0E8" ${S}/>
    <path d="M-7,3 Q0,5 7,3" fill="none" stroke="#FFFFFF" stroke-width="1.2" opacity=".7"/>`,
  miso: `<path d="M-8,1 Q-7.5,-5 -2.5,-5 Q0,-8.5 3.5,-5 Q8,-4.5 8,1 Z" fill="#D9A45B" ${S}/>
    <g transform="rotate(38 3 -3)"><rect x="1.8" y="-14" width="2.6" height="10" rx="1.2" fill="#C98F4A" ${S}/><ellipse cx="3.1" cy="-3.5" rx="2.4" ry="3" fill="#C98F4A" ${S}/></g>
    <path d="M-10.5,0.5 L10.5,0.5 Q9.5,9 0,9 Q-9.5,9 -10.5,0.5 Z" fill="#3F6E8C" ${S}/>
    <path d="M-6,4 Q0,5.5 6,4" fill="none" stroke="#FFFFFF" stroke-width="1.1" opacity=".6"/>`,
  smoke: `${wisp('M-5.5,10 C-9.5,5 -2,2 -5.5,-3 C-7.5,-7 -4,-9 -5.5,-11')}${wisp('M1,10 C-3,4 5,1 1,-5 C-1,-8 2,-10 1,-12')}${wisp('M6.5,10 C3.5,6 9.5,3 6.5,-1.5')}`,
  cream: `<path d="M-10.5,7 Q-11.5,2 -6.5,2 L6.5,2 Q11.5,2 10.5,7 Q0,9.5 -10.5,7 Z" fill="${CREAM}" ${S}/>
    <path d="M-7.5,2.5 Q-8.5,-2.5 -3.5,-2.5 L3.5,-2.5 Q8.5,-2.5 7.5,2.5 Z" fill="${CREAM}" ${S}/>
    <path d="M-4.5,-2 Q-5,-6.5 -0.5,-7 Q1.5,-10 4,-11.5 Q3.5,-7.5 4.5,-5.5 Q5.5,-3 4.5,-2 Z" fill="${CREAM}" ${S}/>`,
  almond: `<path d="M0,-10 C6,-6 7,4 0,10 C-7,4 -6,-6 0,-10 Z" fill="#D4A373" ${S}/><path d="M0,-6 Q2,0 0,6" fill="none" stroke="#A8743F" stroke-width="1.2"/>`,
  bubbles: `<circle cx="-4" cy="3" r="5" fill="#E6F4F1" ${S}/><circle cx="5" cy="-3" r="3.5" fill="#E6F4F1" ${S}/><circle cx="3" cy="7" r="2.2" fill="#E6F4F1" ${S}/>`,
};

// Keyword -> icon, most distinctive first. Words that the vessel/liquid already
// show (matcha, milk, coffee) are left for last or skipped.
const ICON_RULES = [
  [/maple/, 'maple'], [/pumpkin/, 'pumpkin'], [/cardamom|carda-?mom/, 'cardamom'], [/honey(?!crisp)|nectar/, 'honey'],
  [/(?<!pine)apple|appelstroop|cider/, 'apple'], [/cinnamon/, 'cinnamon'], [/caramel|butterscotch/, 'caramel'],
  [/corn/, 'corn'], [/sesame|caraway/, 'sesame'], [/rosemary|thyme/, 'rosemary'], [/banana/, 'banana'],
  [/lemon/, 'lemon'], [/lime/, 'lime'], [/strawberr/, 'strawberry'], [/raspberr/, 'raspberry'], [/blueberr/, 'blueberry'],
  [/blackberr/, 'blackberry'], [/pistachio/, 'pistachio'], [/white chocolate/, 'whitechoc'], [/chocolate|mocha|cocoa/, 'chocolate'],
  [/s'mores|marshmallow/, 'marshmallow'], [/vanilla/, 'vanilla'], [/lavender/, 'lavender'], [/peach/, 'peach'],
  [/pecan|hazelnut|peanut|nut roll/, 'nut'], [/almond|amaretto/, 'almond'], [/ginger/, 'ginger'], [/coconut|colada/, 'coconut'],
  [/mango/, 'mango'], [/pineapple/, 'pineapple'], [/watermelon/, 'watermelon'], [/hibiscus/, 'hibiscus'],
  [/dragonfruit/, 'dragonfruit'], [/carrot/, 'carrot'], [/brown sugar|molasses/, 'sugar'], [/donut/, 'donut'],
  [/pebbles|lucky charms|cereal/, 'cereal'], [/miso/, 'miso'], [/smok/, 'smoke'],
  [/chai|spice|clove|garam|nutmeg|qishr/, 'spice'], [/hojicha/, 'hojicha'], [/black tea|jasmine|earl grey|tea\b/, 'tealeaf'],
  [/tonic|soda|kombucha|ginger beer/, 'bubbles'],
  [/espresso|coffee|cold brew|americano|pour over/, 'bean'], [/whipped cream|cold foam|condensed/, 'cream'],
];
function iconsOf(d) {
  const hay = `${flavorsOf(d).join(' | ')} | ${d.drink_name}`.toLowerCase();
  const out = [];
  for (const [re, id] of ICON_RULES) {
    if (out.length >= 3) break;
    if (re.test(hay) && !out.includes(id)) out.push(id);
  }
  // A lone coffee bean says little; only keep it when it is not the sole icon on a coffee drink.
  return out;
}

// Flavor icons stack down the left edge, centred on the tile's upper
// two-thirds so they clear the matcha badge in the bottom-left corner.
const ICON_OFFSET = 84, ICON_MID = 72, ICON_STEP = 36;   // column sits 84 left of the vessel

let uid = 0;   // never reset: several grids can be on the page at once and pattern ids must stay unique
function backdropOf(h, t, cx, cy, W, H, ground) {
  const id = `pat${++uid}`;
  const pattern = [
    `<pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.6" fill="${t.ink}" opacity=".14"/></pattern>`,
    `<pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="14" fill="${t.ink}" opacity=".07"/></pattern>`,
    `<pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16,0 L0,0 L0,16" fill="none" stroke="${t.ink}" stroke-width="1" opacity=".12"/></pattern>`,
    `<pattern id="${id}" width="20" height="10" patternUnits="userSpaceOnUse"><path d="M0,5 q5,-5 10,0 t10,0" fill="none" stroke="${t.ink}" stroke-width="1.2" opacity=".12"/></pattern>`,
  ][h % 4];
  const shape = [
    `<circle cx="${cx}" cy="${cy}" r="${H * 0.36}" fill="#FFFFFF" opacity=".55" stroke="${t.ink}" stroke-width="2" stroke-opacity=".25"/>`,
    `<path d="M${cx - 52},${ground} L${cx - 52},${cy - 20} A52,52 0 0 1 ${cx + 52},${cy - 20} L${cx + 52},${ground} Z" fill="#FFFFFF" opacity=".55" stroke="${t.ink}" stroke-width="2" stroke-opacity=".25"/>`,
    Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2, b = a + Math.PI / 24; const R = W; return `<path d="M${cx},${cy} L${cx + Math.cos(a) * R},${cy + Math.sin(a) * R} L${cx + Math.cos(b) * R},${cy + Math.sin(b) * R} Z" fill="${t.accent}" opacity=".10"/>`; }).join(''),
    `<rect x="${cx - 60}" y="${cy - 44}" width="120" height="${ground - cy + 44}" rx="18" fill="#FFFFFF" opacity=".5" stroke="${t.ink}" stroke-width="2" stroke-opacity=".25"/>`,
  ][(h >>> 3) % 4];
  return `<defs>${pattern}</defs><rect width="${W}" height="${H}" fill="${t.bg}"/><rect width="${W}" height="${H}" fill="url(#${id})"/>${shape}
    <rect x="0" y="${ground}" width="${W}" height="${H - ground}" fill="${t.ink}" opacity=".07"/>
    <path d="M0,${ground} L${W},${ground}" stroke="${t.ink}" stroke-width="2" opacity=".35"/>`;
}

const CUPS = ['#FFFDF6', '#FFFFFF', '#F5EFEB', '#FFF3C4', '#D9B98C'];

// Builds the scene. Tiles up to 5:4 are 200 wide; wider ones (the detail
// sheet's 16:9) are 160 tall and simply get more room either side.
// `theme` is the cafe's {bg, ink, accent}; `compact` shrinks the art into
// the bottom-right so a drink name can sit on the tile.
function placeholderSVG(d, { ratio = 5 / 4, compact = false, theme = DEFAULT_THEME } = {}) {
  const wide = ratio > 5 / 4;
  const W = wide ? Math.round(160 * ratio) : 200;
  const H = wide ? 160 : Math.round(200 / ratio);
  const h = hashStr(`${d.id}:${d.drink_name}`);
  const t = theme;
  const [vessel] = vesselOf(d, h);
  const liq = liquidOf(d);
  const o = { d, h, liq, accent: t.accent, cup: CUPS[h % CUPS.length] };
  const v = VESSELS[vessel](o);

  const ground = H - 18;
  const s = VESSEL_SCALE[vessel] * (H / 160) ** 0.6;
  const cx = W / 2 + 14, cy = ground + (v.top * s) / 2;   // nudged right to balance the icon column
  const icons = iconsOf(d);
  const yScale = H / 160;
  const iconSVG = icons.map((id, i) => {
    const y = (ICON_MID + (i - (icons.length - 1) / 2) * ICON_STEP) * yScale;
    return badgeSVG(id, cx - ICON_OFFSET, y, ((h >>> (i * 3)) % 17) - 8);
  }).join('');

  const scene = `
    <g transform="translate(${cx} ${ground}) scale(${s})">
      <g transform="translate(5 5)" fill="${INK}" stroke="none">${v.sil}</g>
      ${v.art}${v.extras}
    </g>${iconSVG}`;
  const art = compact ? `<g transform="translate(${W * 0.4} ${H * 0.4}) scale(0.6)">${scene}</g>` : scene;
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration of ${esc(d.drink_name)}, not a photo">
    ${backdropOf(h, t, cx, cy, W, H, ground)}${art}</svg>`;
}

function explain(d) {
  const h = hashStr(`${d.id}:${d.drink_name}`);
  const [v, why] = vesselOf(d, h);
  const liq = liquidOf(d);
  return `${v} (${why}) · liquid: ${liq.key}${liq.milky ? ', milky' : ''} · icons: ${iconsOf(d).join(', ') || 'none'} · flags iced=${d.is_iced} hot=${d.is_hot}`;
}

// A flavor icon on its white badge with a hard shadow, centred on (x, y).
function badgeSVG(id, x, y, rot = 0, r = 14) {
  return `<g transform="translate(${x} ${y}) rotate(${rot})">
      <circle cx="2.5" cy="2.5" r="${r}" fill="${INK}"/>
      <circle r="${r}" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5"/>
      <g transform="scale(${(0.92 * r / 14).toFixed(3)})">${ICONS[id]}</g></g>`;
}

// One drawn drink standing on (x, ground), for compositions such as the home
// hero. `vessel` overrides the choice made from the drink's name and flags.
function vesselSVG(d, { x, ground, scale = 1, accent = '#FF6B57', vessel } = {}) {
  const h = hashStr(`${d.id}:${d.drink_name}`);
  const type = vessel || vesselOf(d, h)[0];
  const v = VESSELS[type]({ d, h, liq: liquidOf(d), accent, cup: CUPS[h % CUPS.length] });
  return `<g transform="translate(${x} ${ground}) scale(${VESSEL_SCALE[type] * scale})">
      <g transform="translate(5 5)" fill="${INK}" stroke="none">${v.sil}</g>${v.art}${v.extras}</g>`;
}

window.DrinkArt = { svg: placeholderSVG, vessel: vesselSVG, badge: badgeSVG, explain, ICONS, INK };
})();
