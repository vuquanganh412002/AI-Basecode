import { Injectable } from '@nestjs/common';
import { join } from 'node:path';
import PdfPrinterImport from 'pdfmake';
import type { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';

// pdfmake の node エントリ(src/printer.js)は PdfPrinter コンストラクタを module.exports
// するが @types/pdfmake は browser 版のみ型付け。untyped require を避けつつ型安全にするため
// default import を node コンストラクタとして再型付けする。
interface PdfKitDoc {
  on(event: 'data', cb: (chunk: Buffer) => void): void;
  on(event: 'end', cb: () => void): void;
  on(event: 'error', cb: (err: Error) => void): void;
  end(): void;
}
interface Printer {
  createPdfKitDocument(def: TDocumentDefinitions): PdfKitDoc;
}
const PdfPrinter = PdfPrinterImport as unknown as new (fonts: TFontDictionary) => Printer;

// フォントは nest-cli(nest-cli.json compilerOptions.assets)が dist/modules/report/assets へ
// コピーするため、__dirname は ts-node(src/) / ビルド(dist/) 両方で解決できる。
const FONT_FILE = join(__dirname, 'assets', 'ipaexg.ttf');
const FONTS: TFontDictionary = {
  // IPAexGothic は単一ウェイト — 全 variant を割当てて pdfmake の bold 指定を許容（実描画は通常）。
  IPAexGothic: {
    normal: FONT_FILE,
    bold: FONT_FILE,
    italics: FONT_FILE,
    bolditalics: FONT_FILE,
  },
};

/**
 * 日本語フォント(IPAexGothic)埋込の pdfmake によるサーバ側PDF生成。呼び出し側が
 * document definition（例: SCR-028 の buildZougenDocDefinition）を組み、本サービスが
 * Buffer へストリームする。ヘッドレスブラウザ不要。
 */
@Injectable()
export class PdfExportService {
  private readonly printer: Printer = new PdfPrinter(FONTS);

  /** pdfmake の document definition を PDF Buffer に描画する。 */
  async generatePdf(docDefinition: TDocumentDefinitions): Promise<Buffer> {
    const finalDoc: TDocumentDefinitions = {
      ...docDefinition,
      defaultStyle: {
        font: 'IPAexGothic',
        fontSize: 9,
        ...docDefinition.defaultStyle,
      },
    };
    const doc = this.printer.createPdfKitDocument(finalDoc);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }
}
