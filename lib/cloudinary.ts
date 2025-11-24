import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

/**
 * Upload image to Cloudinary
 * @param file - Base64 encoded image or file buffer
 * @param folder - Folder name in Cloudinary (default: 'paperboxd/avatars')
 * @param publicId - Custom public ID (optional)
 */
export async function uploadToCloudinary(
  file: string,
  folder: string = 'paperboxd/avatars',
  publicId?: string
): Promise<{
  url: string;
  publicId: string;
  secureUrl: string;
}> {
  try {
    const uploadOptions: {
      folder: string;
      resource_type: 'auto';
      transformation: Array<{
        width: number;
        height: number;
        crop: 'fill';
        gravity: 'face';
        quality: 'auto:good';
        fetch_format: 'auto';
      }>;
      public_id?: string;
      overwrite?: boolean;
    } = {
      folder,
      resource_type: 'auto' as const,
      transformation: [
        {
          width: 500,
          height: 500,
          crop: 'fill' as const,
          gravity: 'face' as const,
          quality: 'auto:good' as const,
          fetch_format: 'auto' as const,
        },
      ],
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
      uploadOptions.overwrite = true;
    }

    const result = await cloudinary.uploader.upload(file, uploadOptions);

    return {
      url: result.url,
      publicId: result.public_id,
      secureUrl: result.secure_url,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload image: ${errorMessage}`);
  }
}

/**
 * Delete image from Cloudinary
 * @param publicId - Public ID of the image to delete
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete image: ${errorMessage}`);
  }
}

/**
 * Extract public ID from Cloudinary URL
 * @param url - Cloudinary URL
 */
export function getPublicIdFromUrl(url: string): string | null {
  try {
    // Extract public ID from Cloudinary URL
    // Format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
