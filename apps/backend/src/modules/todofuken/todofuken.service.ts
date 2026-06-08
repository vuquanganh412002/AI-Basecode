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

  /** API ACSMS-API-COMMON-001 — return all prefectures ordered by code. */
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
