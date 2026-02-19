/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, BadRequestException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.bucketName =
      this.configService.get<string>('AWS_S3_BUCKET') || 'sagim-documents-dev';

    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION') || 'us-east-1',
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  /**
   * Generar S3 key siguiendo la estructura SAGIM
   * municipios/{municipioClave}/{modulo}/{submodulo}/{YYYY}/{MM}/{archivo}.pdf
   */
  generateKey(
    municipioClave: string,
    modulo: 'tesoreria' | 'dif' | 'registro-civil' | 'catastro',
    submodulo: 'pagos' | 'apoyos' | 'tramites',
    tipo: 'recibo' | 'comprobante' | 'constancia',
    folio: string,
    entidadId: string,
  ): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const timestamp = now
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .substring(0, 14); // YYYYMMDDHHMMSS

    const fileName = `${tipo}-${folio}-${entidadId}-${timestamp}.pdf`;

    return `municipios/${municipioClave}/${modulo}/${submodulo}/${year}/${month}/${fileName}`;
  }

  /**
   * Subir archivo PDF a S3
   */
  async uploadPDF(
    key: string,
    pdfBuffer: Buffer,
    metadata?: Record<string, string>,
  ): Promise<{ key: string; bucket: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        Metadata: metadata,
        ServerSideEncryption: 'AES256', // Cifrado por defecto
      });

      await this.s3Client.send(command);

      return {
        key,
        bucket: this.bucketName,
      };
    } catch (error) {
      throw new BadRequestException(
        `Error subiendo PDF a S3: ${error.message}`,
      );
    }
  }

  /**
   * Generar Signed URL temporal (60 segundos por defecto)
   * ⚠️ NUNCA retornar URLs públicas, siempre signed URLs
   */
  async getSignedUrl(key: string, expiresIn: number = 60): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return signedUrl;
    } catch (error) {
      throw new BadRequestException(
        `Error generando URL firmada: ${error.message}`,
      );
    }
  }

  /**
   * Eliminar archivo de S3
   * (Solo usar si un municipio termina contrato o corrección crítica)
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      throw new BadRequestException(
        `Error eliminando archivo de S3: ${error.message}`,
      );
    }
  }

  /**
   * Eliminar todos los archivos de un municipio
   * (Solo usar cuando un municipio termina contrato)
   */
  async deleteMunicipioFolder(municipioClave: string): Promise<void> {
    // Esta operación debe hacerse con mucho cuidado
    // En producción, mejor usar AWS CLI: aws s3 rm s3://bucket/municipios/CLAVE --recursive
    throw new BadRequestException(
      'Operación no permitida desde el backend. Usar AWS CLI para borrado masivo.',
    );
  }
}
