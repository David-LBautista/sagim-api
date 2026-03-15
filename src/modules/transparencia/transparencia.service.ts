import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import {
  TransparenciaSeccion,
  TransparenciaSeccionDocument,
  TransparenciaDocumento,
  TransparenciaDocumentoPublico,
  ResumenCumplimiento,
  TransparenciaSeccionPublica,
  buildSeedTransparencia,
} from './schemas/transparencia.schema';
import {
  AgregarDocumentoDto,
  EliminarDocumentoDto,
  FiltrosSeccionesDto,
} from './dto/transparencia.dto';
import { S3Service } from '../s3/s3.service';
import { S3Keys } from '@/shared/helpers/s3-keys.helper';
import { fecha } from '@/common/helpers/fecha.helper';

@Injectable()
export class TransparenciaService {
  private readonly logger = new Logger(TransparenciaService.name);

  constructor(
    @InjectModel(TransparenciaSeccion.name)
    private readonly seccionModel: Model<TransparenciaSeccionDocument>,
    private readonly s3Service: S3Service,
  ) {}

  // ── Seed / Inicialización ────────────────────────────────────────────────────

  async seedSecciones(municipioId: string | Types.ObjectId): Promise<void> {
    const id = new Types.ObjectId(municipioId.toString());
    const docs = buildSeedTransparencia(id);
    const ops = docs.map((doc) => ({
      updateOne: {
        filter: { municipioId: id, clave: doc.clave },
        update: { $setOnInsert: doc },
        upsert: true,
      },
    }));
    await this.seccionModel.bulkWrite(ops);
    this.logger.log(
      `Transparencia seed — municipio: ${municipioId} (${docs.length} secciones)`,
    );
  }

  /** @deprecated usa seedSecciones */
  async inicializarMunicipio(municipioId: string): Promise<void> {
    return this.seedSecciones(municipioId);
  }

  // ── Admin — secciones ────────────────────────────────────────────────────────

  async getSecciones(
    municipioId: string,
    filtros?: FiltrosSeccionesDto,
  ): Promise<{
    secciones: TransparenciaSeccionDocument[];
    resumen: ResumenCumplimiento;
  }> {
    await this.asegurarInicializado(municipioId);

    const query: FilterQuery<TransparenciaSeccionDocument> = {
      municipioId: new Types.ObjectId(municipioId),
    };

    if (filtros?.tipo === 'comun') query.esEspecificaMunicipio = false;
    if (filtros?.tipo === 'municipal') query.esEspecificaMunicipio = true;
    if (filtros?.area)
      query.areaResponsable = { $regex: filtros.area, $options: 'i' };
    if (filtros?.periodo) query.periodoActualizacion = filtros.periodo;
    if (filtros?.estado === 'al_corriente') query.alCorriente = true;
    if (filtros?.estado === 'con_documentos') {
      query['documentos.0'] = { $exists: true };
    }
    if (filtros?.estado === 'sin_documentos') {
      query.documentos = { $size: 0 };
    }

    const secciones = await this.seccionModel
      .find(query)
      .sort({ esEspecificaMunicipio: 1, articulo: 1 })
      .exec();

    const resumen = await this.getResumenCumplimiento(municipioId);
    return { secciones, resumen };
  }

  async getSeccion(
    municipioId: string,
    clave: string,
  ): Promise<TransparenciaSeccionDocument> {
    await this.asegurarInicializado(municipioId);
    const seccion = await this.seccionModel
      .findOne({ municipioId: new Types.ObjectId(municipioId), clave })
      .populate('ultimaModificacionPor', 'nombre')
      .exec();
    if (!seccion)
      throw new NotFoundException(`Sección '${clave}' no encontrada`);
    return seccion;
  }

  async marcarCorriente(
    municipioId: string,
    clave: string,
    alCorriente: boolean,
    userId: string,
  ): Promise<TransparenciaSeccionDocument> {
    const seccion = await this.getSeccion(municipioId, clave);
    if (alCorriente && !this.tieneDocumentos(seccion)) {
      throw new BadRequestException(
        'No se puede marcar al corriente una sección sin documentos',
      );
    }
    seccion.alCorriente = alCorriente;
    seccion.ultimaModificacionPor = new Types.ObjectId(userId);
    await seccion.save();
    this.logger.log(
      `Sección ${clave} marcada ${alCorriente ? 'al corriente' : 'NO al corriente'} — municipio: ${municipioId}`,
    );
    return seccion;
  }

  async updateNota(
    municipioId: string,
    clave: string,
    notaInterna: string,
    userId: string,
  ): Promise<TransparenciaSeccionDocument> {
    const seccion = await this.getSeccion(municipioId, clave);
    seccion.notaInterna = notaInterna;
    seccion.ultimaModificacionPor = new Types.ObjectId(userId);
    await seccion.save();
    return seccion;
  }

  // ── Admin — documentos ───────────────────────────────────────────────────────

  async agregarDocumento(
    municipioId: string,
    clave: string,
    dto: AgregarDocumentoDto,
    file: Express.Multer.File | undefined,
    userId: string,
    nombreUsuario: string,
  ): Promise<TransparenciaSeccionDocument> {
    if (dto.tipo === 'link' && !dto.url) {
      throw new BadRequestException('url es requerido cuando tipo = link');
    }
    if (dto.tipo === 'texto' && !dto.texto) {
      throw new BadRequestException('texto es requerido cuando tipo = texto');
    }
    if (dto.tipo === 'pdf' && !file) {
      throw new BadRequestException(
        'Debe enviar un archivo en el campo "archivo" cuando tipo = pdf',
      );
    }
    if (dto.tipo === 'excel' && !file) {
      throw new BadRequestException(
        'Debe enviar un archivo en el campo "archivo" cuando tipo = excel',
      );
    }

    const seccion = await this.getSeccion(municipioId, clave);

    const tieneSubsecciones = seccion.subsecciones?.length > 0;
    if (tieneSubsecciones && !dto.subseccionClave) {
      throw new BadRequestException(
        'subseccionClave es requerido para esta sección',
      );
    }

    let archivoUrl = '';
    let archivoKey = '';

    if (dto.tipo === 'pdf' && file) {
      const ext = file.originalname.split('.').pop() ?? 'pdf';
      const nombreArchivo = `${clave}-${Date.now()}.${ext}`;
      archivoKey = S3Keys.transparencia(municipioId, clave, nombreArchivo);
      await this.s3Service.uploadPDF(archivoKey, file.buffer);
      archivoUrl = await this.s3Service.getSignedUrl(archivoKey, 3600);
    }

    if (dto.tipo === 'excel' && file) {
      const ext = file.originalname.split('.').pop() ?? 'xlsx';
      const nombreArchivo = `${clave}-${Date.now()}.${ext}`;
      archivoKey = S3Keys.transparencia(municipioId, clave, nombreArchivo);
      await this.s3Service.uploadFile(archivoKey, file.buffer, file.mimetype);
      archivoUrl = await this.s3Service.getSignedUrl(archivoKey, 3600);
    }

    const nuevoDoc = {
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? '',
      tipo: dto.tipo,
      archivoUrl,
      archivoKey,
      url: dto.url ?? '',
      texto: dto.texto ?? '',
      ejercicio: dto.ejercicio ?? '',
      fechaPublicacion: fecha.ahoraEnMexico().toDate(),
      periodoReferencia: dto.periodoReferencia ?? '',
      subidoPor: new Types.ObjectId(userId),
      nombreSubidoPor: nombreUsuario,
    };

    if (dto.subseccionClave && tieneSubsecciones) {
      const subIdx = seccion.subsecciones.findIndex(
        (s) => s.clave === dto.subseccionClave,
      );
      if (subIdx === -1) {
        throw new NotFoundException(
          `Subsección '${dto.subseccionClave}' no encontrada`,
        );
      }
      seccion.subsecciones[subIdx].documentos.push(nuevoDoc as any);
    } else {
      seccion.documentos.push(nuevoDoc as any);
    }

    seccion.ultimaActualizacion = fecha.ahoraEnMexico().toDate();
    seccion.ultimaModificacionPor = new Types.ObjectId(userId);
    await seccion.save();

    this.logger.log(
      `Documento (${dto.tipo}) agregado — municipio: ${municipioId}, sección: ${clave}${dto.subseccionClave ? ', subsección: ' + dto.subseccionClave : ''}`,
    );
    return seccion;
  }

  async eliminarDocumento(
    municipioId: string,
    clave: string,
    dto: EliminarDocumentoDto,
    userId: string,
  ): Promise<TransparenciaSeccionDocument> {
    const seccion = await this.getSeccion(municipioId, clave);

    if (dto.subseccionClave) {
      const subIdx =
        seccion.subsecciones?.findIndex(
          (s) => s.clave === dto.subseccionClave,
        ) ?? -1;
      if (subIdx === -1) {
        throw new NotFoundException(
          `Subsección '${dto.subseccionClave}' no encontrada`,
        );
      }
      const sub = seccion.subsecciones[subIdx];
      if (
        dto.documentoIndex < 0 ||
        dto.documentoIndex >= sub.documentos.length
      ) {
        throw new NotFoundException(
          'Documento no encontrado en esta subsección',
        );
      }
      const doc = sub.documentos[dto.documentoIndex];
      if (doc.tipo === 'pdf' && doc.archivoKey) {
        await this.s3Service.deleteFile(doc.archivoKey);
      }
      sub.documentos.splice(dto.documentoIndex, 1);
    } else {
      if (
        dto.documentoIndex < 0 ||
        dto.documentoIndex >= seccion.documentos.length
      ) {
        throw new NotFoundException('Documento no encontrado en esta sección');
      }
      const doc = seccion.documentos[dto.documentoIndex];
      if (doc.tipo === 'pdf' && doc.archivoKey) {
        await this.s3Service.deleteFile(doc.archivoKey);
      }
      seccion.documentos.splice(dto.documentoIndex, 1);
    }

    if (!this.tieneDocumentos(seccion)) seccion.alCorriente = false;
    seccion.ultimaModificacionPor = new Types.ObjectId(userId);
    await seccion.save();

    this.logger.log(
      `Documento eliminado — municipio: ${municipioId}, sección: ${clave}, índice: ${dto.documentoIndex}`,
    );
    return seccion;
  }

  // ── Portal público ───────────────────────────────────────────────────────────

  async getPortalTransparencia(municipioId: string): Promise<{
    obligacionesComunes: TransparenciaSeccionPublica[];
    obligacionesMunicipales: TransparenciaSeccionPublica[];
  }> {
    await this.asegurarInicializado(municipioId);
    const secciones = await this.seccionModel
      .find({ municipioId: new Types.ObjectId(municipioId) })
      .sort({ articulo: 1 })
      .lean()
      .exec();

    const seccionesConDocs = secciones.filter((s) =>
      this.tieneDocumentosLean(s),
    );

    const toDocPublico = (
      d: TransparenciaDocumento,
    ): TransparenciaDocumentoPublico => ({
      nombre: d.nombre,
      descripcion: d.descripcion,
      tipo: d.tipo,
      ...(['pdf', 'excel'].includes(d.tipo) && d.archivoUrl
        ? { archivoUrl: d.archivoUrl }
        : {}),
      ...(d.tipo === 'link' && d.url ? { url: d.url } : {}),
      ...(d.tipo === 'texto' && d.texto ? { texto: d.texto } : {}),
      fechaPublicacion: d.fechaPublicacion,
      periodoReferencia: d.periodoReferencia,
      ejercicio: d.ejercicio ?? '',
    });

    const toPublica = (
      s: (typeof secciones)[0],
    ): TransparenciaSeccionPublica => ({
      clave: s.clave,
      titulo: s.titulo,
      descripcion: s.descripcion,
      articulo: s.articulo,
      areaResponsable: s.areaResponsable,
      periodoActualizacion: s.periodoActualizacion,
      notaPeriodo: s.notaPeriodo,
      ultimaActualizacion: s.ultimaActualizacion,
      subsecciones: s.subsecciones.map((sub) => ({
        clave: sub.clave,
        titulo: sub.titulo,
        orden: sub.orden,
        ultimaActualizacion: sub.ultimaActualizacion,
        documentos: sub.documentos.map(toDocPublico),
      })),
      documentos: s.documentos.map(toDocPublico),
    });

    return {
      obligacionesComunes: seccionesConDocs
        .filter((s) => !s.esEspecificaMunicipio)
        .map(toPublica),
      obligacionesMunicipales: seccionesConDocs
        .filter((s) => s.esEspecificaMunicipio)
        .map(toPublica),
    };
  }

  async getSeccionPublica(
    municipioId: string,
    clave: string,
  ): Promise<TransparenciaSeccionPublica> {
    const seccion = await this.seccionModel
      .findOne({ municipioId: new Types.ObjectId(municipioId), clave })
      .lean()
      .exec();

    if (!seccion || !this.tieneDocumentosLean(seccion)) {
      throw new NotFoundException(
        `Sección '${clave}' no encontrada o sin documentos`,
      );
    }

    const toDocPublico = (
      d: TransparenciaDocumento,
    ): TransparenciaDocumentoPublico => ({
      nombre: d.nombre,
      descripcion: d.descripcion,
      tipo: d.tipo,
      ...(['pdf', 'excel'].includes(d.tipo) && d.archivoUrl
        ? { archivoUrl: d.archivoUrl }
        : {}),
      ...(d.tipo === 'link' && d.url ? { url: d.url } : {}),
      ...(d.tipo === 'texto' && d.texto ? { texto: d.texto } : {}),
      fechaPublicacion: d.fechaPublicacion,
      periodoReferencia: d.periodoReferencia,
      ejercicio: d.ejercicio ?? '',
    });

    return {
      clave: seccion.clave,
      titulo: seccion.titulo,
      descripcion: seccion.descripcion,
      articulo: seccion.articulo,
      areaResponsable: seccion.areaResponsable,
      periodoActualizacion: seccion.periodoActualizacion,
      notaPeriodo: seccion.notaPeriodo,
      ultimaActualizacion: seccion.ultimaActualizacion,
      subsecciones: seccion.subsecciones.map((sub) => ({
        clave: sub.clave,
        titulo: sub.titulo,
        orden: sub.orden,
        ultimaActualizacion: sub.ultimaActualizacion,
        documentos: sub.documentos.map(toDocPublico),
      })),
      documentos: seccion.documentos.map(toDocPublico),
    };
  }

  // ── Dashboard — resumen de cumplimiento ─────────────────────────────────────

  async getResumenCumplimiento(
    municipioId: string,
  ): Promise<ResumenCumplimiento> {
    await this.asegurarInicializado(municipioId);
    const secciones = await this.seccionModel
      .find({ municipioId: new Types.ObjectId(municipioId) })
      .lean()
      .exec();

    const total = secciones.length;
    const conDocumentos = secciones.filter((s) =>
      this.tieneDocumentosLean(s),
    ).length;
    const alCorriente = secciones.filter((s) => s.alCorriente).length;
    const sinDocumentos = total - conDocumentos;

    const enRiesgo = secciones
      .filter((s) => !s.alCorriente)
      .map((s) => ({
        clave: s.clave,
        titulo: s.titulo,
        articulo: s.articulo,
        ultimaActualizacion: s.ultimaActualizacion,
        periodoActualizacion: s.periodoActualizacion,
      }));

    return {
      totalObligaciones: total,
      conDocumentos,
      alCorriente,
      sinDocumentos,
      porcentajeCumplimiento:
        total > 0 ? Math.round((alCorriente / total) * 100) : 0,
      enRiesgo,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private tieneDocumentos(seccion: TransparenciaSeccionDocument): boolean {
    if (seccion.documentos?.length > 0) return true;
    return seccion.subsecciones?.some((s) => s.documentos?.length > 0) ?? false;
  }

  private tieneDocumentosLean(seccion: any): boolean {
    if (seccion.documentos?.length > 0) return true;
    return (
      seccion.subsecciones?.some((s: any) => s.documentos?.length > 0) ?? false
    );
  }

  private async asegurarInicializado(municipioId: string): Promise<void> {
    const count = await this.seccionModel.countDocuments({
      municipioId: new Types.ObjectId(municipioId),
    });
    if (count === 0) {
      await this.inicializarMunicipio(municipioId);
    }
  }
}
