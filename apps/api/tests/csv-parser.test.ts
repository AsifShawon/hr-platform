import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  serializeCsv,
  detectDelimiter,
  normalizeCsvContent,
  sanitizeCsvCell,
  desanitizeCsvCell,
} from '../src/services/csv-parser.service.js';

describe('Phase 9: CSV Parser, Serializer & Formula Injection Defense', () => {
  describe('RFC 4180 Parsing & Quotation', () => {
    it('parses standard comma-separated records with quotes, commas, and multi-line fields', () => {
      const csv = `employeeNumber,displayName,notes\r\nEMP-1001,"Ahmed, Tanvir","Line 1\nLine 2"\r\nEMP-1002,Nusrat Jahan,"Simple ""quoted"" word"`;
      const result = parseCsv(csv);

      expect(result.headers).toEqual(['employeeNumber', 'displayName', 'notes']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]?.data.employeeNumber).toBe('EMP-1001');
      expect(result.rows[0]?.data.displayName).toBe('Ahmed, Tanvir');
      expect(result.rows[0]?.data.notes).toBe('Line 1\nLine 2');
      expect(result.rows[1]?.data.notes).toBe('Simple "quoted" word');
    });

    it('handles Bengali (বাংলা) Unicode script and mixed scripts flawlessly', () => {
      const csv = `employeeNumber,displayNameNative,jobTitle\nEMP-1001,তানভীর আহমেদ,প্রোডাকশন ম্যানেজার\nEMP-1002,নুসরাত জাহান,কিউসি স্পেশালিস্ট`;
      const result = parseCsv(csv);

      expect(result.rows[0]?.data.displayNameNative).toBe('তানভীর আহমেদ');
      expect(result.rows[0]?.data.jobTitle).toBe('প্রোডাকশন ম্যানেজার');
      expect(result.rows[1]?.data.displayNameNative).toBe('নুসরাত জাহান');
    });

    it('strips UTF-8 BOM automatically from start of file', () => {
      const bomBuffer = Buffer.from([
        0xef, 0xbb, 0xbf, 0x6e, 0x61, 0x6d, 0x65, 0x0a, 0x41, 0x6c, 0x69,
      ]);
      const normalized = normalizeCsvContent(bomBuffer);
      expect(normalized.encoding).toBe('UTF-8 with BOM');
      expect(normalized.content).toBe('name\nAli');

      const result = parseCsv(bomBuffer);
      expect(result.headers[0]).toBe('name');
      expect(result.rows[0]?.data.name).toBe('Ali');
    });

    it('auto-detects semicolon, tab, and pipe delimiters', () => {
      const semiCsv = 'employeeNumber;displayName;department\nEMP-1;Rahim;Cutting';
      expect(detectDelimiter(semiCsv)).toBe(';');
      const parsedSemi = parseCsv(semiCsv);
      expect(parsedSemi.headers).toEqual(['employeeNumber', 'displayName', 'department']);
      expect(parsedSemi.rows[0]?.data.displayName).toBe('Rahim');

      const tabCsv = 'employeeNumber\tdisplayName\tdepartment\nEMP-2\tKarim\tSewing';
      expect(detectDelimiter(tabCsv)).toBe('\t');
      const parsedTab = parseCsv(tabCsv);
      expect(parsedTab.rows[0]?.data.displayName).toBe('Karim');

      const pipeCsv = 'employeeNumber|displayName|department\nEMP-3|Salma|Finishing';
      expect(detectDelimiter(pipeCsv)).toBe('|');
      const parsedPipe = parseCsv(pipeCsv);
      expect(parsedPipe.rows[0]?.data.displayName).toBe('Salma');
    });
  });

  describe('Formula Injection (CSV Injection) Protection', () => {
    it('sanitizes cells starting with =, @, \\t, \\r, %, +, and - formula payloads', () => {
      expect(sanitizeCsvCell("=cmd|' /C calc'!A0")).toBe("'=cmd|' /C calc'!A0");
      expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
      expect(sanitizeCsvCell('%username%')).toBe("'%username%");
      expect(sanitizeCsvCell('\tmaliciousTab')).toBe("'\tmaliciousTab");
      expect(sanitizeCsvCell("-2+3+cmd|' /C calc'!A0")).toBe("'-2+3+cmd|' /C calc'!A0");
    });

    it('preserves legitimate numbers, negative values, and phone numbers without corrupting them', () => {
      expect(sanitizeCsvCell(-25)).toBe('-25');
      expect(sanitizeCsvCell('-25.50')).toBe('-25.50');
      expect(sanitizeCsvCell('+8801711000001')).toBe('+8801711000001');
      expect(sanitizeCsvCell('Normal Worker Name')).toBe('Normal Worker Name');
    });

    it('desanitizes escaped cells on import cleanly back to original domain string', () => {
      expect(desanitizeCsvCell("'=cmd|' /C calc'!A0")).toBe("=cmd|' /C calc'!A0");
      expect(desanitizeCsvCell("'@SUM(1+1)")).toBe('@SUM(1+1)');
      expect(desanitizeCsvCell('Normal Name')).toBe('Normal Name');
    });

    it('serializes rows with RFC 4180 quotes and formula injection escaping', () => {
      const rows = [
        {
          id: '1',
          name: '=HYPERLINK("http://evil.com")',
          phone: '+8801711000001',
          note: 'Line 1\nLine 2',
        },
      ];
      const serialized = serializeCsv(rows, ['id', 'name', 'phone', 'note']);

      expect(serialized).toContain('"\'=HYPERLINK(""http://evil.com"")"');
      expect(serialized).toContain('+8801711000001');
      expect(serialized).toContain('"Line 1\nLine 2"');
    });
  });
});
