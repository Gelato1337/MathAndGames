import { birch, broadleaf, pine } from './trees';

/**
 * Pixel art, defined as strings. Each character maps to a palette colour,
 * '.' is transparent. Sprites are rendered once to offscreen canvases.
 */
export const PALETTE: Record<string, string> = {
  k: '#1a1c2c', // outline
  f: '#333c57', // dark slate
  m: '#566c86', // gray
  s: '#94b0c2', // light gray
  w: '#f4f4f4', // white
  p: '#5d275d', // purple
  r: '#b13e53', // red
  o: '#ef7d57', // orange
  y: '#ffcd75', // yellow
  l: '#a7f070', // light green
  g: '#38b764', // green
  G: '#2a8a52', // dark green
  t: '#257179', // teal
  n: '#29366f', // navy
  b: '#3b5dc9', // blue
  c: '#41a6f6', // cyan
  i: '#73eff7', // ice
  h: '#f2c49b', // skin
  u: '#8a5a34', // brown
  U: '#5a3820', // dark brown
  e: '#c79a62', // tan
};

export const SPRITES: Record<string, string[]> = {
  kai: [
    '................',
    '.....kkkkkk.....',
    '....kffffffk....',
    '...kffffffffk...',
    '...krrrrrrrrkrr.',
    '...kfhhhhhhfk.r.',
    '...kfkhhhhkfk...',
    '...kffffffffk...',
    '....kffffffk....',
    '...krrrrrrrrk...',
    '..kfffrffffffk..',
    '..kfkffffffkfk..',
    '..khkfnnnnfkhk..',
    '...kffffffffk...',
    '...kffk..kffk...',
    '...kkkk..kkkk...',
  ],
  aino: [
    '.......kk.......',
    '......kbbk......',
    '.....kbbbbk.....',
    '....kbbbbbbk....',
    '..kkyyyyyyyykk..',
    '..kbbbbbbbbbbk..',
    '...kohhhhhhok...',
    '...kohkhhkhok...',
    '...koohhhhook...',
    '....kbbbbbbk.ki.',
    '...kbbcbbcbbkku.',
    '..khkbbbbbbkhku.',
    '...kbbbyybbbk.u.',
    '...kbbbbbbbbk.u.',
    '..kbbbbbbbbbbku.',
    '..kkkkkkkkkkkk..',
  ],
  elder: [
    '................',
    '.....kkkkkk.....',
    '....kssssssk....',
    '...ksshhhhssk...',
    '...kshkhhkhsk...',
    '...kshhhhhhsk...',
    '...kwwwhhwwwk...',
    '....kwwwwwwk....',
    '...kmkwwwwkmk...',
    '..kmmmkwwkmmmk..',
    '..kmmmmmmmmmmku.',
    '..khmmmmmmmmhku.',
    '..kmmmmmmmmmmku.',
    '...kmmmmmmmmk.u.',
    '...kmmmmmmmmk.u.',
    '...kkkkkkkkkk.u.',
  ],
  ren: [
    '................',
    '......kkkk......',
    '.....khhhhk.....',
    '....khhhhhhk....',
    '....khkhhkhk....',
    '....khhhhhhk....',
    '....khhUUhhk....',
    '.....khhhhk.....',
    '...kkwwwwwwkk...',
    '..kwwwwkkwwwwk..',
    '..kwwwwwkwwwwk..',
    '..khkkkkkkkkhk..',
    '...kwwwwwwwwk...',
    '...kwwwkkwwwk...',
    '...kwwk..kwwk...',
    '...kkkk..kkkk...',
  ],
  lumi: [
    '................',
    '.....kkkkkk.....',
    '....kUUUUUUk....',
    '...kUUhhhhUUk...',
    '...kUkkhhkkUk...',
    '...kUhhhhhhUk...',
    '...kUUhhhhUUk...',
    '...kUUkttkUUk...',
    '....kttttttk....',
    '...kttyttyttk...',
    '..kttttttttttk..',
    '..khkttttttkhk..',
    '...kttttttttk...',
    '...kttttttttk...',
    '..kttttttttttk..',
    '..kkkkkkkkkkkk..',
  ],
  pekka: [
    '................',
    '.....kkkkkk.....',
    '....kuuuuuuk....',
    '...kuhhhhhhuk...',
    '...khhkhhkhhk...',
    '...khhhhhhhhk...',
    '...khhUUUUhhk...',
    '....khhhhhhk....',
    '...krrwwwwrrk...',
    '..krrrwwwwrrrk..',
    '..krrwwwwwwrrk..',
    '..khkwwwwwwkhk..',
    '...kwwwwwwwwk...',
    '...kwwwwwwwwk...',
    '...kuuk..kuuk...',
    '...kkkk..kkkk...',
  ],
  helmi: [
    '................',
    '......kkkk......',
    '.....kyyyyk.....',
    '..kkkyyyyyykkk..',
    '..kyyyyyyyyyyk..',
    '...kohhhhhhok...',
    '...kohkhhkhok...',
    '..kookhhhhkook..',
    '...kokhhhhkok...',
    '...kgwwwwwwgk...',
    '..kggwggggwggk..',
    '..khkggggggkhk..',
    '...kggggggggk...',
    '...kggggggggk...',
    '...kggk..kggk...',
    '...kUUk..kUUk...',
  ],
  slime: [
    '................',
    '................',
    '................',
    '................',
    '......kkkk......',
    '....kkllllkk....',
    '...klllwllllk...',
    '..kllwwllllllk..',
    '..kllllllllllk..',
    '.kglkklllkklglk.',
    '.kglkklllkklglk.',
    '.kggllllllllggk.',
    '.kggglllllllggk.',
    '.kggggggggggggk.',
    '..kkkkkkkkkkkk..',
    '................',
  ],
  golem: [
    '................................',
    '..........kkkkkkkkkkkk..........',
    '.........kmmmmmmmmmmmmk.........',
    '........kmssmmmmmmmmmmmk........',
    '........kmsmmmmmmmmmmmmk........',
    '........kmkiikmmmmkiikmk........',
    '........kmkiikmmmmkiikmk........',
    '........kmmkkmmmmmmkkmmk........',
    '........kmmmmmffffmmmmmk........',
    '........kfmmmmmmmmmmmmfk........',
    '...kkkkkkkkkkkkkkkkkkkkkkkkkk...',
    '..kmmmmkmmmmmmmmmmmmmmmmkmmmmk..',
    '..kmsmmkmmmmmmmiimmmmmmmkmmsmk..',
    '..kmmmmkmmmmmmiiiimmmmmmkmmmmk..',
    '..kmmmmkmmmmmmmiimmmmmmmkmmmmk..',
    '..kmmmmkmmmmmmmmmmmmmmmmkmmmmk..',
    '..kfmmmkmmmmmmmmmmmmmmmmkmmmfk..',
    '..kmmmmkffmmmmmmmmmmmmffkmmmmk..',
    '..kmmmmk.kmmmmmmmmmmmmk.kmmmmk..',
    '..kmmmmk.kmmmmmmmmmmmmk.kmmmmk..',
    '..kmmmmk.kmmmmmmmmmmmmk.kmmmmk..',
    '.kmmmmmmkkffffffffffffkkmmmmmmk.',
    '.kmmmmmmk.kmmmmmmmmmmk.kmmmmmmk.',
    '.kkkkkkkk.kmmmmmmmmmmk.kkkkkkkk.',
    '..........kmmmmmmmmmmk..........',
    '.........kmmmmkkkkmmmmk.........',
    '.........kmmmmk..kmmmmk.........',
    '.........kmmmmk..kmmmmk.........',
    '........kmmmmmk..kmmmmmk........',
    '........kfffffk..kfffffk........',
    '........kkkkkkk..kkkkkkk........',
    '................................',
  ],
  bag: [
    '................',
    '......kkkk......',
    '.....kuyyuk.....',
    '......kuuk......',
    '.....kkuukk.....',
    '....keeeeeek....',
    '...keeeeeeeek...',
    '..keeeekkeeeek..',
    '..keeekeekeeek..',
    '..keeeeekeeeek..',
    '..keeeekeeeeek..',
    '..keeeeeeeeeek..',
    '..keeeekeeeeek..',
    '...keeeeeeeek...',
    '....kkkkkkkk....',
    '................',
  ],
  weight: [
    '................',
    '................',
    '................',
    '......kkkk......',
    '.....kk..kk.....',
    '.....k....k.....',
    '....kkkkkkkk....',
    '...kssssssssk...',
    '..ksmmmmmmmmsk..',
    '..kmmmmmmmmmmk..',
    '..kmmmmmmmmmmk..',
    '..kmmmmmmmmmmk..',
    '..kfmmmmmmmmfk..',
    '...kkkkkkkkkk...',
    '................',
    '................',
  ],
  rune: [
    '................',
    '....kkkkkkkk....',
    '...kmmmmmmmmk...',
    '..kmssmmmmmmmk..',
    '..kmsmmmmmmmmk..',
    '..kmmmmmmmmmmk..',
    '..kmmmmmmmmmmk..',
    '..kmmmmmmmmmmk..',
    '..kmmmmmmmmmmk..',
    '..kmmmmmmmmmmk..',
    '..kmmmmmmmmmmk..',
    '..kmmmmmmmmmmk..',
    '..kfmmmmmmmmfk..',
    '..kffffffffffk..',
    '...kkkkkkkkkk...',
    '................',
  ],
  tree: [
    '.....kkkkkk.....',
    '...kkGggggGkk...',
    '..kGgglggggGGk..',
    '.kGgglllgggggGk.',
    '.kggglgggggGggk.',
    'kGgggggggGgggGGk',
    'kggGgggggggglggk',
    'kgggggGggglllggk',
    'kGgglggggggggGGk',
    '.kGgllgggGgggGk.',
    '.kGGgggggggGGGk.',
    '..kkGGGGGGGGkk..',
    '....kkkUUkkk....',
    '......kuUk......',
    '.....kuuUUk.....',
    '......kkkk......',
  ],
  rock: [
    '................',
    '................',
    '................',
    '.....kkkkkk.....',
    '....kssmmmmk....',
    '...ksmmmmmmmk...',
    '..ksmmmmmmmmmk..',
    '..kmmmmmmmfmmk..',
    '.ksmmmmmmmmmmmk.',
    '.kmmmmmfmmmmmmk.',
    '.kmmmmmmmmmmffk.',
    '.kfmmmmmmmmfffk.',
    '..kffffffffffk..',
    '...kkkkkkkkkk...',
    '................',
    '................',
  ],
  crop: [
    '................',
    '................',
    '.......l........',
    '......lgl.......',
    '.....lgGgl......',
    '...l..gGg..l....',
    '..lgl.lGl.lgl...',
    '..gGg..G..gGg...',
    '...G...G...G....',
    '...G...G...G....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
};

// Taller tree for the isometric view: same canopy, longer trunk.
SPRITES.treeTall = [
  ...SPRITES.tree.slice(0, 12),
  '.....kkkUUkkk...',
  '......kuUUk.....',
  '......kuUUk.....',
  '......kuUUk.....',
  '......kuUUk.....',
  '.....kuuUUUk....',
  '....kuu.kUUk....',
  '.....kk..kk.....',
];

SPRITES.owl = [
  '................',
  '...k........k...',
  '...kk......kk...',
  '...kukkkkkkuk...',
  '..kuuuuuuuuuuk..',
  '..kuwwwuuwwwuk..',
  '..kuwkwuuwkwuk..',
  '..kuwwwyywwwuk..',
  '..kuuuuyyuuuuk..',
  '..kueeuuuueeuk..',
  '..kueeeeeeeeuk..',
  '..kuueeeeeeuuk..',
  '...kuueeeeuuk...',
  '....kkkkkkkk....',
  '.....yy..yy.....',
  '................',
];

SPRITES.brazier = [
  '................',
  '................',
  '................',
  '................',
  '..kkkkkkkkkkkk..',
  '..kUuuuuuuuuUk..',
  '...kmmmmmmmmk...',
  '...ksmmmmmmmk...',
  '....kmmmmmmk....',
  '.....kmmmmk.....',
  '......kmmk......',
  '......kmmk......',
  '.....kmmmmk.....',
  '....kssmmmmk....',
  '....kkkkkkkk....',
  '................',
];

SPRITES.lantern = [
  '................',
  '......kkkk......',
  '.....kffffk.....',
  '.....kyyyyk.....',
  '.....kyyyyk.....',
  '.....kffffk.....',
  '.......kk.......',
  '.......uk.......',
  '.......uk.......',
  '.......uk.......',
  '.......uk.......',
  '.......uk.......',
  '.......uk.......',
  '.......uk.......',
  '......kuUk......',
  '.....kkkkkk.....',
];

SPRITES.fence = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '..kk........kk..',
  '.kuUkkkkkkkkuUk.',
  '.keeeeeeeeeeeek.',
  '.kuUkkkkkkkkuUk.',
  '..uU........uU..',
  '.kuUkkkkkkkkuUk.',
  '.keeeeeeeeeeeek.',
  '.kuUkkkkkkkkuUk.',
  '..uU........uU..',
  '..kk........kk..',
  '................',
];

// ---------- Eigenvale cast ----------
SPRITES.sana = [
  '................',
  '......kkkk......',
  '.....kGGGGk.....',
  '....kGggggGk....',
  '...kGgguuggGk...',
  '...kGuhhhhuGk...',
  '...kGhkhhkhGk...',
  '....kuhhhhuk....',
  '....kGggggGk.k..',
  '...kGgGeeGgGkuk.',
  '..khkgGeeGgkhku.',
  '...kggGGGGggk.uk',
  '...kUUUyyUUUk.k.',
  '...kggggggggk...',
  '...kUUk..kUUk...',
  '...kkkk..kkkk...',
];

SPRITES.otso = [
  '................',
  '.....kkkkkk.....',
  '....kssssssk....',
  '...ksmmmmmmsk...',
  '...kmkkkkkkmk...',
  '...kmhkhhkhmk...',
  '...kmmhhhhmmk...',
  '....kmmmmmmk....',
  '..kkssbbbbsskk..',
  '.kbbkbbyybbk.k..',
  '.kbybkbbbbbbkhk.',
  '.kbbbkbbbbbbk.k.',
  '..kbk.kmmmmk....',
  '...k..kmmmmk....',
  '......kmkkmk....',
  '.....kkk..kkk...',
];

SPRITES.ilona = [
  '................',
  '.....kkkkkk.....',
  '....kyyyyyyk....',
  '...kyyhhhhyyk...',
  '...kyhkhhkhyk...',
  '...kyhhhhhhyk...',
  '...kyyhhhhyyk...',
  '....kppppppk....',
  '...kppwwwwppk...',
  '..kppkwwwwkppk..',
  '..khpkwemwkphk..',
  '...kpkkkkkkpk...',
  '...kppppppppk...',
  '...kppppppppk...',
  '...kUUk..kUUk...',
  '...kkkk..kkkk...',
];

SPRITES.kerttu = [
  '.......kk.......',
  '......kppk......',
  '.....kpyppk.....',
  '....kppppppk....',
  '..kkppppppppkk..',
  '...kwhhhhhhwk...',
  '...kwhkhhkhwk...',
  '...kwwhhhhwwk...',
  '....kwwwwwwk....',
  '...kppwwwwppk...',
  '..kppppwwppppk..',
  '..khkppppppkhk..',
  '...kppyppyppk...',
  '...kppppppppk...',
  '..kppppppppppk..',
  '..kkkkkkkkkkkk..',
];

SPRITES.vera = [
  '................',
  '.....kkkkkk.....',
  '....kUUUUUUk....',
  '...kUhhhhhhUk...',
  '...kUhkhhkhUk...',
  '...khhhhhhhhk...',
  '....khhrrhhk....',
  '...krkhhhhkrk...',
  '..krrssssssrrk..',
  '..krsmmmmmmsrk..',
  '..krhmmmmmmhrk..',
  '..krrsyyyysrrk..',
  '..krrmmmmmmrrk..',
  '...kkmmkkmmkk...',
  '.....kmk..kmk...',
  '.....kkk..kkk...',
];

SPRITES.wisp = [
  '................',
  '................',
  '......kkkk......',
  '.....kiiiik.....',
  '....kiwwiiik....',
  '....kiwiiiik....',
  '....kiikkiik....',
  '....kiiiiiik....',
  '.....kicciik....',
  '......kccck.....',
  '.......kcck.....',
  '........kck.....',
  '.........kk.....',
  '................',
  '................',
  '................',
];

SPRITES.bat = [
  '................',
  '................',
  '................',
  '................',
  '.k............k.',
  '.kpk..kkkk..kpk.',
  '.kppkkppppkkppk.',
  '.kpppkpwwpkpppk.',
  '..kppkprrpkppk..',
  '...kkkppppkkk...',
  '......kppk......',
  '.......kk.......',
  '................',
  '................',
  '................',
  '................',
];

SPRITES.crystal = [
  '.......kk.......',
  '......kick......',
  '.....kiicck.....',
  '..kk.kicbbk.kk..',
  '.kick.kcbbk.kcbk',
  '.kicbkkccbbkkcbk',
  '..kcbbkkkkkkbbk.',
  '...kbmmmmmmmbk..',
  '...kmkimmikmmk..',
  '...kmmmmmmmmmk..',
  '...kmmmffmmmmk..',
  '....kmmmmmmmk...',
  '....kmmk.kmmk...',
  '...kmmmk.kmmmk..',
  '...kkkkk.kkkkk..',
  '................',
];

SPRITES.crystals = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.......k........',
  '......kik.......',
  '..k...kick..k...',
  '.kik.kiccbk.kik.',
  '.kcbkkccbbkkcbk.',
  '.kcbkcbbbbbkcbk.',
  '..kkkkkkkkkkkk..',
  '................',
  '................',
  '................',
  '................',
];

// ---------- Numerola stage 2–3 and Eigenvale stage 3 enemies ----------

SPRITES.frog = [
  '................',
  '................',
  '................',
  '................',
  '...kkk....kkk...',
  '..kwkgk..kgkwk..',
  '..kkkggkkggkkk..',
  '..kgggggggggggk.',
  '.kgglggggggglgk.',
  '.kggrrrrrrrrggk.',
  '.kgggggggggggggk',
  'kGgyyyyyyyyyygGk',
  'kGGgyyyyyyyygGGk',
  '.kkGGkkkkkkGGkk.',
  '...kk......kk...',
  '................',
];

SPRITES.beetle = [
  '................',
  '................',
  '................',
  '..k..........k..',
  '...k........k...',
  '....kkkkkkkk....',
  '...kbbbbkcbbk...',
  '..kbcbbbkbbbbk..',
  '.kkbbbbbkbbbbkk.',
  'k.knbbbbkbbbbnk.k',
  '..knnbbbkbbbnnk.',
  '.k.knnnnknnnnk.k',
  '....kkkkkkkkk...',
  '...k..k..k..k...',
  '................',
  '................',
].map((r) => r.slice(0, 16).padEnd(16, '.'));

/** Recolour a sprite by swapping palette letters. */
function recolor(rows: string[], swap: Record<string, string>): string[] {
  return rows.map((r) => r.replace(/./g, (c) => swap[c] ?? c));
}

/** Shrink a sprite to a smaller blob (keeps it 16 × 16, centred at the bottom). */
function shrink(rows: string[]): string[] {
  const out: string[] = [];
  for (let y = 0; y < 16; y += 2) out.push(rows[y].replace(/(.)./g, '$1'));
  return [...new Array(8).fill('................'), ...out.map((r) => `....${r}....`)];
}

// a splitter slime: purple, it bursts into two droplets
SPRITES.splitter = recolor(SPRITES.slime, { l: 'c', g: 'p', G: 'n', w: 'i' });
SPRITES.droplet = shrink(recolor(SPRITES.slime, { l: 'i', g: 'c', G: 'b' }));
// a shade: a dark wisp that mends its friends
SPRITES.shade = recolor(SPRITES.wisp, { i: 'p', c: 'n', w: 'y' });
// glacier: an ice sentry (pale crystal golem), a frost wraith and the Frost Knight
SPRITES.sentry = recolor(SPRITES.crystal, { c: 'w', b: 'i', i: 'w', m: 's', f: 'm' });
SPRITES.wraith = recolor(SPRITES.wisp, { i: 'w', c: 's', w: 'c' });
SPRITES.knight = recolor(SPRITES.otso, { m: 'c', s: 'w', b: 'i', y: 'b' });
SPRITES.icicles = recolor(SPRITES.crystals, { i: 'w', c: 'i', b: 's' });

// ---------- Chancewood ----------

/** Double every pixel: a 16 × 16 sprite becomes a 32 × 32 boss. */
function upscale(rows: string[]): string[] {
  return rows.flatMap((r) => {
    const wide = r.replace(/./g, '$&$&');
    return [wide, wide];
  });
}

// Onni the lucky gambler: green coat, yellow scarf
SPRITES.onni = recolor(SPRITES.kai, { f: 'g', r: 'y', n: 'U' });
// Tilda the statistician and Hannu the old dice master
SPRITES.tilda = recolor(SPRITES.helmi, { y: 'u', o: 'U', g: 'b', w: 'i' });
SPRITES.hannu = recolor(SPRITES.pekka, { r: 'p', w: 'y', u: 'm' });
// Madame Fortuna: a fortune-teller in purple and gold, twice as big
SPRITES.fortuna = upscale(recolor(SPRITES.lumi, { U: 'y', t: 'p' }));
// a bandit: a ninja in brown and red
SPRITES.bandit = recolor(SPRITES.kai, { f: 'U', r: 'r', n: 'k' });
// a joker: a dark wisp with a red grin
SPRITES.joker = recolor(SPRITES.wisp, { i: 'r', c: 'p', w: 'y' });

SPRITES.imp = [
  '................',
  '................',
  '................',
  '...k........k...',
  '...kk......kk...',
  '...krk....krk...',
  '....krkkkkrk....',
  '....krrrrrrk....',
  '...krykrrkyrk...',
  '...krrrrrrrrk...',
  '....krwwwwrk....',
  '.....krrrrk.....',
  '....kr.rr.rk....',
  '...kr..kk..rk...',
  '....k......k....',
  '................',
];

SPRITES.cube = [
  '................',
  '................',
  '................',
  '................',
  '....kkkkkkkkk...',
  '...kwwwwwwwwsk..',
  '..kwwkwwwwkwssk.',
  '..kwwwwwwwwwssk.',
  '..kwwwwkwwwwssk.',
  '..kwwwwwwwwwssk.',
  '..kwwkwwwwkwssk.',
  '..kwwwwwwwwwssk.',
  '..ksssssssssssk.',
  '...kkkkkkkkkkk..',
  '................',
  '................',
];

SPRITES.mimic = [
  '................',
  '................',
  '................',
  '................',
  '...kkkkkkkkkk...',
  '..kuuuuuuuuuuk..',
  '..kuUuuuuuuUuk..',
  '..kyyyyyyyyyyk..',
  '..kwkwkwkwkwkk..',
  '..krrrrrrrrrrk..',
  '..kkwkwkwkwkwk..',
  '..kyyyykkyyyyk..',
  '..kuuuukykuuuk..',
  '..kuUuuuuuuUuk..',
  '...kkkkkkkkkk...',
  '................',
];

SPRITES.mushroom = [
  '................',
  '................',
  '................',
  '................',
  '.....kkkkkk.....',
  '...kkrrwrrrkk...',
  '..krrwwrrrwrrk..',
  '..krrrrrrwwrrk..',
  '.krwrrrrrrrrrrk.',
  '.kkkkkkkkkkkkkk.',
  '......kwwk......',
  '......kwwk......',
  '......kwwk......',
  '.....kkkkkk.....',
  '................',
  '................',
];

// a scalar slime keeps growing: warm colours
SPRITES.scalar = recolor(SPRITES.slime, { l: 'y', g: 'o', G: 'r' });
// the Eigenwarden: a royal golem of purple stone with golden eyes
SPRITES.warden = recolor(SPRITES.golem, { m: 'p', s: 'b', f: 'n', i: 'y' });

const cache = new Map<string, HTMLCanvasElement>();

export function renderSprite(rows: string[]): HTMLCanvasElement {
  const h = rows.length;
  const w = rows[0].length;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      const col = PALETTE[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return cv;
}

const GENERATED: Record<string, (seed: number) => HTMLCanvasElement> = { broad: broadleaf, pine, birch };

export function sprite(name: string): HTMLCanvasElement {
  let cv = cache.get(name);
  if (!cv && name.startsWith('tree_')) {
    const [, kind, seed] = name.split('_');
    cv = GENERATED[kind](Number(seed));
    cache.set(name, cv);
  }
  if (!cv) {
    const rows = SPRITES[name];
    if (!rows) throw new Error(`Unknown sprite ${name}`);
    cv = renderSprite(rows);
    cache.set(name, cv);
  }
  return cv;
}

/** A sprite scaled up as a data URL, for use in DOM <img> elements. */
const urlCache = new Map<string, string>();
export function spriteUrl(name: string, scale = 4): string {
  const key = `${name}@${scale}`;
  let url = urlCache.get(key);
  if (!url) {
    const src = sprite(name);
    const cv = document.createElement('canvas');
    cv.width = src.width * scale;
    cv.height = src.height * scale;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, cv.width, cv.height);
    url = cv.toDataURL();
    urlCache.set(key, url);
  }
  return url;
}
