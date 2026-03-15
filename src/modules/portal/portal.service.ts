import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as dayjs from 'dayjs';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { fecha } from '@/common/helpers/fecha.helper';

import {
  PortalConfiguracion,
  PortalConfiguracionDocument,
} from './schemas/portal-configuracion.schema';
import {
  UpdatePortalGeneralDto,
  UpdatePortalAparienciaDto,
  UpdatePortalRedesSocialesDto,
  UpdatePortalFooterDto,
} from './dto/portal.dto';
import {
  Municipality,
  MunicipalityDocument,
} from '../municipalities/schemas/municipality.schema';
import {
  PortalAviso,
  PortalAvisoDocument,
} from './schemas/portal-aviso.schema';
import {
  CreatePortalAvisoDto,
  UpdatePortalAvisoDto,
} from './dto/portal-aviso.dto';

@Injectable()
export class PortalService {
  private readonly logger = new Logger(PortalService.name);

  constructor(
    @InjectModel(PortalConfiguracion.name)
    private readonly portalModel: Model<PortalConfiguracionDocument>,
    @InjectModel(Municipality.name)
    private readonly municipioModel: Model<MunicipalityDocument>,
    @InjectModel(PortalAviso.name)
    private readonly avisoModel: Model<PortalAvisoDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Resuelve municipio por claveInegi o nombre (con guión → espacio) */
  async resolverMunicipio(slug: string): Promise<{
    _id: unknown;
    nombre: string;
    logoUrl?: string;
    claveInegi?: string;
    latitud?: number;
    longitud?: number;
  }> {
    const normalizado = slug.replace(/-/g, ' ');
    const sinEspacios = slug.replace(/-/g, '').replace(/\s/g, '').toLowerCase();
    const municipio = await this.municipioModel
      .findOne({
        $or: [
          { claveInegi: slug },
          { nombre: { $regex: `^${normalizado}$`, $options: 'i' } },
          {
            $expr: {
              $regexMatch: {
                input: {
                  $replaceAll: {
                    input: { $toLower: '$nombre' },
                    find: ' ',
                    replacement: '',
                  },
                },
                regex: `^${sinEspacios}$`,
              },
            },
          },
        ],
        activo: true,
      })
      .lean()
      .exec();

    if (!municipio) {
      throw new NotFoundException(`Municipio "${slug}" no encontrado`);
    }
    return municipio as {
      _id: unknown;
      nombre: string;
      logoUrl?: string;
      claveInegi?: string;
      latitud?: number;
      longitud?: number;
    };
  }

  /** Obtiene o crea la configuración del portal para el municipio */
  private async getOrCreate(
    municipioId: string,
  ): Promise<PortalConfiguracionDocument> {
    const existing = await this.portalModel
      .findOne({ municipioId: new Types.ObjectId(municipioId) })
      .exec();

    if (existing) return existing;

    const created = new this.portalModel({
      municipioId: new Types.ObjectId(municipioId),
    });
    await created.save();
    return created;
  }

  // ── Endpoint público ─────────────────────────────────────────────────────────

  /**
   * Devuelve todo lo necesario para renderizar el portal público.
   * Combina datos del municipio + PortalConfiguracion.
   */
  async getPortalPublico(
    municipioId: string,
    municipioNombre: string,
    logoUrl?: string,
    latitud?: number,
    longitud?: number,
  ): Promise<Record<string, unknown>> {
    const ahora = new Date();
    const [config, avisos] = await Promise.all([
      this.getOrCreate(municipioId),
      this.avisoModel
        .find({
          municipioId: new Types.ObjectId(municipioId),
          activo: true,
          vigenciaInicio: { $lte: ahora },
          vigenciaFin: { $gte: ahora },
        })
        .sort({ orden: 1, createdAt: -1 })
        .select('-municipioId -creadoPor -updatedAt -__v')
        .lean()
        .exec(),
    ]);

    return {
      nombre: municipioNombre,
      logoUrl: logoUrl ?? null,
      latitud: latitud ?? null,
      longitud: longitud ?? null,
      general: config.general,
      apariencia: config.apariencia,
      redesSociales: config.redesSociales,
      footer: config.footer,
      avisos,
    };
  }

  // ── Lectura interna ──────────────────────────────────────────────────────────

  async getConfiguracion(
    municipioId: string,
  ): Promise<PortalConfiguracionDocument> {
    return this.getOrCreate(municipioId);
  }

  // ── Actualización por secciones ──────────────────────────────────────────────

  async updateGeneral(
    municipioId: string,
    dto: UpdatePortalGeneralDto,
    userId: string,
  ): Promise<PortalConfiguracionDocument> {
    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        update[`general.${key}`] = value;
      }
    }
    update['ultimaModificacionPor'] = new Types.ObjectId(userId);

    const doc = await this.portalModel
      .findOneAndUpdate(
        { municipioId: new Types.ObjectId(municipioId) },
        { $set: update },
        { new: true, upsert: true },
      )
      .exec();

    this.logger.log(`Portal general actualizado — municipio: ${municipioId}`);
    return doc!;
  }

  async updateApariencia(
    municipioId: string,
    dto: UpdatePortalAparienciaDto,
    userId: string,
  ): Promise<PortalConfiguracionDocument> {
    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        update[`apariencia.${key}`] = value;
      }
    }
    update['ultimaModificacionPor'] = new Types.ObjectId(userId);

    const doc = await this.portalModel
      .findOneAndUpdate(
        { municipioId: new Types.ObjectId(municipioId) },
        { $set: update },
        { new: true, upsert: true },
      )
      .exec();

    this.logger.log(
      `Portal apariencia actualizada — municipio: ${municipioId}`,
    );
    return doc!;
  }

  async updateRedesSociales(
    municipioId: string,
    dto: UpdatePortalRedesSocialesDto,
    userId: string,
  ): Promise<PortalConfiguracionDocument> {
    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        update[`redesSociales.${key}`] = value;
      }
    }
    update['ultimaModificacionPor'] = new Types.ObjectId(userId);

    const doc = await this.portalModel
      .findOneAndUpdate(
        { municipioId: new Types.ObjectId(municipioId) },
        { $set: update },
        { new: true, upsert: true },
      )
      .exec();

    this.logger.log(
      `Portal redes sociales actualizadas — municipio: ${municipioId}`,
    );
    return doc!;
  }

  async updateFooter(
    municipioId: string,
    dto: UpdatePortalFooterDto,
    userId: string,
  ): Promise<PortalConfiguracionDocument> {
    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        update[`footer.${key}`] = value;
      }
    }
    update['ultimaModificacionPor'] = new Types.ObjectId(userId);

    const doc = await this.portalModel
      .findOneAndUpdate(
        { municipioId: new Types.ObjectId(municipioId) },
        { $set: update },
        { new: true, upsert: true },
      )
      .exec();

    this.logger.log(`Portal footer actualizado — municipio: ${municipioId}`);
    return doc!;
  }

  // ── Upload banner (Cloudinary) ───────────────────────────────────────────────

  /**
   * Sube el banner del portal a Cloudinary y actualiza la URL en la BD.
   * Carpeta: sagim/municipios/{slug}/banner
   */
  async uploadBanner(
    municipioId: string,
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ bannerUrl: string }> {
    const municipio = await this.municipioModel
      .findById(municipioId)
      .select('nombre')
      .lean();

    if (!municipio) {
      throw new NotFoundException('Municipio no encontrado');
    }

    const slug = this.toSlug((municipio as any).nombre);
    const result = await this.cloudinaryService.uploadImage(
      file,
      `sagim/municipios/${slug}/banner`,
    );
    const bannerUrl = result.secure_url;

    await this.portalModel
      .findOneAndUpdate(
        { municipioId: new Types.ObjectId(municipioId) },
        {
          $set: {
            'apariencia.bannerUrl': bannerUrl,
            ultimaModificacionPor: new Types.ObjectId(userId),
          },
        },
        { upsert: true },
      )
      .exec();

    this.logger.log(
      `Banner del portal subido — municipio: ${municipioId}, slug: ${slug}`,
    );
    return { bannerUrl };
  }

  // ── Avisos ───────────────────────────────────────────────────────────────────

  async getAvisos(municipioId: string): Promise<PortalAvisoDocument[]> {
    return this.avisoModel
      .find({ municipioId: new Types.ObjectId(municipioId) })
      .sort({ orden: 1, createdAt: -1 })
      .exec();
  }

  async createAviso(
    municipioId: string,
    dto: CreatePortalAvisoDto,
    userId: string,
  ): Promise<PortalAvisoDocument> {
    const vigenciaInicio = fecha.parsearFecha(
      dayjs(dto.vigenciaInicio).format('YYYY-MM-DD'),
    );
    const vigenciaFin = fecha.parsearFechaFin(
      dayjs(dto.vigenciaFin).format('YYYY-MM-DD'),
    );
    if (vigenciaFin <= vigenciaInicio) {
      throw new BadRequestException(
        'vigenciaFin debe ser posterior a vigenciaInicio',
      );
    }
    const aviso = new this.avisoModel({
      ...dto,
      vigenciaInicio,
      vigenciaFin,
      municipioId: new Types.ObjectId(municipioId),
      creadoPor: new Types.ObjectId(userId),
    });
    await aviso.save();
    this.logger.log(
      `Aviso creado — municipio: ${municipioId}, id: ${aviso._id}`,
    );
    return aviso;
  }

  async updateAviso(
    municipioId: string,
    avisoId: string,
    dto: UpdatePortalAvisoDto,
    userId: string,
  ): Promise<PortalAvisoDocument> {
    const aviso = await this.avisoModel
      .findOne({
        _id: new Types.ObjectId(avisoId),
        municipioId: new Types.ObjectId(municipioId),
      })
      .exec();
    if (!aviso) throw new NotFoundException('Aviso no encontrado');
    const updates: Record<string, unknown> = { ...dto };
    if (dto.vigenciaInicio) {
      updates.vigenciaInicio = fecha.parsearFecha(
        dayjs(dto.vigenciaInicio).format('YYYY-MM-DD'),
      );
    }
    if (dto.vigenciaFin) {
      updates.vigenciaFin = fecha.parsearFechaFin(
        dayjs(dto.vigenciaFin).format('YYYY-MM-DD'),
      );
    }
    const inicio: Date =
      (updates.vigenciaInicio as Date) ?? aviso.vigenciaInicio;
    const fin: Date = (updates.vigenciaFin as Date) ?? aviso.vigenciaFin;
    if (fin <= inicio) {
      throw new BadRequestException(
        'vigenciaFin debe ser posterior a vigenciaInicio',
      );
    }
    Object.assign(aviso, updates);
    await aviso.save();
    this.logger.log(
      `Aviso actualizado — municipio: ${municipioId}, id: ${avisoId}`,
    );
    return aviso;
  }

  async deleteAviso(
    municipioId: string,
    avisoId: string,
  ): Promise<{ deleted: boolean }> {
    const aviso = await this.avisoModel
      .findOne({
        _id: new Types.ObjectId(avisoId),
        municipioId: new Types.ObjectId(municipioId),
      })
      .exec();
    if (!aviso) throw new NotFoundException('Aviso no encontrado');
    await aviso.deleteOne();
    this.logger.log(
      `Aviso eliminado — municipio: ${municipioId}, id: ${avisoId}`,
    );
    return { deleted: true };
  }

  async uploadImagenAviso(
    municipioId: string,
    avisoId: string,
    file: Express.Multer.File,
  ): Promise<{ imagenUrl: string }> {
    const aviso = await this.avisoModel
      .findOne({
        _id: new Types.ObjectId(avisoId),
        municipioId: new Types.ObjectId(municipioId),
      })
      .exec();
    if (!aviso) throw new NotFoundException('Aviso no encontrado');

    const municipio = await this.municipioModel
      .findById(municipioId)
      .select('nombre')
      .lean();
    const slug = this.toSlug((municipio as any)?.nombre ?? municipioId);

    const result = await this.cloudinaryService.uploadImage(
      file,
      `sagim/municipios/${slug}/avisos`,
    );
    const imagenUrl = result.secure_url;

    aviso.imagenUrl = imagenUrl;
    await aviso.save();

    this.logger.log(
      `Imagen de aviso subida — municipio: ${municipioId}, aviso: ${avisoId}`,
    );
    return { imagenUrl };
  }

  private toSlug(nombre: string): string {
    return nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
}
