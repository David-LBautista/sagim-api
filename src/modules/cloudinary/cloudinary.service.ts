import { Injectable, BadRequestException } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'sagim',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = v2.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          // Optimizaciones para reducir tamaño
          transformation: [
            {
              width: 1200, // Máximo 1200px de ancho
              height: 1200, // Máximo 1200px de alto
              crop: 'limit', // Solo redimensiona si es más grande
              quality: 'auto:good', // Calidad automática optimizada
              fetch_format: 'auto', // Formato automático (webp si es soportado)
            },
          ],
          // Compresión agresiva
          flags: 'lossy',
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) {
            reject(
              new BadRequestException('Error al subir imagen a Cloudinary'),
            );
          }
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'sagim',
  ): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    const results = await Promise.all(uploadPromises);
    return results.map((result) => result.secure_url);
  }

  async deleteImage(publicId: string): Promise<any> {
    return v2.uploader.destroy(publicId);
  }
}
