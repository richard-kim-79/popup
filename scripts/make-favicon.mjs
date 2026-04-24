// PNG-in-ICO 포맷으로 favicon.ico 생성
// (ICO 안에 PNG를 직접 임베드 — 모든 모던 브라우저 지원)
import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = join(__dir, '..')

// 1. SVG → 32×32 PNG
execSync(`rsvg-convert -w 32 -h 32 ${__dir}/icon-fg.svg -o /tmp/icon32.png`)

const pngBuf = readFileSync('/tmp/icon32.png')
const pngLen = pngBuf.length

// 2. ICO 헤더 + 디렉토리 + PNG 데이터
//    헤더: 6바이트 | 디렉토리: 16바이트 | 데이터: pngLen바이트
const ico = Buffer.alloc(6 + 16 + pngLen)

// ICONDIR 헤더
ico.writeUInt16LE(0,     0)  // Reserved
ico.writeUInt16LE(1,     2)  // Type: 1 = ICO
ico.writeUInt16LE(1,     4)  // Count: 1 image

// ICONDIRENTRY
ico.writeUInt8(32,   6)   // Width
ico.writeUInt8(32,   7)   // Height
ico.writeUInt8(0,    8)   // ColorCount (0 = 256+)
ico.writeUInt8(0,    9)   // Reserved
ico.writeUInt16LE(1, 10)  // Planes
ico.writeUInt16LE(32,12)  // BitCount
ico.writeUInt32LE(pngLen, 14) // SizeInBytes
ico.writeUInt32LE(22,     18) // Offset (6 + 16)

// PNG 데이터
pngBuf.copy(ico, 22)

writeFileSync(join(root, 'app/favicon.ico'), ico)
console.log(`favicon.ico 생성 완료 (${ico.length} bytes)`)
