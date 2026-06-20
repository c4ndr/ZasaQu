/**
 * Kompres gambar via canvas sebelum upload.
 * @param {string} dataUrl  - data URL gambar sumber
 * @param {object} opts
 * @param {number} opts.maxWidth   - lebar maks pixel (default 1280)
 * @param {number} opts.maxHeight  - tinggi maks pixel (default 1280)
 * @param {number} opts.quality    - kualitas JPEG 0–1 (default 0.78)
 * @returns {Promise<{dataUrl: string, mime: string}>}
 */
export function compressImage(dataUrl, { maxWidth = 1280, maxHeight = 1280, quality = 0.78 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1)
      const w = Math.round(img.width  * ratio)
      const h = Math.round(img.height * ratio)
      const cv = document.createElement('canvas')
      cv.width = w; cv.height = h
      cv.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve({ dataUrl: cv.toDataURL('image/jpeg', quality), mime: 'image/jpeg' })
    }
    img.onerror = () => reject(new Error('Gagal memproses gambar'))
    img.src = dataUrl
  })
}
