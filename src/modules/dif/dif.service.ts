import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import {
  Beneficiario,
  BeneficiarioDocument,
} from './schemas/beneficiario.schema';
import { Programa, ProgramaDocument } from './schemas/programa.schema';
import { Apoyo, ApoyoDocument } from './schemas/apoyo.schema';
import { Inventario, InventarioDocument } from './schemas/inventario.schema';
import {
  MovimientoInventario,
  MovimientoInventarioDocument,
  TipoMovimiento,
} from './schemas/movimiento-inventario.schema';
import {
  CreateBeneficiarioDto,
  UpdateBeneficiarioDto,
  CreateProgramaDto,
  CreateApoyoDto,
  CreateEntradaInventarioDto,
} from './dto';

@Injectable()
export class DifService {
  constructor(
    @InjectModel(Beneficiario.name)
    private beneficiarioModel: Model<BeneficiarioDocument>,
    @InjectModel(Programa.name)
    private programaModel: Model<ProgramaDocument>,
    @InjectModel(Apoyo.name)
    private apoyoModel: Model<ApoyoDocument>,
    @InjectModel(Inventario.name)
    private inventarioModel: Model<InventarioDocument>,
    @InjectModel(MovimientoInventario.name)
    private movimientoInventarioModel: Model<MovimientoInventarioDocument>,
  ) {}

  // ==================== BENEFICIARIOS ====================
  async createBeneficiario(
    createBeneficiarioDto: CreateBeneficiarioDto,
    municipioId: string,
  ): Promise<Beneficiario> {
    // Validar que no exista el beneficiario con el mismo CURP en el municipio
    const existente = await this.beneficiarioModel.findOne({
      curp: createBeneficiarioDto.curp,
      municipioId: new Types.ObjectId(municipioId),
    });

    if (existente) {
      throw new ConflictException(
        'El beneficiario ya está registrado en este municipio',
      );
    }

    const beneficiario = new this.beneficiarioModel({
      ...createBeneficiarioDto,
      municipioId: new Types.ObjectId(municipioId),
      fechaRegistro: new Date(),
    });

    return beneficiario.save();
  }

  async findBeneficiarios(
    scope: any,
    curp?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Beneficiario[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query: any = {
      ...scope,
      activo: true,
    };

    if (curp) {
      query.curp = { $regex: curp.toUpperCase(), $options: 'i' };
    }

    const total = await this.beneficiarioModel.countDocuments(query).exec();
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const data = await this.beneficiarioModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findBeneficiarioByCurp(
    curp: string,
    scope: any,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    const beneficiario = await this.beneficiarioModel
      .findOne({
        curp: curp.toUpperCase(),
        ...scope,
        activo: true,
      })
      .lean()
      .exec();

    if (!beneficiario) {
      throw new NotFoundException(
        `Beneficiario con CURP ${curp} no encontrado`,
      );
    }

    // Contar total de apoyos
    const totalApoyos = await this.apoyoModel
      .countDocuments({
        beneficiarioId: beneficiario._id,
      })
      .exec();

    // Obtener apoyos paginados
    const skip = (page - 1) * limit;
    const apoyos = await this.apoyoModel
      .find({
        beneficiarioId: beneficiario._id,
      })
      .populate('programaId', 'nombre descripcion')
      .populate('entregadoPor', 'nombre email')
      .sort({ fecha: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    // Obtener programas únicos en los que está inscrito (todos, sin paginar)
    const todosLosApoyos = await this.apoyoModel
      .find({
        beneficiarioId: beneficiario._id,
      })
      .select('programaId')
      .lean()
      .exec();

    const programasIds = [
      ...new Set(todosLosApoyos.map((a) => a.programaId.toString())),
    ];
    const programas = await this.programaModel
      .find({
        _id: { $in: programasIds },
      })
      .lean()
      .exec();

    return {
      ...beneficiario,
      historialApoyos: {
        data: apoyos,
        total: totalApoyos,
        page,
        limit,
        totalPages: Math.ceil(totalApoyos / limit),
      },
      programasActivos: programas,
      totalApoyos,
      ultimoApoyo: apoyos[0] || null,
    };
  }

  async findBeneficiarioById(id: string, scope: any): Promise<Beneficiario> {
    const beneficiario = await this.beneficiarioModel
      .findOne({
        _id: new Types.ObjectId(id),
        ...scope,
      })
      .exec();

    if (!beneficiario) {
      throw new NotFoundException(`Beneficiario con ID ${id} no encontrado`);
    }

    return beneficiario;
  }

  async updateBeneficiario(
    id: string,
    updateBeneficiarioDto: UpdateBeneficiarioDto,
    municipioId: string,
  ): Promise<Beneficiario> {
    // Validar que el beneficiario existe
    const beneficiario = await this.findBeneficiarioById(id, municipioId);

    // Si se está actualizando el CURP, validar que no exista otro beneficiario con ese CURP
    if (
      updateBeneficiarioDto.curp &&
      updateBeneficiarioDto.curp !== beneficiario.curp
    ) {
      const existente = await this.beneficiarioModel.findOne({
        curp: updateBeneficiarioDto.curp,
        municipioId: new Types.ObjectId(municipioId),
        _id: { $ne: new Types.ObjectId(id) },
      });

      if (existente) {
        throw new ConflictException(
          'Ya existe otro beneficiario con ese CURP en este municipio',
        );
      }
    }

    // Actualizar beneficiario
    const beneficiarioActualizado = await this.beneficiarioModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          municipioId: new Types.ObjectId(municipioId),
        },
        { $set: updateBeneficiarioDto },
        { new: true },
      )
      .exec();

    return beneficiarioActualizado;
  }

  // ==================== PROGRAMAS ====================
  async createPrograma(
    createProgramaDto: CreateProgramaDto,
    municipioId: string,
  ): Promise<Programa> {
    const programa = new this.programaModel({
      ...createProgramaDto,
      municipioId: new Types.ObjectId(municipioId),
    });

    return programa.save();
  }

  async findProgramas(scope: any): Promise<Programa[]> {
    return this.programaModel
      .find({
        ...scope,
        activo: true,
      })
      .sort({ nombre: 1 })
      .exec();
  }

  async findProgramaById(id: string, scope: any): Promise<Programa> {
    const programa = await this.programaModel
      .findOne({
        _id: new Types.ObjectId(id),
        ...scope,
      })
      .exec();

    if (!programa) {
      throw new NotFoundException(`Programa con ID ${id} no encontrado`);
    }

    return programa;
  }

  // ==================== APOYOS ====================
  async createApoyo(
    createApoyoDto: CreateApoyoDto,
    municipioId: string,
    userId: string,
  ): Promise<any> {
    // Validar que el beneficiario existe
    await this.findBeneficiarioById(createApoyoDto.beneficiarioId, municipioId);

    // Validar que el programa existe
    await this.findProgramaById(createApoyoDto.programaId, municipioId);

    const cantidad = createApoyoDto.cantidad || 1;

    // Validar inventario disponible
    const inventario = await this.inventarioModel.findOne({
      programaId: new Types.ObjectId(createApoyoDto.programaId),
      tipo: createApoyoDto.tipo,
      municipioId: new Types.ObjectId(municipioId),
    });

    if (!inventario) {
      throw new BadRequestException(
        `No hay inventario registrado para ${createApoyoDto.tipo} en este programa`,
      );
    }

    if (inventario.stockActual < cantidad) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${inventario.stockActual}, Solicitado: ${cantidad}`,
      );
    }

    // Contar apoyos previos del beneficiario
    const apoyosPrevios = await this.apoyoModel.countDocuments({
      beneficiarioId: new Types.ObjectId(createApoyoDto.beneficiarioId),
      municipioId: new Types.ObjectId(municipioId),
    });

    const apoyo = new this.apoyoModel({
      ...createApoyoDto,
      cantidad,
      municipioId: new Types.ObjectId(municipioId),
      beneficiarioId: new Types.ObjectId(createApoyoDto.beneficiarioId),
      programaId: new Types.ObjectId(createApoyoDto.programaId),
      entregadoPor: new Types.ObjectId(userId),
      fecha: startOfDay(parseISO(createApoyoDto.fecha)),
      // El folio se genera automáticamente en el pre-save hook del schema
    });

    await apoyo.save();

    // Descontar del inventario
    const stockAnterior = inventario.stockActual;
    inventario.stockActual -= cantidad;
    await inventario.save();

    // Registrar movimiento de salida
    const movimiento = new this.movimientoInventarioModel({
      municipioId: new Types.ObjectId(municipioId),
      programaId: new Types.ObjectId(createApoyoDto.programaId),
      inventarioId: inventario._id,
      tipoMovimiento: TipoMovimiento.SALIDA,
      tipoRecurso: createApoyoDto.tipo,
      cantidad,
      stockAnterior,
      stockNuevo: inventario.stockActual,
      concepto: `Entrega de apoyo a beneficiario`,
      responsable: new Types.ObjectId(userId),
      fecha: startOfDay(parseISO(createApoyoDto.fecha)),
      apoyoId: apoyo._id,
    });

    await movimiento.save();

    // Retornar con populate completo
    const apoyoCompleto = await this.apoyoModel
      .findById(apoyo._id)
      .populate(
        'beneficiarioId',
        'nombre apellidoPaterno apellidoMaterno curp grupoVulnerable',
      )
      .populate('programaId', 'nombre descripcion')
      .populate('entregadoPor', 'nombre email rol')
      .lean()
      .exec();

    return {
      ...apoyoCompleto,
      totalApoyosEntregados: apoyosPrevios + 1,
    };
  }

  async findApoyos(
    scope: any,
    curp?: string,
    programaId?: string,
    from?: string,
    to?: string,
  ): Promise<Apoyo[]> {
    const query: any = { ...scope };

    if (curp) {
      const beneficiario = await this.beneficiarioModel.findOne({
        curp: curp.toUpperCase(),
        ...scope,
      });

      if (beneficiario) {
        query.beneficiarioId = beneficiario._id;
      } else {
        // Si no existe el beneficiario, retornar array vacío
        return [];
      }
    }

    if (programaId) {
      query.programaId = new Types.ObjectId(programaId);
    }

    if (from || to) {
      query.fecha = {};
      if (from) {
        query.fecha.$gte = startOfDay(parseISO(from));
      }
      if (to) {
        query.fecha.$lte = endOfDay(parseISO(to));
      }
    }

    return this.apoyoModel
      .find(query)
      .populate(
        'beneficiarioId',
        'nombre apellidoPaterno apellidoMaterno curp grupoVulnerable telefono',
      )
      .populate('programaId', 'nombre descripcion')
      .populate('entregadoPor', 'nombre email rol')
      .sort({ fecha: -1 })
      .exec();
  }

  async findApoyoById(id: string, scope: any): Promise<any> {
    const apoyo = await this.apoyoModel
      .findOne({
        _id: new Types.ObjectId(id),
        ...scope,
      })
      .populate(
        'beneficiarioId',
        'nombre apellidoPaterno apellidoMaterno curp grupoVulnerable telefono domicilio',
      )
      .populate('programaId', 'nombre descripcion observaciones')
      .populate('entregadoPor', 'nombre email rol')
      .lean()
      .exec();

    if (!apoyo) {
      throw new NotFoundException(`Apoyo con ID ${id} no encontrado`);
    }

    // Contar total de apoyos del beneficiario
    const totalApoyos = await this.apoyoModel.countDocuments({
      beneficiarioId: apoyo.beneficiarioId,
      ...scope,
    });

    return {
      ...apoyo,
      totalApoyosDelBeneficiario: totalApoyos,
    };
  }

  // ==================== INVENTARIO ====================

  /**
   * Registrar entrada de inventario
   */
  async registrarEntrada(
    createEntradaDto: CreateEntradaInventarioDto,
    municipioId: string,
    userId: string,
  ): Promise<any> {
    // Validar que el programa existe
    await this.findProgramaById(createEntradaDto.programaId, municipioId);

    // Buscar o crear inventario para este programa+tipo
    let inventario = await this.inventarioModel.findOne({
      programaId: new Types.ObjectId(createEntradaDto.programaId),
      tipo: createEntradaDto.tipo,
      municipioId: new Types.ObjectId(municipioId),
    });

    const stockAnterior = inventario?.stockActual || 0;
    const stockNuevo = stockAnterior + createEntradaDto.cantidad;

    if (!inventario) {
      // Crear inventario nuevo
      inventario = new this.inventarioModel({
        municipioId: new Types.ObjectId(municipioId),
        programaId: new Types.ObjectId(createEntradaDto.programaId),
        tipo: createEntradaDto.tipo,
        stockActual: createEntradaDto.cantidad,
        stockInicial: createEntradaDto.cantidad,
        unidadMedida: 'piezas',
        alertaMinima: 50,
        valorUnitario: createEntradaDto.valorUnitario,
      });
      await inventario.save();
    } else {
      // Actualizar inventario existente
      inventario.stockActual = stockNuevo;
      if (createEntradaDto.valorUnitario) {
        inventario.valorUnitario = createEntradaDto.valorUnitario;
      }
      await inventario.save();
    }

    // Crear movimiento
    const movimiento = new this.movimientoInventarioModel({
      municipioId: new Types.ObjectId(municipioId),
      programaId: new Types.ObjectId(createEntradaDto.programaId),
      inventarioId: inventario._id,
      tipoMovimiento: TipoMovimiento.ENTRADA,
      tipoRecurso: createEntradaDto.tipo,
      cantidad: createEntradaDto.cantidad,
      stockAnterior,
      stockNuevo,
      concepto: createEntradaDto.concepto,
      responsable: new Types.ObjectId(userId),
      fecha: new Date(createEntradaDto.fecha),
      comprobante: createEntradaDto.comprobante,
      observaciones: createEntradaDto.observaciones,
    });

    await movimiento.save();

    return {
      inventario: await this.inventarioModel
        .findById(inventario._id)
        .populate('programaId', 'nombre descripcion')
        .lean(),
      movimiento: await this.movimientoInventarioModel
        .findById(movimiento._id)
        .populate('responsable', 'nombre email')
        .lean(),
    };
  }

  /**
   * Consultar inventario
   */
  async getInventario(scope: any, programaId?: string): Promise<Inventario[]> {
    const query: any = { ...scope };

    if (programaId) {
      query.programaId = new Types.ObjectId(programaId);
    }

    return this.inventarioModel
      .find(query)
      .populate('programaId', 'nombre descripcion')
      .sort({ tipo: 1 })
      .exec();
  }

  /**
   * Consultar movimientos de inventario
   */
  async getMovimientos(
    scope: any,
    filters: {
      programaId?: string;
      tipoMovimiento?: TipoMovimiento;
      fechaDesde?: Date;
      fechaHasta?: Date;
    } = {},
  ): Promise<MovimientoInventario[]> {
    const query: any = { ...scope };

    if (filters.programaId) {
      query.programaId = new Types.ObjectId(filters.programaId);
    }
    if (filters.tipoMovimiento) {
      query.tipoMovimiento = filters.tipoMovimiento;
    }
    if (filters.fechaDesde || filters.fechaHasta) {
      query.fecha = {};
      if (filters.fechaDesde) query.fecha.$gte = filters.fechaDesde;
      if (filters.fechaHasta) query.fecha.$lte = filters.fechaHasta;
    }

    return this.movimientoInventarioModel
      .find(query)
      .populate('programaId', 'nombre descripcion')
      .populate('responsable', 'nombre email')
      .populate('apoyoId', 'folio beneficiarioId')
      .sort({ fecha: -1 })
      .limit(1000)
      .exec();
  }
}
