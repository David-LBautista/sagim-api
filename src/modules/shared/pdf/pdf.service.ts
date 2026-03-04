/* eslint-disable @typescript-eslint/no-require-imports */
import { Injectable } from '@nestjs/common';
import * as https from 'https';
import * as http from 'http';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { S3Service } from '@/modules/s3/s3.service';

import PdfMake = require('pdfmake/build/pdfmake');
import PdfFonts = require('pdfmake/build/vfs_fonts');
// pdfmake 0.3.x: vfs_fonts exports the font map directly at the top level
(PdfMake as any).vfs = (PdfFonts as any).vfs ?? (PdfFonts as any);
(PdfMake as any).fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
};

@Injectable()
export class PdfService {
  constructor(private readonly s3Service: S3Service) {}

  /**
   * Genera un Buffer PDF a partir de una definición pdfmake.
   */
  async generatePdfBuffer(
    docDefinition: TDocumentDefinitions,
  ): Promise<Buffer> {
    const doc = PdfMake.createPdf(docDefinition as any);
    const buffer = await (doc as any).getBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Descarga una imagen desde una URL y la convierte a base64 data-URI.
   * Útil para incrustar logos en los PDFs.
   */
  fetchImageAsBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client
        .get(url, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} fetching image: ${url}`));
            return;
          }
          const contentType = res.headers['content-type'] || 'image/png';
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const b64 = Buffer.concat(chunks).toString('base64');
            resolve(`data:${contentType};base64,${b64}`);
          });
          res.on('error', reject);
        })
        .on('error', reject);
    });
  }

  /**
   * Sube el PDF a S3 y genera una URL firmada.
   * Conveniencia para el flujo completo de generación de reportes.
   *
   * @param key       S3 key destino (usar S3Service.key* helpers)
   * @param buffer    Buffer del PDF
   * @param metadata  Metadatos opcionales para el objeto S3
   * @param expiresIn Segundos de validez de la URL firmada (default 300)
   */
  async uploadAndSign(
    key: string,
    buffer: Buffer,
    metadata?: Record<string, string>,
    expiresIn = 300,
  ): Promise<{ url: string; key: string; expiraEn: Date }> {
    await this.s3Service.uploadPDF(key, buffer, metadata);
    const url = await this.s3Service.getSignedUrl(key, expiresIn);
    const expiraEn = new Date(Date.now() + expiresIn * 1000);
    return { url, key, expiraEn };
  }
}
