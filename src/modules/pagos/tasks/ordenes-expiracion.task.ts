import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import {
  OrdenPago,
  OrdenPagoDocument,
  OrdenPagoStatus,
} from '../schemas/orden-pago.schema';

@Injectable()
export class OrdenesExpiracionTask {
  private readonly logger = new Logger(OrdenesExpiracionTask.name);

  constructor(
    @InjectModel(OrdenPago.name)
    private readonly ordenPagoModel: Model<OrdenPagoDocument>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async marcarOrdenesExpiradas(): Promise<void> {
    const result = await this.ordenPagoModel.updateMany(
      {
        estado: OrdenPagoStatus.PENDIENTE,
        expiresAt: { $lt: new Date() },
      },
      { $set: { estado: OrdenPagoStatus.EXPIRADA } },
    );

    if (result.modifiedCount > 0) {
      this.logger.log(
        `${result.modifiedCount} orden(es) marcada(s) como EXPIRADA`,
      );
    }
  }
}
