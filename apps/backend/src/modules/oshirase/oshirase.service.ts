import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Oshirase } from '@/database/entities/oshirase.entity';
import {
  PublicOshiraseItemDto,
  PublicOshiraseQueryDto,
} from './dto/public-oshirase-query.dto';

const TYPE_LABEL: Record<number, string> = {
  1: 'システム',
  2: '重要',
  3: '一般',
};

@Injectable()
export class OshiraseService {
  constructor(
    @InjectRepository(Oshirase) private readonly repo: Repository<Oshirase>,
  ) {}

  async findPublic(query: PublicOshiraseQueryDto): Promise<PublicOshiraseItemDto[]> {
    const publishLocation = query.publish_location ?? 1;
    const limit = Math.min(query.limit ?? 10, 10);
    const now = new Date();

    const rows = await this.repo
      .createQueryBuilder('o')
      .where('o.publish_location = :publishLocation', { publishLocation })
      .andWhere('o.status = 2')
      .andWhere('o.publish_start_date <= :now', { now })
      .andWhere('(o.publish_end_date IS NULL OR o.publish_end_date >= :now)', { now })
      .andWhere('o.ja_id IS NULL')
      .andWhere({ deletedAt: IsNull() })
      .orderBy('o.publish_start_date', 'DESC')
      .take(limit)
      .getMany();

    return rows.map((r) => ({
      oshirase_id: Number(r.oshiraseId),
      oshirase_type: r.oshiraseType,
      oshirase_type_label: TYPE_LABEL[r.oshiraseType] ?? '',
      title: r.title,
      publish_start_date: r.publishStartDate.toISOString().slice(0, 10),
    }));
  }
}
