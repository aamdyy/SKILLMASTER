// Génère la trame des deux mains de l'accueil (components/hands-data.ts) à partir de « La Création
// d'Adam » de Michel-Ange (domaine public, Wikimedia Commons), recadrée sur les bras (1100×324, BMP).
// L'image ne fait pas partie du repo : seule la trame calculée y entre.
//   node scripts/hands.mjs <image.bmp> <sortie.json>
//
// Rendu en rangées de caractères, deux fois plus hautes que larges (effet de stries) :
// 3 = losange plein (lumière), 2 = petit losange (demi-teinte), 1 = point (ombre et bord), 0 = vide.
import { readFileSync, writeFileSync } from 'node:fs'

const buf = readFileSync(process.argv[2])
const off = buf.readUInt32LE(10), W = buf.readInt32LE(18), H0 = buf.readInt32LE(22), bpp = buf.readUInt16LE(28)
const H = Math.abs(H0), bottomUp = H0 > 0, Bpp = bpp / 8, stride = Math.ceil((W * Bpp) / 4) * 4
const px = (x, y) => { const row = bottomUp ? H - 1 - y : y; const i = off + row * stride + x * Bpp; return [buf[i + 2], buf[i + 1], buf[i]] }

// Zones tracées à la main sur l'image 1100×324 : bras d'Adam (gauche), bras de Dieu (droite).
const A = [[0,165],[200,160],[330,132],[385,115],[470,128],[505,178],[470,210],[380,200],[300,222],[200,248],[0,258]]
const B = [[495,170],[600,140],[720,105],[860,48],[1100,-5],[1100,70],[890,150],[770,172],[650,205],[600,240],[540,240],[495,195]]
const inside = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c } return c }

// Fenêtre serrée sur les mains : les bras sortent des bords gauche et droit.
const X0 = 140, X1 = 880, Y0 = 58, Y1 = 262
const COLS = 230, ASPECT = 2 // une case est deux fois plus haute que large
const cw = (X1 - X0) / COLS, ch = cw * ASPECT, ROWS = Math.round((Y1 - Y0) / ch)

const level = []
for (let r = 0; r < ROWS; r++) {
  const row = []
  for (let c = 0; c < COLS; c++) {
    let skin = 0, lum = 0, n = 0
    for (let dy = 0; dy < ch; dy++) for (let dx = 0; dx < cw; dx += 0.5) {
      const x = Math.floor(X0 + c * cw + dx), y = Math.floor(Y0 + r * ch + dy)
      if (x < 0 || y < 0 || x >= W || y >= H || !(inside(A, x, y) || inside(B, x, y))) continue
      const [R, G, Bl] = px(x, y)
      const warm = R - Bl
      const isSkin = warm > 45 && warm / Math.max(R, 1) > 0.25
      skin += isSkin ? 1 : 0
      if (isSkin) { lum += (0.2126 * R + 0.7152 * G + 0.0722 * Bl) / 255; n++ }
    }
    const cx = X0 + (c + 0.5) * cw, cy = Y0 + (r + 0.5) * ch
    // Haut du bras de droite : caché par la manche, prolongé jusqu'au bord.
    const extended = cx > 840 && inside(B, cx, cy)
    const share = skin / (ch * cw * 2)
    const l = n ? lum / n : 0.6
    row.push(share > 0.4 || extended ? (l > 0.74 ? 3 : l > 0.52 ? 2 : 1) : share > 0.12 ? 1 : 0)
  }
  level.push(row)
}
writeFileSync(process.argv[3], JSON.stringify({ cols: COLS, rows: ROWS, aspect: ASPECT, data: level.map(row => row.join('').replace(/0+$/, '')) }))
console.log(level.map(row => row.map(v => ' .◇◆'[v]).join('')).join('\n'))
