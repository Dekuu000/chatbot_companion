declare module 'pdf-parse' {
  interface PDFInfo {
    PDFFormatVersion?: string
    IsAcroFormPresent?: boolean
    IsXFAPresent?: boolean
    Title?: string
    Author?: string
    Subject?: string
    Keywords?: string
    Creator?: string
    Producer?: string
    CreationDate?: string
    ModDate?: string
    Trapped?: string
  }

  interface PDFMetadata {
    info?: PDFInfo
    metadata?: any
    [key: string]: any
  }

  interface PDFData {
    numpages: number
    numrender: number
    info?: PDFInfo
    metadata?: PDFMetadata
    text: string
    version?: string
  }

  function pdfParse(
    data: Buffer | Uint8Array,
    options?: {
      max?: number
      version?: string
    }
  ): Promise<PDFData>

  export = pdfParse
}

