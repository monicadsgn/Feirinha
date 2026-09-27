/**
 * Lê o texto de fotos e prints (slide de carrossel, quadro do vídeo com os
 * ingredientes). Roda no próprio celular, grátis, com o Tesseract em
 * português; o motor (~4 MB) só baixa na primeira vez que for usado.
 */
export async function readImages(files: File[], onProgress?: (msg: string) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  onProgress?.('Preparando o leitor de texto (só demora na primeira vez)…')
  const base = new URL('tesseract/', location.origin + location.pathname).href
  const worker = await createWorker('por', 1, { workerPath: `${base}worker.min.js`, corePath: base, langPath: base, gzip: true })
  try {
    const parts: string[] = []
    for (let i = 0; i < files.length; i++) {
      onProgress?.(files.length > 1 ? `Lendo imagem ${i + 1} de ${files.length}…` : 'Lendo a imagem…')
      const { data } = await worker.recognize(files[i]!)
      parts.push(cleanOcr(data.text))
    }
    return parts.filter(Boolean).join('\n\n')
  } finally {
    await worker.terminate()
  }
}

/** Tira linhas de lixo que o OCR costuma trazer (símbolos soltos, muito curtas). */
function cleanOcr(text: string): string {
  return text
    .split('\n')
    .map((l) => l.replace(/[|_~^`]+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((l) => l.length >= 3 && /[a-zà-ú]{2}/i.test(l))
    .join('\n')
}
