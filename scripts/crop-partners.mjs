// Cuts each partner's photograph out of the screenshots of Y Combinator's own
// partners page. Coordinates are in the screenshots' displayed 923px width and
// scaled up to the 1080px files, which is why every box is one line of numbers
// rather than something computed.
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const SRC = '/root/.claude/uploads/7aeb06c1-6622-51db-9f09-95aa6fe43b65'
const OUT = 'public/people'
const S = 1080 / 923

const shots = {
  a: `${SRC}/e43a0770-image.jpg`,
  b: `${SRC}/e7c069ef-image.jpg`,
  c: `${SRC}/32b6b903-image.jpg`,
  d: `${SRC}/acebad1f-image.jpg`,
}

// slug, screenshot, [x, y, w, h] in displayed pixels
const CROPS = [
  ['garry-tan',         'a', 137, 486, 245, 245],
  ['harj-taggar',       'a', 542, 486, 245, 245],
  ['jared-friedman',    'a', 137, 954, 245, 245],
  ['aaron-epstein',     'a', 542, 954, 245, 245],
  ['diana-hu',          'a', 137, 1422, 245, 245],
  ['gustaf-alstromer',  'a', 542, 1422, 245, 245],
  // Nicolas Dessaigne's and Tom Blomfield's cards were scrolled part-way off the
  // top of the screenshot, so there is no photograph of them to cut out. Their
  // rows fall back to initials rather than shipping a crop of a forehead.
  ['brad-flora',        'b', 137, 603, 245, 245],
  ['pete-koomen',       'b', 542, 603, 245, 245],
  ['ankit-gupta',       'c', 137, 285, 245, 245],
  ['tyler-bosmeny',     'c', 542, 285, 245, 245],
  ['david-lieb',        'c', 137, 753, 245, 245],
  ['andrew-miklas',     'c', 542, 753, 245, 245],
  ['harshita-arora',    'c', 137, 1220, 245, 245],
  ['jon-xu',            'c', 542, 1220, 245, 245],
  ['chris-golda',       'd', 137, 995, 245, 245],
  ['grey-baker',        'd', 542, 995, 245, 245],
]

mkdirSync(OUT, { recursive: true })

const tiles = []
for (const [slug, shot, x, y, w, h] of CROPS) {
  const box = {
    left: Math.round(x * S), top: Math.round(y * S),
    width: Math.round(w * S), height: Math.round(h * S),
  }
  const buf = await sharp(shots[shot]).extract(box)
    .resize(320, 320, { fit: 'cover' }).jpeg({ quality: 88 }).toBuffer()
  await sharp(buf).toFile(`${OUT}/${slug}.jpg`)
  tiles.push({ slug, buf })
}

// One contact sheet so the crops can be checked in a single look.
const COLS = 6, TILE = 160
const rows = Math.ceil(tiles.length / COLS)
await sharp({
  create: { width: COLS * TILE, height: rows * TILE, channels: 3, background: '#eee' },
})
  .composite(await Promise.all(tiles.map(async (t, i) => ({
    input: await sharp(t.buf).resize(TILE, TILE).toBuffer(),
    left: (i % COLS) * TILE, top: Math.floor(i / COLS) * TILE,
  }))))
  .jpeg({ quality: 88 })
  .toFile('/tmp/claude-0/-home-user-kite/7aeb06c1-6622-51db-9f09-95aa6fe43b65/scratchpad/contact-sheet.jpg')

console.log(tiles.map(t => t.slug).join(' '))
