import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FileDownload } from '@/database/entities/file-download.entity';
import { Ja } from '@/database/entities/ja.entity';
import { StorageModule } from '@/modules/storage/storage.module';

import { FileArchiveService } from './file-archive.service';

@Module({
  // FileDownload / Ja — 帳票の S3 アーカイブ（FileArchiveService）。t_file_download
  // に登録し SCR-022 ダウンロード画面の対象とする。帳票・配達手数料・口座振替など
  // 複数モジュールから共通利用するため、独立した中立モジュールとして提供する。
  imports: [TypeOrmModule.forFeature([FileDownload, Ja]), StorageModule],
  providers: [FileArchiveService],
  exports: [FileArchiveService],
})
export class FileArchiveModule {}
