import { v2 as cloudinary } from 'cloudinary';
import { IProductImage } from '../models/schemas';

const isCloudinaryConfigured =
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(process.env.CLOUDINARY_API_KEY) &&
  Boolean(process.env.CLOUDINARY_API_SECRET) &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name';

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export async function uploadProductMedia(
  fileUrlOrBase64: string,
  altText: string,
  isMain = false
): Promise<IProductImage> {
  if (isCloudinaryConfigured && fileUrlOrBase64.startsWith('data:image')) {
    const result = await cloudinary.uploader.upload(fileUrlOrBase64, {
      folder: 'aethelgard/products',
      resource_type: 'image',
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
      alt: altText,
      isMain,
    };
  }

  // Sandbox / development mode: store clean URL and deterministic Cloudinary publicId
  const randomId = Math.random().toString(36).substring(2, 10);
  return {
    url: fileUrlOrBase64,
    publicId: `aethelgard/products/media_${Date.now()}_${randomId}`,
    alt: altText || 'Aethelgard Product Image',
    isMain,
  };
}

export async function deleteProductMedia(publicId: string): Promise<{ deleted: boolean; publicId: string }> {
  if (isCloudinaryConfigured && publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (e) {
      console.warn('[Cloudinary] Failed to destroy remote asset:', publicId);
    }
  }
  return { deleted: true, publicId };
}
