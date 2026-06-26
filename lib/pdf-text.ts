import { extractText, getDocumentProxy } from 'unpdf'

/**
 * PDF 바이트에서 본문 텍스트 추출 (검색 색인용). 실패 시 빈 문자열.
 * 스캔 이미지 PDF는 텍스트가 없어 빈 결과가 될 수 있음(OCR 미지원).
 */
export async function extractPdfText(bytes: Uint8Array, maxChars = 30000): Promise<string> {
  try {
    const pdf = await getDocumentProxy(bytes)
    const { text } = await extractText(pdf, { mergePages: true })
    const merged = Array.isArray(text) ? text.join(' ') : text
    return merged.replace(/\s+/g, ' ').trim().slice(0, maxChars)
  } catch {
    return ''
  }
}
