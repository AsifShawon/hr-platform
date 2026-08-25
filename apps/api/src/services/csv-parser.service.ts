/**
 * RFC 4180 Compliant CSV Parser & Serializer with Formula Injection Defense
 */

export interface ParsedCsvRow {
  rowNumber: number; // 1-indexed (data rows start at 2 if header at 1)
  data: Record<string, string>;
  rawValues: string[];
}

export interface CsvParseResult {
  headers: string[];
  rows: ParsedCsvRow[];
  detectedDelimiter: string;
  detectedEncoding: string;
  totalLines: number;
}

export class CsvParseError extends Error {
  public rowNumber?: number;
  public column?: string;

  constructor(message: string, options?: { rowNumber?: number; column?: string }) {
    super(message);
    this.name = 'CsvParseError';
    this.rowNumber = options?.rowNumber;
    this.column = options?.column;
  }
}

/**
 * Detect delimiter by scanning header line candidates
 */
export function detectDelimiter(content: string): string {
  const firstLine = content.split(/\r\n|\n|\r/)[0] || '';
  const delimiters = [',', ';', '\t', '|'];
  let bestDelimiter = ',';
  let maxCount = -1;

  for (const d of delimiters) {
    // Count occurrences outside quotes
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < firstLine.length; i++) {
      if (firstLine[i] === '"') {
        inQuotes = !inQuotes;
      } else if (firstLine[i] === d && !inQuotes) {
        count++;
      }
    }
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = d;
    }
  }

  return bestDelimiter;
}

/**
 * Detect encoding and strip UTF-8 BOM if present
 */
export function normalizeCsvContent(bufferOrString: Buffer | string): {
  content: string;
  encoding: string;
} {
  let content: string;
  let encoding = 'UTF-8';

  if (Buffer.isBuffer(bufferOrString)) {
    // Check for UTF-8 BOM (0xEF, 0xBB, 0xBF)
    if (
      bufferOrString.length >= 3 &&
      bufferOrString[0] === 0xef &&
      bufferOrString[1] === 0xbb &&
      bufferOrString[2] === 0xbf
    ) {
      content = bufferOrString.subarray(3).toString('utf8');
      encoding = 'UTF-8 with BOM';
    } else {
      content = bufferOrString.toString('utf8');
    }
  } else {
    // String input: check for \uFEFF
    if (bufferOrString.charCodeAt(0) === 0xfeff) {
      content = bufferOrString.slice(1);
      encoding = 'UTF-8 with BOM';
    } else {
      content = bufferOrString;
    }
  }

  return { content, encoding };
}

/**
 * Formula Injection (CSV Injection) Sanitizer:
 * Prepend single quote (') to cells starting with =, @, \t, \r, %, or + / - when followed by non-numeric characters.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);
  if (str.length === 0) return '';

  const firstChar = str[0];

  // Dangerous spreadsheet formula triggers
  if (
    firstChar === '=' ||
    firstChar === '@' ||
    firstChar === '\t' ||
    firstChar === '\r' ||
    firstChar === '%'
  ) {
    return `'${str}`;
  }

  // + and - are dangerous if followed by commands or non-numbers (e.g. +cmd| or -2+3+cmd)
  if (firstChar === '+' || firstChar === '-') {
    // If it's a standard signed number like -15, -15.5, +8801700000000 (digits only after +), it's safe
    const rest = str.slice(1).trim();
    const isPureNumber = /^\d+(\.\d+)?$/.test(rest);
    if (!isPureNumber) {
      return `'${str}`;
    }
  }

  return str;
}

/**
 * Strip CSV injection single quote prefix during import so domain data remains clean
 */
export function desanitizeCsvCell(value: string): string {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();

  // If value starts with ' and the second character is a formula character, remove the escaping quote
  if (trimmed.startsWith("'") && trimmed.length > 1) {
    const secondChar = trimmed[1];
    if (
      secondChar === '=' ||
      secondChar === '@' ||
      secondChar === '+' ||
      secondChar === '-' ||
      secondChar === '\t' ||
      secondChar === '\r' ||
      secondChar === '%'
    ) {
      return trimmed.slice(1);
    }
  }

  return trimmed;
}

/**
 * RFC 4180 Compliant streaming/tokenizing parser
 */
export function parseCsv(
  rawContent: Buffer | string,
  options?: {
    delimiter?: string;
    maxRows?: number;
  },
): CsvParseResult {
  const { content, encoding } = normalizeCsvContent(rawContent);
  const delimiter = options?.delimiter || detectDelimiter(content);

  const rawRows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let lineNum = 1;

  let i = 0;
  const len = content.length;

  while (i < len) {
    const char = content[i];
    const nextChar = i + 1 < len ? content[i + 1] : '';

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentField += '"';
          i += 2;
          continue;
        } else {
          // End of quoted section
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        if (char === '\n') {
          lineNum++;
        }
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(desanitizeCsvCell(currentField));
        currentField = '';
        i++;
        continue;
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(desanitizeCsvCell(currentField));
        currentField = '';
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
          rawRows.push(currentRow);
        }
        currentRow = [];
        lineNum++;
        i += 2;
        if (options?.maxRows && rawRows.length >= options.maxRows) {
          break;
        }
        continue;
      } else if (char === '\n' || char === '\r') {
        currentRow.push(desanitizeCsvCell(currentField));
        currentField = '';
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
          rawRows.push(currentRow);
        }
        currentRow = [];
        lineNum++;
        i++;
        if (options?.maxRows && rawRows.length >= options.maxRows) {
          break;
        }
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Flush remaining field/row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(desanitizeCsvCell(currentField));
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
      rawRows.push(currentRow);
    }
  }

  if (rawRows.length === 0) {
    return {
      headers: [],
      rows: [],
      detectedDelimiter: delimiter,
      detectedEncoding: encoding,
      totalLines: lineNum,
    };
  }

  const rawHeaders = rawRows[0] || [];
  const headers = rawHeaders.map((h, idx) => h.trim() || `column_${idx + 1}`);

  const rows: ParsedCsvRow[] = [];
  for (let r = 1; r < rawRows.length; r++) {
    const rawValues = rawRows[r] || [];
    const data: Record<string, string> = {};

    for (let c = 0; c < headers.length; c++) {
      const headerName = headers[c] as string;
      data[headerName] = (rawValues[c] ?? '').trim();
    }

    rows.push({
      rowNumber: r + 1, // 1-indexed line in file
      data,
      rawValues,
    });
  }

  return {
    headers,
    rows,
    detectedDelimiter: delimiter,
    detectedEncoding: encoding,
    totalLines: lineNum,
  };
}

/**
 * RFC 4180 Compliant CSV Serializer with formula protection and UTF-8 quotation
 */
export function serializeCsv(
  rows: Array<Record<string, unknown>>,
  columns: Array<{ key: string; label: string } | string>,
  options?: {
    includeUtf8Bom?: boolean;
    delimiter?: string;
  },
): string {
  const delimiter = options?.delimiter || ',';
  const colSpecs = columns.map((c) =>
    typeof c === 'string' ? { key: c, label: c } : { key: c.key, label: c.label || c.key },
  );

  const escapeCell = (val: unknown): string => {
    const sanitized = sanitizeCsvCell(val);
    // Needs quotes if contains delimiter, double-quote, newline, or leading/trailing whitespace
    const needsQuotes =
      sanitized.includes(delimiter) ||
      sanitized.includes('"') ||
      sanitized.includes('\n') ||
      sanitized.includes('\r') ||
      sanitized.startsWith(' ') ||
      sanitized.endsWith(' ') ||
      sanitized.startsWith("'");

    if (needsQuotes) {
      return `"${sanitized.replace(/"/g, '""')}"`;
    }
    return sanitized;
  };

  const headerLine = colSpecs.map((c) => escapeCell(c.label)).join(delimiter);
  const dataLines: string[] = [];

  for (const row of rows) {
    const line = colSpecs
      .map((col) => {
        const val = row[col.key];
        return escapeCell(val);
      })
      .join(delimiter);
    dataLines.push(line);
  }

  const csvBody = [headerLine, ...dataLines].join('\r\n');
  return options?.includeUtf8Bom ? `\uFEFF${csvBody}` : csvBody;
}
