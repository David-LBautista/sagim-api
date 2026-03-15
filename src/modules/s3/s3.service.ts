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
import { S3Keys } from '@/shared/helpers/s3-keys.helper';

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

  // ── Helpers estáticos de keys S3 ───────────────────────────────────────────
  // Delegan a S3Keys (src/shared/helpers/s3-keys.helper.ts).
  // Los callers existentes no necesitan cambiar; importar S3Keys directamente en código nuevo.

  /** @deprecated usar S3Keys.reciboCaja() */
  static keyReciboCaja(municipioId: string, folio: string): string {
    return S3Keys.reciboCaja(municipioId, folio);
  }

  /** @deprecated usar S3Keys.reciboOrden() */
  static keyReciboOrden(municipioId: string, folio: string): string {
    return S3Keys.reciboOrden(municipioId, folio);
  }

  /** @deprecated usar S3Keys.reporteDif() */
  static keyReporteDif(
    municipioId: string,
    subtipo: string,
    periodo: string,
  ): string {
    return S3Keys.reporteDif(municipioId, subtipo, periodo);
  }

  /**
   * @deprecated usar S3Keys.corteDiario() / S3Keys.corteMensual() / S3Keys.reporteServicioTesoreria()
   * Mantiene retrocompatibilidad mapeando subtipo al nuevo helper correcto.
   */
  static keyReporteTesoreria(
    municipioId: string,
    subtipo: string,
    periodo: string,
  ): string {
    if (subtipo === 'diario') return S3Keys.corteDiario(municipioId, periodo);
    if (subtipo === 'mensual') return S3Keys.corteMensual(municipioId, periodo);
    return S3Keys.reporteServicioTesoreria(municipioId, periodo);
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
   * Subir cualquier archivo a S3 con ContentType dinámico
   */
  async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<{ key: string; bucket: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
        ServerSideEncryption: 'AES256',
      });
      await this.s3Client.send(command);
      return { key, bucket: this.bucketName };
    } catch (error) {
      throw new BadRequestException(
        `Error subiendo archivo a S3: ${error.message}`,
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
