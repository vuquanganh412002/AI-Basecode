import { Injectable } from '@nestjs/common';
import { join } from 'node:path';
import PdfPrinterImport from 'pdfmake';
import type { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';

// pdfmake's node entry (src/printer.js) `module.exports` the PdfPrinter
// constructor, but @types/pdfmake only types the browser build — so we
// re-type the default import as the node constructor to keep the call site
// type-safe without an untyped `require`.
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

// Font assets are copied to dist/modules/report/assets by nest-cli
// (`compilerOptions.assets` in nest-cli.json), so __dirname resolves both
// under ts-node (src/) and the compiled build (dist/).
const FONT_FILE = join(__dirname, 'assets', 'ipaexg.ttf');
const FONTS: TFontDictionary = {
  // IPAexGothic ships a single weight — map every variant to it so pdfmake
  // accepts `bold` styling (rendered at regular weight).
  IPAexGothic: {
    normal: FONT_FILE,
    bold: FONT_FILE,
    italics: FONT_FILE,
    bolditalics: FONT_FILE,
  },
};

/**
 * Server-side PDF generation via pdfmake with an embedded Japanese font
 * (IPAexGothic). Callers build a pdfmake document definition (e.g.
 * `buildZougenDocDefinition` for ACSMS-SCR-028) and this service streams it
 * into a Buffer. No headless browser required.
 */
@Injectable()
export class PdfExportService {
  private readonly printer: Printer = new PdfPrinter(FONTS);

  /** Render a pdfmake document definition to a PDF Buffer. */
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
