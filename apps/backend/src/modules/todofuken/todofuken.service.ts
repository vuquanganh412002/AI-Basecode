import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Todofuken } from '@/database/entities/todofuken.entity';

export interface TodofukenListItem {
  todofuken_code: string;
  todofuken_name: string;
}

@Injectable()
export class TodofukenService {
  constructor(
    @InjectRepository(Todofuken)
    private readonly repo: Repository<Todofuken>,
  ) {}

  /** ACSMS-API-COMMON-001 — 全都道府県をコード順で返す。 */
  async list(): Promise<TodofukenListItem[]> {
    const rows = await this.repo.find({
      order: { todofukenCode: 'ASC' },
    });
    return rows.map((r) => ({
      todofuken_code: r.todofukenCode,
      todofuken_name: r.todofukenName,
    }));
  }
}
