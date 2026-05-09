import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { MCode } from './entities/m-code.entity';

export interface CodeItem {
  value: number | string;
  label: string;
  label_short: string;
}

@Injectable()
export class CodeService implements OnModuleInit {
  private readonly logger = new Logger(CodeService.name);
  private cache = new Map<string, CodeItem[]>();

  constructor(
    @InjectRepository(MCode)
    private readonly repo: Repository<MCode>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    const rows = await this.repo.find({
      where: { deletedAt: IsNull() },
      order: { codeCategory: 'ASC', sortOrder: 'ASC', codeValue: 'ASC' },
    });

    const next = new Map<string, CodeItem[]>();
    for (const r of rows) {
      const list = next.get(r.codeCategory) ?? [];
      list.push({
        value: this.normalizeValue(r.codeValue),
        label: r.codeName,
        label_short: r.codeNameShort,
      });
      next.set(r.codeCategory, list);
    }
    this.cache = next;
    this.logger.log({
      event: 'code.cache.loaded',
      categories: this.cache.size,
      totalRows: rows.length,
    });
  }

  getAll(): Record<string, CodeItem[]> {
    return Object.fromEntries(this.cache);
  }

  getByCategory(category: string): CodeItem[] {
    return this.cache.get(category) ?? [];
  }

  has(category: string, value: number | string): boolean {
    const list = this.cache.get(category);
    if (!list) return false;
    return list.some((x) => x.value === value);
  }

  getLabel(category: string, value: number | string): string {
    return this.cache.get(category)?.find((x) => x.value === value)?.label ?? '';
  }

  private normalizeValue(codeValue: string): number | string {
    const asNumber = Number(codeValue);
    return Number.isInteger(asNumber) && String(asNumber) === codeValue ? asNumber : codeValue;
  }
}
