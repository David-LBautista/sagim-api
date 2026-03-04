import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { S3Module } from '@/modules/s3/s3.module';

@Module({
  imports: [S3Module],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
