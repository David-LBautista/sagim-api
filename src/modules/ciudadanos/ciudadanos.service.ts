import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as XLSX from 'xlsx';
import { Ciudadano, CiudadanoDocument } from './schemas/ciudadano.schema';
import { CreateCiudadanoDto, UpdateCiudadanoDto } from './dto';

@Injectable()
export class CiudadanosService {
  constructor(
    @InjectModel(Ciudadano.name)
    private ciudadanoModel: Model<CiudadanoDocument>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  // ─────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────

  async create(
    createCiudadanoDto: CreateCiudadanoDto,
    municipioId: string,
  ): Promise<CiudadanoDocument> {
    const existingCiudadano = await this.ciudadanoModel.findOne({
      curp: createCiudadanoDto.curp.toUpperCase(),
      municipioId,
    });

    if (existingCiudadano) {
      throw new ConflictException(
        `Ya existe un ciudadano con el CURP ${createCiudadanoDto.curp} en este municipio`,
      );
    }

    const ciudadano = await this.ciudadanoModel.create({
      ...createCiudadanoDto,
      curp: createCiudadanoDto.curp.toUpperCase(),
      municipioId,
    });

    this.logger.log(
      `Ciudadano creado: ${ciudadano.nombre} ${ciudadano.apellidoPaterno} (${ciudadano.curp})`,
      'CiudadanosService',
    );

    return ciudadano;
  }

  // ─────────────────────────────────────────────────────
  // FIND ALL — paginado con filtros
  // ─────────────────────────────────────────────────────

  async findAll(
    scope: any,
    opts: {
      page?: number;
      limit?: number;
      busqueda?: string;
      localidad?: string;
      activo?: string;
    } = {},
  ): Promise<{
    data: CiudadanoDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { ...scope };

    if (opts.activo !== undefined) {
      filter.activo = opts.activo === 'true' || opts.activo === '1';
    }

    if (opts.localidad) {
      filter['direccion.localidad'] = {
        $regex: opts.localidad,
        $options: 'i',
      };
    }

    if (opts.busqueda) {
      const q = opts.busqueda.trim();
      filter.$or = [
        { curp: q.toUpperCase() },
        { nombre: { $regex: q, $options: 'i' } },
        { apellidoPaterno: { $regex: q, $options: 'i' } },
        { apellidoMaterno: { $regex: q, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.ciudadanoModel
        .find(filter)
        .sort({ apellidoPaterno: 1, nombre: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.ciudadanoModel.countDocuments(filter),
    ]);

    return {
      data: data as unknown as CiudadanoDocument[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────────────
  // FIND ONE / BUSCAR / BY CURP
  // ─────────────────────────────────────────────────────

  /**
   * Verifica si existe un ciudadano por CURP sin lanzar excepción.
   * Usado por el flujo del dialog de beneficiarios para pre-rellenar campos.
   */
  async verificarCurp(
    curp: string,
    scope: any,
  ): Promise<{ existe: boolean; ciudadano: CiudadanoDocument | null }> {
    const ciudadano = await this.ciudadanoModel
      .findOne({ curp: curp.toUpperCase(), ...scope })
      .lean();
    return {
      existe: !!ciudadano,
      ciudadano: (ciudadano as unknown as CiudadanoDocument) ?? null,
    };
  }

  async findByCurp(curp: string, scope: any): Promise<CiudadanoDocument> {
    const ciudadano = await this.ciudadanoModel
      .findOne({ curp: curp.toUpperCase(), ...scope })
      .lean();

    if (!ciudadano) {
      throw new NotFoundException(
        `No se encontró un ciudadano con el CURP ${curp}`,
      );
    }

    return ciudadano as unknown as CiudadanoDocument;
  }

  async buscar(busqueda: string, scope: any): Promise<CiudadanoDocument[]> {
    const q = busqueda.trim();
    if (!q) return [];

    const results = await this.ciudadanoModel
      .find({
        ...scope,
        activo: true,
        $or: [
          { curp: q.toUpperCase() },
          { nombre: { $regex: q, $options: 'i' } },
          { apellidoPaterno: { $regex: q, $options: 'i' } },
          { apellidoMaterno: { $regex: q, $options: 'i' } },
        ],
      })
      .select('_id curp nombre apellidoPaterno apellidoMaterno telefono email')
      .limit(15)
      .lean();

    return results as unknown as CiudadanoDocument[];
  }

  async findOne(id: string, scope: any): Promise<CiudadanoDocument> {
    const ciudadano = await this.ciudadanoModel
      .findOne({ _id: id, ...scope })
      .lean();

    if (!ciudadano) throw new NotFoundException('Ciudadano no encontrado');

    return ciudadano as unknown as CiudadanoDocument;
  }

  // ─────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateCiudadanoDto,
    scope: any,
  ): Promise<CiudadanoDocument> {
    const ciudadano = await this.ciudadanoModel.findOne({ _id: id, ...scope });
    if (!ciudadano) throw new NotFoundException('Ciudadano no encontrado');

    const updated = await this.ciudadanoModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .lean();

    this.logger.log(
      `Ciudadano actualizado: ${ciudadano.curp}`,
      'CiudadanosService',
    );

    return updated as unknown as CiudadanoDocument;
  }

  // ─────────────────────────────────────────────────────
  // DESACTIVAR
  // ─────────────────────────────────────────────────────

  async desactivar(id: string, scope: any): Promise<{ message: string }> {
    const ciudadano = await this.ciudadanoModel.findOne({ _id: id, ...scope });
    if (!ciudadano) throw new NotFoundException('Ciudadano no encontrado');

    await this.ciudadanoModel.findByIdAndUpdate(id, {
      $set: { activo: false },
    });

    this.logger.log(
      `Ciudadano desactivado: ${ciudadano.curp}`,
      'CiudadanosService',
    );

    return { message: 'Ciudadano desactivado correctamente' };
  }

  // ─────────────────────────────────────────────────────
  // ESTADÍSTICAS
  // ─────────────────────────────────────────────────────

  async estadisticas(scope: any): Promise<{
    total: number;
    conEmail: number;
    registradosEsteMes: number;
  }> {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const [total, conEmail, registradosEsteMes] = await Promise.all([
      this.ciudadanoModel.countDocuments({ ...scope, activo: true }),
      this.ciudadanoModel.countDocuments({
        ...scope,
        activo: true,
        email: { $exists: true, $nin: [null, ''] },
      }),
      this.ciudadanoModel.countDocuments({
        ...scope,
        activo: true,
        createdAt: { $gte: inicioMes },
      }),
    ]);

    return { total, conEmail, registradosEsteMes };
  }

  // ─────────────────────────────────────────────────────
  // IMPORTAR desde Excel/CSV
  // ─────────────────────────────────────────────────────

  async importar(
    municipioId: string,
    buffer: Buffer,
    mapeo: Record<string, string>,
    accionDuplicados: 'ignorar' | 'actualizar' = 'ignorar',
  ): Promise<{
    importados: number;
    actualizados: number;
    ignorados: number;
    errores: number;
    detalleErrores: { fila: number; nombre: string; error: string }[];
  }> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const filas: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
    });

    let importados = 0;
    let actualizados = 0;
    let ignorados = 0;
    const detalleErrores: { fila: number; nombre: string; error: string }[] =
      [];

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i];
      const filaNum = i + 2; // +2 por encabezado (fila 1) y base-1

      try {
        // Mapear columnas del Excel al modelo
        const curpRaw = String(fila[mapeo['curp'] ?? 'curp'] ?? '').trim();
        const nombre = String(fila[mapeo['nombre'] ?? 'nombre'] ?? '').trim();
        const apellidoPaterno = String(
          fila[mapeo['apellidoPaterno'] ?? 'apellidoPaterno'] ?? '',
        ).trim();
        const apellidoMaterno = String(
          fila[mapeo['apellidoMaterno'] ?? 'apellidoMaterno'] ?? '',
        ).trim();

        if (!curpRaw || !nombre || !apellidoPaterno || !apellidoMaterno) {
          const nombreDisplay =
            `${nombre} ${apellidoPaterno}`.trim() || `Fila ${filaNum}`;
          detalleErrores.push({
            fila: filaNum,
            nombre: nombreDisplay,
            error: 'Campos requeridos faltantes (curp, nombre, apellidos)',
          });
          continue;
        }

        const curp = curpRaw.toUpperCase();
        const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/;
        if (!curpRegex.test(curp)) {
          detalleErrores.push({
            fila: filaNum,
            nombre: `${nombre} ${apellidoPaterno}`.trim(),
            error: `CURP inválida: ${curp}`,
          });
          continue;
        }

        // Campos opcionales — con validación de formato
        const telefono = String(fila[mapeo['telefono'] ?? 'telefono'] ?? '')
          .replace(/\s+/g, '')
          .trim();
        const email = String(fila[mapeo['email'] ?? 'email'] ?? '')
          .trim()
          .toLowerCase();
        const fechaNacRaw = fila[mapeo['fechaNacimiento'] ?? 'fechaNacimiento'];

        const nombreDisplay = `${nombre} ${apellidoPaterno}`.trim();

        if (telefono && !/^\d{10}$/.test(telefono)) {
          detalleErrores.push({
            fila: filaNum,
            nombre: nombreDisplay,
            error: `Teléfono inválido: "${telefono}" (debe tener exactamente 10 dígitos)`,
          });
          continue;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (email && !emailRegex.test(email)) {
          detalleErrores.push({
            fila: filaNum,
            nombre: nombreDisplay,
            error: `Email inválido: "${email}"`,
          });
          continue;
        }

        // Dirección
        const localidad = String(
          fila[mapeo['localidad'] ?? 'localidad'] ?? '',
        ).trim();
        const colonia = String(
          fila[mapeo['colonia'] ?? 'colonia'] ?? '',
        ).trim();
        const calle = String(fila[mapeo['calle'] ?? 'calle'] ?? '').trim();
        const numero = String(fila[mapeo['numero'] ?? 'numero'] ?? '').trim();
        const codigoPostal = String(
          fila[mapeo['codigoPostal'] ?? 'codigoPostal'] ?? '',
        ).trim();

        const docData: Record<string, any> = {
          curp,
          nombre,
          apellidoPaterno,
          apellidoMaterno,
          municipioId: new Types.ObjectId(municipioId),
          activo: true,
        };

        if (telefono) docData.telefono = telefono;
        if (email) docData.email = email;
        if (fechaNacRaw) {
          const fecha = new Date(fechaNacRaw);
          if (!isNaN(fecha.getTime())) docData.fechaNacimiento = fecha;
        }
        if (localidad || colonia || calle || numero || codigoPostal) {
          docData.direccion = {
            localidad,
            colonia,
            calle,
            numero,
            codigoPostal,
          };
        }

        const existente = await this.ciudadanoModel.findOne({
          curp,
          municipioId,
        });

        if (existente) {
          if (accionDuplicados === 'actualizar') {
            await this.ciudadanoModel.findByIdAndUpdate(existente._id, {
              $set: docData,
            });
            actualizados++;
          } else {
            ignorados++;
          }
        } else {
          await this.ciudadanoModel.create(docData);
          importados++;
        }
      } catch (err: any) {
        detalleErrores.push({
          fila: filaNum,
          nombre: `Fila ${filaNum}`,
          error: err?.message ?? 'Error desconocido',
        });
      }
    }

    this.logger.log(
      `Importación ciudadanos municipio ${municipioId}: ` +
        `${importados} nuevos, ${actualizados} actualizados, ` +
        `${ignorados} ignorados, ${detalleErrores.length} errores`,
      'CiudadanosService',
    );

    return {
      importados,
      actualizados,
      ignorados,
      errores: detalleErrores.length,
      detalleErrores,
    };
  }

  // ─────────────────────────────────────────────────────
  // EXPORTAR a Excel
  // ─────────────────────────────────────────────────────

  async exportar(
    scope: any,
    busqueda?: string,
    localidad?: string,
    activo?: string,
  ): Promise<Buffer> {
    const soloActivos = activo === 'false' ? false : true;
    const filter: Record<string, any> = { ...scope, activo: soloActivos };

    if (busqueda) {
      const q = busqueda.trim();
      filter.$or = [
        { curp: q.toUpperCase() },
        { nombre: { $regex: q, $options: 'i' } },
        { apellidoPaterno: { $regex: q, $options: 'i' } },
        { apellidoMaterno: { $regex: q, $options: 'i' } },
      ];
    }

    if (localidad) {
      filter['direccion.localidad'] = {
        $regex: localidad.trim(),
        $options: 'i',
      };
    }

    const ciudadanos = await this.ciudadanoModel
      .find(filter)
      .sort({ apellidoPaterno: 1, nombre: 1 })
      .lean();

    const filas = ciudadanos.map((c: any) => ({
      CURP: c.curp,
      Nombre: c.nombre,
      'Apellido Paterno': c.apellidoPaterno,
      'Apellido Materno': c.apellidoMaterno,
      'Fecha Nacimiento': c.fechaNacimiento
        ? new Date(c.fechaNacimiento).toISOString().split('T')[0]
        : '',
      Teléfono: c.telefono ?? '',
      Email: c.email ?? '',
      Localidad: c.direccion?.localidad ?? '',
      Colonia: c.direccion?.colonia ?? '',
      Calle: c.direccion?.calle ?? '',
      Número: c.direccion?.numero ?? '',
      CP: c.direccion?.codigoPostal ?? '',
      'Fecha Registro': new Date(c.createdAt).toISOString().split('T')[0],
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filas);
    XLSX.utils.book_append_sheet(wb, ws, 'Padrón Ciudadanos');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
