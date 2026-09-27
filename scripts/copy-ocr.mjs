// Copia o motor de leitura de texto (Tesseract) e o português pro site,
// pra ler prints sem depender de CDN externo. Roda antes do build.
import { copyFileSync, mkdirSync } from 'node:fs'

const out = 'public/tesseract'
mkdirSync(out, { recursive: true })
copyFileSync('node_modules/tesseract.js/dist/worker.min.js', `${out}/worker.min.js`)
for (const v of ['tesseract-core-lstm', 'tesseract-core-simd-lstm', 'tesseract-core-relaxedsimd-lstm']) {
  copyFileSync(`node_modules/tesseract.js-core/${v}.wasm.js`, `${out}/${v}.wasm.js`)
}
copyFileSync('node_modules/@tesseract.js-data/por/4.0.0_best_int/por.traineddata.gz', `${out}/por.traineddata.gz`)
console.log('ocr: arquivos copiados pra', out)
