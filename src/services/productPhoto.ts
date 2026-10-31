const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const productPhotoAccept = 'image/jpeg,image/png,image/webp';
const maxFileSize = 10 * 1024 * 1024;
const maxDimension = 960;
const maxSavedLength = 200_000;

/** Store a small, rasterized photo using the product API's existing image field. */
export async function prepareProductPhoto(file: File): Promise<string> {
  if (!supportedTypes.has(file.type)) throw new Error('Choose a JPG, PNG or WebP photo.');
  if (file.size > maxFileSize) throw new Error('Choose a photo smaller than 10 MB.');
  if (!file.size) throw new Error('This photo is empty. Choose another photo.');

  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const picture = new Image();
      picture.onload = () => resolve(picture);
      picture.onerror = () =>
        reject(new Error('This photo could not be opened. Choose another JPG, PNG or WebP photo.'));
      picture.src = source;
    });
    if (!image.naturalWidth || !image.naturalHeight)
      throw new Error('This photo could not be opened. Choose another photo.');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare the photo. Try another browser.');
    let scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    for (let attempt = 0; attempt < 4; attempt++) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.68, 0.52, 0.38]) {
        let encoded = canvas.toDataURL('image/webp', quality);
        if (!encoded.startsWith('data:image/webp;')) {
          // Browsers without WebP encoding can still save an optimized JPEG.
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          encoded = canvas.toDataURL('image/jpeg', quality);
        }
        if (encoded.startsWith('data:image/') && encoded.length <= maxSavedLength) return encoded;
      }
      scale *= 0.75;
    }
    throw new Error('This photo could not be reduced enough. Choose a smaller photo.');
  } finally {
    URL.revokeObjectURL(source);
  }
}
