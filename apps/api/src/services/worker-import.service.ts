import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { prisma } from '@hr/db';
import {
  Gender,
  EmploymentStatus,
  JobCategory,
  IdentityDocumentType,
  ImportDuplicateStrategy,
  ImportCommitPolicy,
  ImportJobStatus,
  ImportValidationReport,
  ImportValidationIssue,
  ImportColumnMapping,
  AuditAction,
  Permission,
} from '@hr/domain';
import { parseCsv, serializeCsv, ParsedCsvRow } from './csv-parser.service.js';
import { extractAndValidateZip } from './zip-archive.service.js';
import { processAndSavePhoto } from './photo-processing.service.js';
import {
  hashForBlindIndex,
  encryptSensitiveValue,
  maskSensitiveIdentifier,
} from './crypto.service.js';
import { recordAuditEvent } from './audit.service.js';

const STORAGE_ROOT = path.resolve(process.cwd(), '../../storage/temp/imports');

export class ImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportValidationError';
  }
}

/**
 * Suggests default column mappings based on common header names
 */
export function inferColumnMapping(headers: string[]): ImportColumnMapping {
  const mapping: ImportColumnMapping = {};
  const normalize = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const header of headers) {
    const norm = normalize(header);

    if (
      !mapping.displayName &&
      ['name', 'fullname', 'displayname', 'workername', 'worker'].includes(norm)
    ) {
      mapping.displayName = header;
    } else if (
      !mapping.displayNameLatin &&
      ['englishname', 'displaynamelatin', 'latinname', 'nameenglish'].includes(norm)
    ) {
      mapping.displayNameLatin = header;
    } else if (
      !mapping.displayNameNative &&
      ['banglaname', 'displaynamenative', 'bengaliname', 'nativename', 'নাম'].includes(norm)
    ) {
      mapping.displayNameNative = header;
    } else if (
      !mapping.employeeNumber &&
      ['employeenumber', 'employeeid', 'workerid', 'empid', 'cardno', 'badgeid'].includes(norm)
    ) {
      mapping.employeeNumber = header;
    } else if (
      !mapping.jobTitle &&
      ['jobtitle', 'title', 'designation', 'position', 'role'].includes(norm)
    ) {
      mapping.jobTitle = header;
    } else if (
      !mapping.jobCategory &&
      ['jobcategory', 'category', 'workertype', 'employmenttype'].includes(norm)
    ) {
      mapping.jobCategory = header;
    } else if (
      !mapping.joinDate &&
      ['joindate', 'joiningdate', 'hiredate', 'startdate'].includes(norm)
    ) {
      mapping.joinDate = header;
    } else if (
      !mapping.endDate &&
      ['enddate', 'separationdate', 'resignationdate', 'terminationdate'].includes(norm)
    ) {
      mapping.endDate = header;
    } else if (!mapping.status && ['status', 'employmentstatus', 'workerstatus'].includes(norm)) {
      mapping.status = header;
    } else if (
      !mapping.dateOfBirth &&
      ['dateofbirth', 'birthdate', 'dob', 'birthday'].includes(norm)
    ) {
      mapping.dateOfBirth = header;
    } else if (!mapping.gender && ['gender', 'sex'].includes(norm)) {
      mapping.gender = header;
    } else if (!mapping.bloodGroup && ['bloodgroup', 'blood', 'bloodtype'].includes(norm)) {
      mapping.bloodGroup = header;
    } else if (
      !mapping.primaryPhone &&
      ['primaryphone', 'phone', 'mobile', 'cell', 'contactnumber'].includes(norm)
    ) {
      mapping.primaryPhone = header;
    } else if (!mapping.primaryEmail && ['primaryemail', 'email', 'mail'].includes(norm)) {
      mapping.primaryEmail = header;
    } else if (
      !mapping.locationCode &&
      ['locationcode', 'location', 'site', 'factory', 'branch'].includes(norm)
    ) {
      mapping.locationCode = header;
    } else if (
      !mapping.orgUnitCode &&
      ['orgunitcode', 'orgunit', 'department', 'section', 'line', 'unit'].includes(norm)
    ) {
      mapping.orgUnitCode = header;
    } else if (
      !mapping.identityDocumentType &&
      ['identitydocumenttype', 'idtype', 'doctype', 'documenttype'].includes(norm)
    ) {
      mapping.identityDocumentType = header;
    } else if (
      !mapping.identityDocumentNumber &&
      [
        'identitydocumentnumber',
        'idnumber',
        'nid',
        'nidnumber',
        'passportnumber',
        'smartnid',
      ].includes(norm)
    ) {
      mapping.identityDocumentNumber = header;
    } else if (
      !mapping.photoPath &&
      ['photopath', 'photofile', 'photo', 'image', 'picture', 'avatar'].includes(norm)
    ) {
      mapping.photoPath = header;
    }
  }

  return mapping;
}

/**
 * Normalizes date string strictly adhering to ISO 8601 YYYY-MM-DD
 * Rejects ambiguous dates such as 03/04/2026
 */
export function normalizeDateValue(rawDate: string, fieldName: string, rowNumber: number): string {
  if (!rawDate || rawDate.trim() === '') return '';
  const trimmed = rawDate.trim();

  // Strict ISO formats: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1] as string, 10);
    const month = parseInt(isoMatch[2] as string, 10);
    const day = parseInt(isoMatch[3] as string, 10);

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      throw new ImportValidationError(
        `Row ${rowNumber}: Invalid date values in '${fieldName}': ${trimmed}.`,
      );
    }
    // Format YYYY-MM-DD
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Reject ambiguous formats (e.g. 03/04/2026 or 12-11-2025)
  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(trimmed)) {
    throw new ImportValidationError(
      `Row ${rowNumber}: Ambiguous date format '${trimmed}' in '${fieldName}'. Please provide dates in unambiguous ISO YYYY-MM-DD format.`,
    );
  }

  throw new ImportValidationError(
    `Row ${rowNumber}: Unrecognized date format '${trimmed}' in '${fieldName}'. Expected YYYY-MM-DD.`,
  );
}

/**
 * Ingest an uploaded CSV or ZIP file, extract metadata and preview
 */
export async function createImportJob(
  tenantId: string,
  organizationId: string,
  userId: string,
  file: {
    buffer: Buffer;
    filename: string;
    mimetype: string;
  },
): Promise<{
  importJobId: string;
  status: ImportJobStatus;
  totalRows: number;
  headers: string[];
  suggestedMapping: ImportColumnMapping;
  detectedDelimiter: string;
  detectedEncoding: string;
  previewRows: Array<Record<string, string>>;
}> {
  const jobId = crypto.randomUUID();
  const jobDir = path.join(STORAGE_ROOT, jobId);
  await fs.mkdir(jobDir, { recursive: true });

  const isZip =
    file.filename.toLowerCase().endsWith('.zip') ||
    file.mimetype === 'application/zip' ||
    file.mimetype === 'application/x-zip-compressed' ||
    (file.buffer.length >= 4 && file.buffer[0] === 0x50 && file.buffer[1] === 0x4b);

  let csvContent: string;
  let storageKeyArchive: string | null = null;
  let storageKeyCsv: string;

  if (isZip) {
    storageKeyArchive = path.join(jobId, 'archive.zip');
    await fs.writeFile(path.join(STORAGE_ROOT, storageKeyArchive), file.buffer);

    const extracted = await extractAndValidateZip(file.buffer, path.join(jobDir, 'extracted'));
    if (!extracted.csvContent) {
      throw new ImportValidationError('ZIP package must contain a CSV file (e.g. workers.csv).');
    }
    csvContent = extracted.csvContent;
    storageKeyCsv = path.join(jobId, 'workers.csv');
    await fs.writeFile(path.join(STORAGE_ROOT, storageKeyCsv), Buffer.from(csvContent, 'utf8'));
  } else {
    storageKeyCsv = path.join(jobId, 'workers.csv');
    await fs.writeFile(path.join(STORAGE_ROOT, storageKeyCsv), file.buffer);
    csvContent = file.buffer.toString('utf8');
  }

  const parseResult = parseCsv(csvContent);
  if (parseResult.headers.length === 0 || parseResult.rows.length === 0) {
    throw new ImportValidationError('Uploaded CSV file contains no data rows.');
  }

  const suggestedMapping = inferColumnMapping(parseResult.headers);
  const previewRows = parseResult.rows.slice(0, 10).map((r) => r.data);

  const importJob = await prisma.importJob.create({
    data: {
      id: jobId,
      tenantId,
      organizationId,
      status: ImportJobStatus.PREVIEW_READY,
      fileName: file.filename,
      fileSizeBytes: file.buffer.length,
      storageKeyArchive,
      storageKeyCsv,
      totalRows: parseResult.rows.length,
      detectedDelimiter: parseResult.detectedDelimiter,
      detectedEncoding: parseResult.detectedEncoding,
      columnMapping: suggestedMapping as any,
      previewRows: previewRows as any,
      createdByUserId: userId,
    },
  });

  return {
    importJobId: importJob.id,
    status: importJob.status as ImportJobStatus,
    totalRows: parseResult.rows.length,
    headers: parseResult.headers,
    suggestedMapping,
    detectedDelimiter: parseResult.detectedDelimiter,
    detectedEncoding: parseResult.detectedEncoding,
    previewRows,
  };
}

/**
 * Configure column mapping and delimiter/encoding overrides for an import job
 */
export async function configureImportJobMapping(
  tenantId: string,
  importJobId: string,
  options: {
    columnMapping: ImportColumnMapping;
    duplicateStrategy: ImportDuplicateStrategy;
    delimiter?: string;
    encoding?: string;
  },
): Promise<{
  importJobId: string;
  status: ImportJobStatus;
  previewRows: Array<Record<string, string>>;
}> {
  const job = await prisma.importJob.findFirst({
    where: { id: importJobId, tenantId },
  });

  if (!job) {
    throw new ImportValidationError('Import job not found.');
  }

  // Reload and re-parse CSV if delimiter was changed
  let previewRows: Array<Record<string, string>> = (job.previewRows as any) || [];
  if (options.delimiter && options.delimiter !== job.detectedDelimiter && job.storageKeyCsv) {
    const csvPath = path.join(STORAGE_ROOT, job.storageKeyCsv);
    const csvData = await fs.readFile(csvPath);
    const reparse = parseCsv(csvData, { delimiter: options.delimiter });
    previewRows = reparse.rows.slice(0, 10).map((r) => r.data);
  }

  await prisma.importJob.update({
    where: { id: importJobId },
    data: {
      columnMapping: options.columnMapping as any,
      duplicateStrategy: options.duplicateStrategy,
      detectedDelimiter: options.delimiter || job.detectedDelimiter,
      detectedEncoding: options.encoding || job.detectedEncoding,
      previewRows: previewRows as any,
      status: ImportJobStatus.PREVIEW_READY,
    },
  });

  return {
    importJobId,
    status: ImportJobStatus.PREVIEW_READY,
    previewRows,
  };
}

export interface ValidatedWorkerRow {
  rowNumber: number;
  person: {
    displayName: string;
    displayNameLatin?: string | null;
    displayNameNative?: string | null;
    givenName?: string | null;
    familyName?: string | null;
    middleName?: string | null;
    phoneticName?: string | null;
    dateOfBirth?: string | null;
    gender: Gender;
    bloodGroup?: string | null;
    primaryPhone?: string | null;
    primaryEmail?: string | null;
  };
  employment: {
    organizationId: string;
    locationId?: string | null;
    orgUnitId?: string | null;
    employeeNumber: string;
    jobTitle: string;
    jobCategory: JobCategory;
    joinDate: string;
    endDate?: string | null;
    status: EmploymentStatus;
  };
  identityDocument?: {
    documentType: IdentityDocumentType;
    documentNumber: string;
  };
  photoRelativePath?: string | null;
  customFields?: Record<string, string>;
  isDuplicate: boolean;
  duplicatePersonId?: string;
  duplicateMatchReason?: string;
}

/**
 * Validates 100% of rows and references in the import job without persistent mutations
 */
export async function validateAndSimulateImport(
  tenantId: string,
  importJobId: string,
  userPermissions: string[],
): Promise<{
  report: ImportValidationReport;
  dryRunPassed: boolean;
  validatedRows: ValidatedWorkerRow[];
}> {
  const job = await prisma.importJob.findFirst({
    where: { id: importJobId, tenantId },
  });

  if (!job || !job.storageKeyCsv) {
    throw new ImportValidationError('Import job not found or missing CSV data.');
  }

  const mapping = (job.columnMapping as ImportColumnMapping) || {};
  if (!mapping.displayName && !mapping.displayNameLatin) {
    throw new ImportValidationError(
      "Column mapping must include at least 'displayName' or 'displayNameLatin'.",
    );
  }
  if (!mapping.employeeNumber) {
    throw new ImportValidationError("Column mapping must include 'employeeNumber'.");
  }

  // Security check: if identity document number is mapped, user must have identity.edit permission
  if (mapping.identityDocumentNumber && !userPermissions.includes(Permission.IDENTITY_EDIT)) {
    throw new ImportValidationError(
      "Unauthorized: Mapping sensitive identity documents requires the 'identity.edit' permission.",
    );
  }

  const csvPath = path.join(STORAGE_ROOT, job.storageKeyCsv);
  const csvBuffer = await fs.readFile(csvPath);
  const parseResult = parseCsv(csvBuffer, { delimiter: job.detectedDelimiter || undefined });

  // Pre-fetch organization locations and org units for resolution
  const [locations, orgUnits] = await Promise.all([
    prisma.location.findMany({
      where: { tenantId, organizationId: job.organizationId },
    }),
    prisma.orgUnit.findMany({
      where: { tenantId, organizationId: job.organizationId },
    }),
  ]);

  const locationByCode = new Map(locations.map((l) => [l.code.toLowerCase(), l.id]));
  const locationByName = new Map(locations.map((l) => [l.name.toLowerCase(), l.id]));
  const locationById = new Set(locations.map((l) => l.id));

  const orgUnitByCode = new Map(orgUnits.map((u) => [u.code.toLowerCase(), u.id]));
  const orgUnitByName = new Map<string, string[]>();
  for (const u of orgUnits) {
    const k = u.name.toLowerCase();
    if (!orgUnitByName.has(k)) orgUnitByName.set(k, []);
    orgUnitByName.get(k)!.push(u.id);
  }
  const orgUnitById = new Set(orgUnits.map((u) => u.id));

  // Pre-fetch existing workers for duplicate checks
  const existingEmployments = await prisma.employment.findMany({
    where: { tenantId, organizationId: job.organizationId },
    select: { employeeNumber: true, personId: true },
  });
  const existingEmpNumbers = new Map(
    existingEmployments.map((e) => [e.employeeNumber.toLowerCase(), e.personId]),
  );

  const existingPeople = await prisma.person.findMany({
    where: { tenantId },
    select: {
      id: true,
      displayName: true,
      dateOfBirth: true,
      primaryPhone: true,
      primaryEmail: true,
    },
  });

  const existingIdentityDocs = await prisma.identityDocument.findMany({
    where: { tenantId },
    select: { documentNumberHash: true, personId: true },
  });
  const existingNidHashes = new Map(
    existingIdentityDocs.map((d) => [d.documentNumberHash, d.personId]),
  );

  const issues: ImportValidationIssue[] = [];
  const duplicateWarnings: ImportValidationReport['duplicateWarnings'] = [];
  const validatedRows: ValidatedWorkerRow[] = [];

  const batchEmpNumbers = new Set<string>();
  const batchNidHashes = new Set<string>();

  const imagesDir = job.storageKeyArchive
    ? path.join(STORAGE_ROOT, job.id, 'extracted', 'images')
    : null;

  for (const row of parseResult.rows) {
    const rNum = row.rowNumber;
    const rowData = row.data;

    // 1. Employee Number
    const rawEmpNo = (mapping.employeeNumber ? rowData[mapping.employeeNumber] : '') || '';
    if (!rawEmpNo.trim()) {
      issues.push({
        rowNumber: rNum,
        column: mapping.employeeNumber,
        field: 'employeeNumber',
        severity: 'ERROR',
        code: 'MISSING_REQUIRED',
        message: 'Employee Number is required.',
      });
    }

    const empNo = rawEmpNo.trim();
    if (batchEmpNumbers.has(empNo.toLowerCase())) {
      issues.push({
        rowNumber: rNum,
        column: mapping.employeeNumber,
        field: 'employeeNumber',
        value: empNo,
        severity: 'ERROR',
        code: 'DUPLICATE_IN_BATCH',
        message: `Employee number '${empNo}' is duplicated within this import file.`,
      });
    }
    batchEmpNumbers.add(empNo.toLowerCase());

    // 2. Display Name
    const rawName = (mapping.displayName ? rowData[mapping.displayName] : '') || '';
    const rawLatinName = (mapping.displayNameLatin ? rowData[mapping.displayNameLatin] : '') || '';
    const rawNativeName =
      (mapping.displayNameNative ? rowData[mapping.displayNameNative] : '') || '';

    const displayName = rawName.trim() || rawLatinName.trim();
    if (!displayName) {
      issues.push({
        rowNumber: rNum,
        column: mapping.displayName || mapping.displayNameLatin,
        field: 'displayName',
        severity: 'ERROR',
        code: 'MISSING_REQUIRED',
        message: 'Display Name is required.',
      });
    }

    // 3. Dates & Normalization
    let joinDate = '';
    const rawJoinDate = (mapping.joinDate ? rowData[mapping.joinDate] : '') || '';
    if (rawJoinDate.trim()) {
      try {
        joinDate = normalizeDateValue(rawJoinDate, 'Join Date', rNum);
      } catch (err: any) {
        issues.push({
          rowNumber: rNum,
          column: mapping.joinDate,
          field: 'joinDate',
          value: rawJoinDate,
          severity: 'ERROR',
          code: 'INVALID_DATE',
          message: err.message,
        });
      }
    } else {
      // Default to today if omitted
      joinDate = new Date().toISOString().split('T')[0] as string;
    }

    let dateOfBirth: string | null = null;
    const rawDob = (mapping.dateOfBirth ? rowData[mapping.dateOfBirth] : '') || '';
    if (rawDob.trim()) {
      try {
        dateOfBirth = normalizeDateValue(rawDob, 'Date of Birth', rNum);
      } catch (err: any) {
        issues.push({
          rowNumber: rNum,
          column: mapping.dateOfBirth,
          field: 'dateOfBirth',
          value: rawDob,
          severity: 'ERROR',
          code: 'INVALID_DATE',
          message: err.message,
        });
      }
    }

    let endDate: string | null = null;
    const rawEndDate = (mapping.endDate ? rowData[mapping.endDate] : '') || '';
    if (rawEndDate.trim()) {
      try {
        endDate = normalizeDateValue(rawEndDate, 'End Date', rNum);
      } catch (err: any) {
        issues.push({
          rowNumber: rNum,
          column: mapping.endDate,
          field: 'endDate',
          value: rawEndDate,
          severity: 'ERROR',
          code: 'INVALID_DATE',
          message: err.message,
        });
      }
    }

    // 4. Status & Job Category Enums
    const rawStatus = (mapping.status ? rowData[mapping.status] : '')?.toUpperCase().trim();
    let status: EmploymentStatus = EmploymentStatus.ACTIVE;
    if (rawStatus) {
      if (Object.values(EmploymentStatus).includes(rawStatus as any)) {
        status = rawStatus as EmploymentStatus;
      } else {
        issues.push({
          rowNumber: rNum,
          column: mapping.status,
          field: 'status',
          value: rawStatus,
          severity: 'WARNING',
          code: 'INVALID_ENUM',
          message: `Unknown status '${rawStatus}'. Defaulted to 'ACTIVE'.`,
        });
      }
    }

    const rawCategory = (mapping.jobCategory ? rowData[mapping.jobCategory] : '')
      ?.toUpperCase()
      .trim();
    let jobCategory: JobCategory = JobCategory.STAFF;
    if (rawCategory) {
      if (Object.values(JobCategory).includes(rawCategory as any)) {
        jobCategory = rawCategory as JobCategory;
      } else {
        issues.push({
          rowNumber: rNum,
          column: mapping.jobCategory,
          field: 'jobCategory',
          value: rawCategory,
          severity: 'WARNING',
          code: 'INVALID_ENUM',
          message: `Unknown job category '${rawCategory}'. Defaulted to 'STAFF'.`,
        });
      }
    }

    // 5. Gender & Blood Group
    const rawGender = (mapping.gender ? rowData[mapping.gender] : '')?.toUpperCase().trim();
    let gender: Gender = Gender.UNDISCLOSED;
    if (rawGender) {
      if (['M', 'MALE', 'MAN'].includes(rawGender)) gender = Gender.MALE;
      else if (['F', 'FEMALE', 'WOMAN'].includes(rawGender)) gender = Gender.FEMALE;
      else if (['OTHER', 'O'].includes(rawGender)) gender = Gender.OTHER;
    }

    const bloodGroup =
      (mapping.bloodGroup ? rowData[mapping.bloodGroup] : '')?.toUpperCase().trim() || null;

    // 6. Location Resolution
    let resolvedLocationId: string | null = null;
    const rawLoc = String(
      (mapping.locationCode ? rowData[mapping.locationCode] : '') ||
        (mapping.locationId ? rowData[mapping.locationId] : '') ||
        (mapping.locationName ? rowData[mapping.locationName] : '') ||
        '',
    );

    if (rawLoc.trim()) {
      const locKey = rawLoc.trim().toLowerCase();
      if (locationById.has(rawLoc.trim())) {
        resolvedLocationId = rawLoc.trim();
      } else if (locationByCode.has(locKey)) {
        resolvedLocationId = locationByCode.get(locKey)!;
      } else if (locationByName.has(locKey)) {
        resolvedLocationId = locationByName.get(locKey)!;
      } else {
        issues.push({
          rowNumber: rNum,
          field: 'location',
          value: rawLoc,
          severity: 'WARNING',
          code: 'UNRESOLVED_REFERENCE',
          message: `Location '${rawLoc}' could not be resolved.`,
        });
      }
    }

    // 7. OrgUnit Resolution with Ambiguity Detection
    let resolvedOrgUnitId: string | null = null;
    const rawUnit = String(
      (mapping.orgUnitCode ? rowData[mapping.orgUnitCode] : '') ||
        (mapping.orgUnitId ? rowData[mapping.orgUnitId] : '') ||
        (mapping.orgUnitName ? rowData[mapping.orgUnitName] : '') ||
        '',
    );

    if (rawUnit.trim()) {
      const unitKey = rawUnit.trim().toLowerCase();
      if (orgUnitById.has(rawUnit.trim())) {
        resolvedOrgUnitId = rawUnit.trim();
      } else if (orgUnitByCode.has(unitKey)) {
        resolvedOrgUnitId = orgUnitByCode.get(unitKey)!;
      } else if (orgUnitByName.has(unitKey)) {
        const matches = orgUnitByName.get(unitKey)!;
        if (matches.length === 1) {
          resolvedOrgUnitId = matches[0] as string;
        } else {
          issues.push({
            rowNumber: rNum,
            field: 'orgUnit',
            value: rawUnit,
            severity: 'ERROR',
            code: 'AMBIGUOUS_REFERENCE',
            message: `Org Unit name '${rawUnit}' is ambiguous (${matches.length} matching branches). Please specify by unique code.`,
          });
        }
      } else {
        issues.push({
          rowNumber: rNum,
          field: 'orgUnit',
          value: rawUnit,
          severity: 'WARNING',
          code: 'UNRESOLVED_REFERENCE',
          message: `Org Unit '${rawUnit}' could not be resolved.`,
        });
      }
    }

    // 8. Identity Document Verification & Blind Index
    let identityDoc: ValidatedWorkerRow['identityDocument'];
    const rawIdNum = (
      mapping.identityDocumentNumber ? rowData[mapping.identityDocumentNumber] : ''
    )?.trim();
    if (rawIdNum) {
      const rawIdType = (mapping.identityDocumentType ? rowData[mapping.identityDocumentType] : '')
        ?.toUpperCase()
        .trim();
      let docType = IdentityDocumentType.SMART_NID;
      if (Object.values(IdentityDocumentType).includes(rawIdType as any)) {
        docType = rawIdType as IdentityDocumentType;
      }

      identityDoc = {
        documentType: docType,
        documentNumber: rawIdNum,
      };

      const nidHash = hashForBlindIndex(rawIdNum, tenantId);
      if (batchNidHashes.has(nidHash)) {
        issues.push({
          rowNumber: rNum,
          field: 'identityDocument',
          value: maskSensitiveIdentifier(rawIdNum),
          severity: 'ERROR',
          code: 'DUPLICATE_IN_BATCH',
          message: `Government ID number is duplicated within this import file.`,
        });
      }
      batchNidHashes.add(nidHash);
    }

    // 9. Photo Relative Path Validation
    const rawPhoto = (mapping.photoPath ? rowData[mapping.photoPath] : '')?.trim();
    let photoRelativePath: string | null = null;
    if (rawPhoto) {
      photoRelativePath = rawPhoto;
      if (imagesDir) {
        // Look up photo file in extracted images folder or relative to extraction
        const cleanRel = path.normalize(rawPhoto).replace(/^(\.\.(\/|\\|$))+/, '');
        const fullPhotoPath = path.resolve(STORAGE_ROOT, job.id, 'extracted', cleanRel);
        try {
          await fs.access(fullPhotoPath);
        } catch {
          issues.push({
            rowNumber: rNum,
            field: 'photoFile',
            value: rawPhoto,
            severity: 'WARNING',
            code: 'MISSING_MEDIA_FILE',
            message: `Referenced image file '${rawPhoto}' not found in archive.`,
          });
        }
      }
    }

    // 10. Conservative Duplicate Checks against Existing DB
    let isDuplicate = false;
    let duplicatePersonId: string | undefined;
    let duplicateMatchReason: string | undefined;

    if (existingEmpNumbers.has(empNo.toLowerCase())) {
      isDuplicate = true;
      duplicatePersonId = existingEmpNumbers.get(empNo.toLowerCase());
      duplicateMatchReason = `Employee Number '${empNo}' already exists in database.`;
      duplicateWarnings.push({
        rowNumber: rNum,
        employeeNumber: empNo,
        displayName,
        existingPersonId: duplicatePersonId || '',
        matchCriteria: 'EXACT_EMPLOYEE_NUMBER',
      });
    } else if (identityDoc) {
      const nidHash = hashForBlindIndex(identityDoc.documentNumber, tenantId);
      if (existingNidHashes.has(nidHash)) {
        isDuplicate = true;
        duplicatePersonId = existingNidHashes.get(nidHash);
        duplicateMatchReason = `Government ID number matches existing record.`;
        duplicateWarnings.push({
          rowNumber: rNum,
          employeeNumber: empNo,
          displayName,
          existingPersonId: duplicatePersonId || '',
          matchCriteria: 'EXACT_IDENTITY_DOCUMENT',
        });
      }
    }

    validatedRows.push({
      rowNumber: rNum,
      person: {
        displayName,
        displayNameLatin: rawLatinName.trim() || null,
        displayNameNative: rawNativeName.trim() || null,
        givenName: (mapping.givenName ? rowData[mapping.givenName] : '')?.trim() || null,
        familyName: (mapping.familyName ? rowData[mapping.familyName] : '')?.trim() || null,
        middleName: (mapping.middleName ? rowData[mapping.middleName] : '')?.trim() || null,
        phoneticName: (mapping.phoneticName ? rowData[mapping.phoneticName] : '')?.trim() || null,
        dateOfBirth,
        gender,
        bloodGroup,
        primaryPhone: (mapping.primaryPhone ? rowData[mapping.primaryPhone] : '')?.trim() || null,
        primaryEmail:
          (mapping.primaryEmail ? rowData[mapping.primaryEmail] : '')?.trim().toLowerCase() || null,
      },
      employment: {
        organizationId: job.organizationId,
        locationId: resolvedLocationId,
        orgUnitId: resolvedOrgUnitId,
        employeeNumber: empNo,
        jobTitle: (mapping.jobTitle ? rowData[mapping.jobTitle] : '')?.trim() || 'Staff',
        jobCategory,
        joinDate,
        endDate,
        status,
      },
      identityDocument: identityDoc,
      photoRelativePath,
      isDuplicate,
      duplicatePersonId,
      duplicateMatchReason,
    });
  }

  const hasFatalErrors = issues.some((i) => i.severity === 'ERROR');
  const validRowCount = validatedRows.filter(
    (r) => !issues.some((i) => i.rowNumber === r.rowNumber && i.severity === 'ERROR'),
  ).length;

  const report: ImportValidationReport = {
    totalRows: parseResult.rows.length,
    validRows: validRowCount,
    invalidRows: parseResult.rows.length - validRowCount,
    duplicateRows: duplicateWarnings.length,
    issues,
    duplicateWarnings,
  };

  await prisma.importJob.update({
    where: { id: importJobId },
    data: {
      status: ImportJobStatus.DRY_RUN_COMPLETED,
      totalRows: report.totalRows,
      validRows: report.validRows,
      invalidRows: report.invalidRows,
      duplicateRows: report.duplicateRows,
      validationReport: report as any,
      dryRunPassed: !hasFatalErrors,
    },
  });

  return {
    report,
    dryRunPassed: !hasFatalErrors,
    validatedRows,
  };
}

/**
 * Execute final transactional database commit for an import job
 */
export async function commitImportJob(
  tenantId: string,
  importJobId: string,
  userId: string,
  options?: {
    commitPolicy?: ImportCommitPolicy;
  },
): Promise<{
  importJobId: string;
  status: ImportJobStatus;
  committedCount: number;
  skippedCount: number;
  failedCount: number;
  errorReportCsvUrl?: string;
}> {
  const job = await prisma.importJob.findFirst({
    where: { id: importJobId, tenantId },
  });

  if (!job) {
    throw new ImportValidationError('Import job not found.');
  }

  if (job.isCommitted) {
    throw new ImportValidationError('Import job has already been committed.');
  }

  const policy =
    options?.commitPolicy ||
    (job.commitPolicy as ImportCommitPolicy) ||
    ImportCommitPolicy.ALL_OR_NOTHING;

  // Run validation dry-run to get structured row objects
  const { report, dryRunPassed, validatedRows } = await validateAndSimulateImport(
    tenantId,
    importJobId,
    [Permission.IDENTITY_EDIT], // Internal authorized validation execution
  );

  if (policy === ImportCommitPolicy.ALL_OR_NOTHING && !dryRunPassed) {
    throw new ImportValidationError(
      `Cannot commit with 'ALL_OR_NOTHING' policy: Import contains ${report.invalidRows} validation errors.`,
    );
  }

  await prisma.importJob.update({
    where: { id: importJobId },
    data: { status: ImportJobStatus.COMMITTING },
  });

  let committedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const failedRowsCsv: Array<Record<string, unknown>> = [];

  const errorRowNumbers = new Set(
    report.issues.filter((i) => i.severity === 'ERROR').map((i) => i.rowNumber),
  );

  const duplicateStrategy = job.duplicateStrategy as ImportDuplicateStrategy;

  // Process rows in transactional chunks
  const BATCH_SIZE = 50;
  const validRowsToCommit = validatedRows.filter((r) => !errorRowNumbers.has(r.rowNumber));

  for (let i = 0; i < validRowsToCommit.length; i += BATCH_SIZE) {
    const batch = validRowsToCommit.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(async (tx) => {
      for (const row of batch) {
        if (row.isDuplicate) {
          if (duplicateStrategy === ImportDuplicateStrategy.REJECT_DUPLICATES) {
            failedCount++;
            failedRowsCsv.push({
              Row: row.rowNumber,
              EmployeeNumber: row.employment.employeeNumber,
              Name: row.person.displayName,
              Error: `Duplicate rejected: ${row.duplicateMatchReason}`,
            });
            continue;
          } else if (duplicateStrategy === ImportDuplicateStrategy.SKIP_EXISTING) {
            skippedCount++;
            continue;
          } else if (
            duplicateStrategy === ImportDuplicateStrategy.UPDATE_EXISTING &&
            row.duplicatePersonId
          ) {
            // Update non-identifying fields
            await tx.person.update({
              where: { id: row.duplicatePersonId, tenantId },
              data: {
                displayName: row.person.displayName,
                displayNameLatin: row.person.displayNameLatin,
                displayNameNative: row.person.displayNameNative,
                bloodGroup: row.person.bloodGroup,
                primaryPhone: row.person.primaryPhone,
                primaryEmail: row.person.primaryEmail,
              },
            });
            await tx.employment.updateMany({
              where: {
                personId: row.duplicatePersonId,
                tenantId,
                organizationId: job.organizationId,
              },
              data: {
                jobTitle: row.employment.jobTitle,
                jobCategory: row.employment.jobCategory,
                status: row.employment.status,
                locationId: row.employment.locationId,
                orgUnitId: row.employment.orgUnitId,
              },
            });
            committedCount++;
            continue;
          }
        }

        // 1. Create Person
        const person = await tx.person.create({
          data: {
            tenantId,
            displayName: row.person.displayName,
            displayNameLatin: row.person.displayNameLatin,
            displayNameNative: row.person.displayNameNative,
            givenName: row.person.givenName,
            familyName: row.person.familyName,
            middleName: row.person.middleName,
            phoneticName: row.person.phoneticName,
            dateOfBirth: row.person.dateOfBirth ? new Date(row.person.dateOfBirth) : null,
            gender: row.person.gender,
            bloodGroup: row.person.bloodGroup,
            primaryPhone: row.person.primaryPhone,
            primaryEmail: row.person.primaryEmail,
          },
        });

        // 2. Create Employment
        await tx.employment.create({
          data: {
            tenantId,
            personId: person.id,
            organizationId: row.employment.organizationId,
            locationId: row.employment.locationId,
            orgUnitId: row.employment.orgUnitId,
            employeeNumber: row.employment.employeeNumber,
            jobTitle: row.employment.jobTitle,
            jobCategory: row.employment.jobCategory,
            joinDate: new Date(row.employment.joinDate),
            endDate: row.employment.endDate ? new Date(row.employment.endDate) : null,
            status: row.employment.status,
            isPrimary: true,
          },
        });

        // 3. Create Identity Document if provided
        if (row.identityDocument) {
          const docNum = row.identityDocument.documentNumber;
          await tx.identityDocument.create({
            data: {
              tenantId,
              personId: person.id,
              documentType: row.identityDocument.documentType,
              documentNumberEncrypted: encryptSensitiveValue(docNum),
              documentNumberMasked: maskSensitiveIdentifier(docNum),
              documentNumberHash: hashForBlindIndex(docNum, tenantId),
              country: 'BGD',
            },
          });
        }

        // 4. Process Photo if included
        if (row.photoRelativePath && job.storageKeyArchive) {
          const cleanRel = path.normalize(row.photoRelativePath).replace(/^(\.\.(\/|\\|$))+/, '');
          const fullPhotoPath = path.resolve(STORAGE_ROOT, job.id, 'extracted', cleanRel);
          try {
            const photoBuffer = await fs.readFile(fullPhotoPath);
            await processAndSavePhoto(photoBuffer, tenantId, { personId: person.id });
          } catch {
            // Non-fatal image skip during commit
          }
        }

        committedCount++;
      }
    });
  }

  // Generate rejection CSV if any rows failed
  let errorReportCsvKey: string | null = null;
  if (failedRowsCsv.length > 0 || report.invalidRows > 0) {
    for (const issue of report.issues.filter((i) => i.severity === 'ERROR')) {
      failedRowsCsv.push({
        Row: issue.rowNumber,
        Field: issue.field || issue.column || '',
        Error: issue.message,
      });
    }

    const errorCsvContent = serializeCsv(failedRowsCsv, [
      'Row',
      'EmployeeNumber',
      'Name',
      'Field',
      'Error',
    ]);
    errorReportCsvKey = path.join(job.id, 'errors.csv');
    await fs.writeFile(
      path.join(STORAGE_ROOT, errorReportCsvKey),
      Buffer.from(errorCsvContent, 'utf8'),
    );
  }

  await prisma.importJob.update({
    where: { id: importJobId },
    data: {
      status: ImportJobStatus.COMPLETED,
      isCommitted: true,
      processedRows: committedCount + skippedCount + failedCount,
      errorReportCsvKey,
    },
  });

  // Record Audit Event
  await recordAuditEvent({
    tenantId,
    actorId: userId,
    action: AuditAction.DATA_IMPORTED,
    entityType: 'import_job',
    entityId: importJobId,
    details: {
      fileName: job.fileName,
      totalRows: job.totalRows,
      committedCount,
      skippedCount,
      failedCount,
      commitPolicy: policy,
    },
  });

  return {
    importJobId,
    status: ImportJobStatus.COMPLETED,
    committedCount,
    skippedCount,
    failedCount,
    errorReportCsvUrl: errorReportCsvKey ? `/api/imports/${importJobId}/errors.csv` : undefined,
  };
}
