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

export function sprite(name: string): HTMLCanvasElement {
  let cv = cache.get(name);
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
