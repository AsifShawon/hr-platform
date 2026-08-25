import {
  LocationType,
  OrgUnitType,
  Gender,
  EmploymentStatus,
  JobCategory,
  IdentityDocumentType,
  CardIssueStatus,
  CardIssueReason,
  CardRevocationReason,
  PrintJobStatus,
  PrintOutputFormat,
  PrintJobSide,
  OperatorPrintStatus,
} from '@hr/domain';

export interface FictionalOrganizationFixture {
  name: string;
  displayName: string;
  code: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  locale: string;
  timezone: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  contactEmail: string;
  contactPhone: string;
  employeeNumberRule: {
    prefix: string;
    padLength: number;
    nextSequence: number;
  };
}

export const FICTIONAL_ORGANIZATION: FictionalOrganizationFixture = {
  name: 'London Boy Apparel Ltd.',
  displayName: 'London Boy Apparel',
  code: 'LONDON_BOY',
  primaryColor: '#134E4A',
  secondaryColor: '#0F766E',
  accentColor: '#14B8A6',
  locale: 'en-US',
  timezone: 'Asia/Dhaka',
  address: {
    street: 'Plot 42, Sector 3, Uttara C/A',
    city: 'Dhaka',
    postalCode: '1230',
    country: 'Bangladesh',
  },
  contactEmail: 'info@londonboyapparel.com',
  contactPhone: '+88028901234',
  employeeNumberRule: {
    prefix: 'EMP-',
    padLength: 4,
    nextSequence: 1007,
  },
};

export interface FictionalLocationFixture {
  name: string;
  code: string;
  type: LocationType;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  contactPhone: string;
  isDefault: boolean;
}

export const FICTIONAL_LOCATIONS: readonly FictionalLocationFixture[] = [
  {
    name: 'Dhaka Corporate Office',
    code: 'DHK_HQ',
    type: LocationType.HEADQUARTERS,
    address: {
      street: 'Plot 42, Sector 3, Uttara C/A',
      city: 'Dhaka',
      postalCode: '1230',
      country: 'Bangladesh',
    },
    contactPhone: '+88028901234',
    isDefault: true,
  },
  {
    name: 'Gazipur Manufacturing Plant',
    code: 'GZP_PLANT',
    type: LocationType.FACTORY,
    address: {
      street: 'Bypass Road, Joydebpur',
      city: 'Gazipur',
      postalCode: '1700',
      country: 'Bangladesh',
    },
    contactPhone: '+88029205678',
    isDefault: false,
  },
];

export interface FictionalOrgUnitFixture {
  name: string;
  nameBangla: string;
  code: string;
  type: OrgUnitType;
  parentCode: string | null;
  locationCode: string;
  sortOrder: number;
}

export const FICTIONAL_ORG_UNITS: readonly FictionalOrgUnitFixture[] = [
  // Level 1: Root Division
  {
    name: 'Manufacturing Division',
    nameBangla: 'উৎপাদন বিভাগ',
    code: 'MFG_DIV',
    type: OrgUnitType.DIVISION,
    parentCode: null,
    locationCode: 'GZP_PLANT',
    sortOrder: 1,
  },
  // Level 2: Departments under Manufacturing Division
  {
    name: 'Garments Production',
    nameBangla: 'পোশাক প্রস্তুতকরণ',
    code: 'GARMENTS_PROD',
    type: OrgUnitType.DEPARTMENT,
    parentCode: 'MFG_DIV',
    locationCode: 'GZP_PLANT',
    sortOrder: 1,
  },
  {
    name: 'Quality Assurance',
    nameBangla: 'মান নিয়ন্ত্রণ',
    code: 'QA_DEPT',
    type: OrgUnitType.DEPARTMENT,
    parentCode: 'MFG_DIV',
    locationCode: 'GZP_PLANT',
    sortOrder: 2,
  },
  // Level 3: Sections & Lines under Departments
  {
    name: 'Cutting Section',
    nameBangla: 'কাটিং সেকশন',
    code: 'CUT_SEC',
    type: OrgUnitType.SECTION,
    parentCode: 'GARMENTS_PROD',
    locationCode: 'GZP_PLANT',
    sortOrder: 1,
  },
  {
    name: 'Sewing Line A',
    nameBangla: 'সুইং লাইন এ',
    code: 'SEW_LINE_A',
    type: OrgUnitType.LINE,
    parentCode: 'GARMENTS_PROD',
    locationCode: 'GZP_PLANT',
    sortOrder: 2,
  },
  {
    name: 'Finishing & Packing',
    nameBangla: 'ফিনিশিং ও প্যাকিং',
    code: 'FIN_PACK',
    type: OrgUnitType.SECTION,
    parentCode: 'GARMENTS_PROD',
    locationCode: 'GZP_PLANT',
    sortOrder: 3,
  },
  {
    name: 'Fabric & Inline QC',
    nameBangla: 'ফেব্রিক ও ইনলাইন কিউসি',
    code: 'INLINE_QC',
    type: OrgUnitType.SECTION,
    parentCode: 'QA_DEPT',
    locationCode: 'GZP_PLANT',
    sortOrder: 1,
  },
];

export interface FictionalPersonFixture {
  displayName: string;
  displayNameLatin: string;
  displayNameNative: string;
  givenName?: string;
  familyName?: string;
  dateOfBirth?: string;
  gender: Gender;
  bloodGroup?: string;
  primaryPhone?: string;
  primaryEmail?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  identityDocument?: {
    type: IdentityDocumentType;
    number: string;
    country: string;
    isVerified: boolean;
  };
  employment: {
    employeeNumber: string;
    orgUnitCode: string;
    locationCode: string;
    jobTitle: string;
    jobCategory: JobCategory;
    joinDate: string;
    endDate?: string;
    status: EmploymentStatus;
  };
}

export const FICTIONAL_PEOPLE: readonly FictionalPersonFixture[] = [
  {
    displayName: 'Tanvir Ahmed',
    displayNameLatin: 'Tanvir Ahmed',
    displayNameNative: 'তানভীর আহমেদ',
    givenName: 'Tanvir',
    familyName: 'Ahmed',
    dateOfBirth: '1988-04-12',
    gender: Gender.MALE,
    bloodGroup: 'O+',
    primaryPhone: '+8801711000001',
    primaryEmail: 'tanvir.ahmed@londonboyapparel.com',
    address: {
      street: 'House 14, Road 5, Sector 4',
      city: 'Uttara, Dhaka',
      postalCode: '1230',
      country: 'Bangladesh',
    },
    identityDocument: {
      type: IdentityDocumentType.SMART_NID,
      number: '19882612345678901',
      country: 'BGD',
      isVerified: true,
    },
    employment: {
      employeeNumber: 'EMP-1001',
      orgUnitCode: 'MFG_DIV',
      locationCode: 'GZP_PLANT',
      jobTitle: 'Senior Production Manager',
      jobCategory: JobCategory.MANAGEMENT,
      joinDate: '2022-01-15',
      status: EmploymentStatus.ACTIVE,
    },
  },
  {
    displayName: 'Nusrat Jahan',
    displayNameLatin: 'Nusrat Jahan',
    displayNameNative: 'নুসরাত জাহান',
    givenName: 'Nusrat',
    familyName: 'Jahan',
    dateOfBirth: '1992-09-24',
    gender: Gender.FEMALE,
    bloodGroup: 'A+',
    primaryPhone: '+8801711000002',
    primaryEmail: 'nusrat.jahan@londonboyapparel.com',
    identityDocument: {
      type: IdentityDocumentType.SMART_NID,
      number: '19922612345678902',
      country: 'BGD',
      isVerified: true,
    },
    employment: {
      employeeNumber: 'EMP-1002',
      orgUnitCode: 'QA_DEPT',
      locationCode: 'GZP_PLANT',
      jobTitle: 'Quality Assurance Lead',
      jobCategory: JobCategory.STAFF,
      joinDate: '2022-03-01',
      status: EmploymentStatus.ACTIVE,
    },
  },
  {
    displayName: 'Rahim Chowdhury',
    displayNameLatin: 'Rahim Chowdhury',
    displayNameNative: 'রহিম চৌধুরী',
    givenName: 'Rahim',
    familyName: 'Chowdhury',
    dateOfBirth: '1995-11-03',
    gender: Gender.MALE,
    bloodGroup: 'B+',
    primaryPhone: '+8801711000003',
    identityDocument: {
      type: IdentityDocumentType.NID,
      number: '1995261234567',
      country: 'BGD',
      isVerified: true,
    },
    employment: {
      employeeNumber: 'EMP-1003',
      orgUnitCode: 'CUT_SEC',
      locationCode: 'GZP_PLANT',
      jobTitle: 'Master Pattern Cutter',
      jobCategory: JobCategory.OPERATOR,
      joinDate: '2023-05-10',
      status: EmploymentStatus.ACTIVE,
    },
  },
  {
    displayName: 'Farhana Akter',
    displayNameLatin: 'Farhana Akter',
    displayNameNative: 'ফারহানা আক্তার',
    givenName: 'Farhana',
    familyName: 'Akter',
    dateOfBirth: '2000-02-29', // Leap year birthdate
    gender: Gender.FEMALE,
    bloodGroup: 'AB+',
    primaryPhone: '+8801711000004',
    primaryEmail: 'farhana.akter@londonboyapparel.com',
    identityDocument: {
      type: IdentityDocumentType.PASSPORT,
      number: 'BG0987654',
      country: 'BGD',
      isVerified: true,
    },
    employment: {
      employeeNumber: 'EMP-1004',
      orgUnitCode: 'GARMENTS_PROD',
      locationCode: 'GZP_PLANT',
      jobTitle: 'HR Compliance Officer',
      jobCategory: JobCategory.STAFF,
      joinDate: '2023-08-20',
      status: EmploymentStatus.ACTIVE,
    },
  },
  // Mononym example
  {
    displayName: 'Jahanara',
    displayNameLatin: 'Jahanara',
    displayNameNative: 'জাহানারা',
    dateOfBirth: '1996-07-18',
    gender: Gender.FEMALE,
    bloodGroup: 'O-',
    primaryPhone: '+8801711000005',
    employment: {
      employeeNumber: 'EMP-1005',
      orgUnitCode: 'SEW_LINE_A',
      locationCode: 'GZP_PLANT',
      jobTitle: 'Senior Sewing Operator',
      jobCategory: JobCategory.WORKER,
      joinDate: '2024-01-05',
      status: EmploymentStatus.ACTIVE,
    },
  },
  // Multi-word long name example
  {
    displayName: 'Mohammad Ashraful Islam Majumdar',
    displayNameLatin: 'Mohammad Ashraful Islam Majumdar',
    displayNameNative: 'মোহাম্মদ আশরাফুল ইসলাম মজুমদার',
    givenName: 'Mohammad Ashraful Islam',
    familyName: 'Majumdar',
    dateOfBirth: '1985-12-30',
    gender: Gender.MALE,
    bloodGroup: 'B-',
    primaryPhone: '+8801711000006',
    primaryEmail: 'ashraful.majumdar@londonboyapparel.com',
    employment: {
      employeeNumber: 'EMP-1006',
      orgUnitCode: 'INLINE_QC',
      locationCode: 'GZP_PLANT',
      jobTitle: 'Chief Quality Inspector',
      jobCategory: JobCategory.STAFF,
      joinDate: '2024-02-01',
      status: EmploymentStatus.PREBOARDING,
    },
  },
  // Worker 7: Cutting Master
  {
    displayName: 'Kamal Hossain',
    displayNameLatin: 'Kamal Hossain',
    displayNameNative: 'কামাল হোসেন',
    givenName: 'Kamal',
    familyName: 'Hossain',
    dateOfBirth: '1990-05-14',
    gender: Gender.MALE,
    bloodGroup: 'A+',
    primaryPhone: '+8801711000007',
    employment: {
      employeeNumber: 'EMP-1007',
      orgUnitCode: 'CUT_SEC',
      locationCode: 'GZP_PLANT',
      jobTitle: 'Pattern Cutting Technician',
      jobCategory: JobCategory.OPERATOR,
      joinDate: '2022-04-10',
      status: EmploymentStatus.ACTIVE,
    },
  },
  // Worker 8: Production Planner
  {
    displayName: 'Roxana Parvin',
    displayNameLatin: 'Roxana Parvin',
    displayNameNative: 'রোকসানা পারভীন',
    givenName: 'Roxana',
    familyName: 'Parvin',
    dateOfBirth: '1993-11-20',
    gender: Gender.FEMALE,
    bloodGroup: 'AB-',
    primaryPhone: '+8801711000008',
    primaryEmail: 'roxana.parvin@londonboyapparel.com',
    employment: {
      employeeNumber: 'EMP-1008',
      orgUnitCode: 'GARMENTS_PROD',
      locationCode: 'GZP_PLANT',
      jobTitle: 'Production Planning Executive',
      jobCategory: JobCategory.STAFF,
      joinDate: '2022-06-01',
      status: EmploymentStatus.ACTIVE,
    },
  },
  // Worker 9: QC Inspector
  {
    displayName: 'Shoriful Islam',
    displayNameLatin: 'Shoriful Islam',
    displayNameNative: 'শরিফুল ইসলাম',
    givenName: 'Shoriful',
    familyName: 'Islam',
    dateOfBirth: '1998-03-25',
    gender: Gender.MALE,
    bloodGroup: 'O+',
    primaryPhone: '+8801711000009',
    employment: {
      employeeNumber: 'EMP-1009',
      orgUnitCode: 'QA_DEPT',
      locationCode: 'GZP_PLANT',
      jobTitle: 'Quality Inspector',
      jobCategory: JobCategory.WORKER,
      joinDate: '2023-01-15',
      status: EmploymentStatus.ACTIVE,
    },
  },
  // Worker 10: Sewing Specialist
  {
    displayName: 'Sumaiya Begum',
    displayNameLatin: 'Sumaiya Begum',
    displayNameNative: 'সুমাইয়া বেগম',
    dateOfBirth: '1997-08-12',
    gender: Gender.FEMALE,
    bloodGroup: 'B+',
    primaryPhone: '+8801711000010',
    employment: {
      employeeNumber: 'EMP-1010',
      orgUnitCode: 'SEW_LINE_A',
      locationCode: 'GZP_PLANT',
      jobTitle: 'Senior Machine Operator',
      jobCategory: JobCategory.WORKER,
      joinDate: '2023-03-01',
      status: EmploymentStatus.ACTIVE,
    },
  },
  // Worker 11: Corporate HR Executive
  {
    displayName: 'Anisur Rahman',
    displayNameLatin: 'Anisur Rahman',
    displayNameNative: 'আনিসুর রহমান',
    givenName: 'Anisur',
    familyName: 'Rahman',
    dateOfBirth: '1989-10-05',
    gender: Gender.MALE,
    bloodGroup: 'A-',
    primaryPhone: '+8801711000011',
    primaryEmail: 'anisur.rahman@londonboyapparel.com',
    employment: {
      employeeNumber: 'EMP-1011',
      orgUnitCode: 'MFG_DIV',
      locationCode: 'DHK_HQ',
      jobTitle: 'Assistant HR Manager',
      jobCategory: JobCategory.MANAGEMENT,
      joinDate: '2021-09-01',
      status: EmploymentStatus.ACTIVE,
    },
  },
  // Worker 12: Finishing Supervisor
  {
    displayName: 'Tania Sultana',
    displayNameLatin: 'Tania Sultana',
    displayNameNative: 'তানিয়া সুলতানা',
    givenName: 'Tania',
    familyName: 'Sultana',
    dateOfBirth: '1994-04-18',
    gender: Gender.FEMALE,
    bloodGroup: 'AB+',
    primaryPhone: '+8801711000012',
    employment: {
      employeeNumber: 'EMP-1012',
      orgUnitCode: 'FIN_PACK',
      locationCode: 'GZP_PLANT',
      jobTitle: 'Finishing Section Supervisor',
      jobCategory: JobCategory.STAFF,
      joinDate: '2022-10-15',
      status: EmploymentStatus.ACTIVE,
    },
  },
  // Worker 13: Packaging Operator
  {
    displayName: 'Babul Miah',
    displayNameLatin: 'Babul Miah',
    displayNameNative: 'বাবুল মিয়া',
    dateOfBirth: '1991-01-22',
    gender: Gender.MALE,
    bloodGroup: 'O+',
    primaryPhone: '+8801711000013',
    employment: {
      employeeNumber: 'EMP-1013',
      orgUnitCode: 'FIN_PACK',
      locationCode: 'GZP_PLANT',
      jobTitle: 'Packing & Carton Operator',
      jobCategory: JobCategory.WORKER,
      joinDate: '2023-05-01',
      status: EmploymentStatus.ACTIVE,
    },
  },
  // Worker 14: Quality Assurance Analyst
  {
    displayName: 'Mehnaz Tabassum',
    displayNameLatin: 'Mehnaz Tabassum',
    displayNameNative: 'মেহনাজ তাবাসসুম',
    givenName: 'Mehnaz',
    familyName: 'Tabassum',
    dateOfBirth: '1999-12-08',
    gender: Gender.FEMALE,
    bloodGroup: 'B-',
    primaryPhone: '+8801711000014',
    primaryEmail: 'mehnaz.tabassum@londonboyapparel.com',
    employment: {
      employeeNumber: 'EMP-1014',
      orgUnitCode: 'QA_DEPT',
      locationCode: 'GZP_PLANT',
      jobTitle: 'Compliance & Audit Analyst',
      jobCategory: JobCategory.STAFF,
      joinDate: '2024-01-10',
      status: EmploymentStatus.ACTIVE,
    },
  },
  // Worker 15: Contractor Line Specialist
  {
    displayName: 'Dilip Barua',
    displayNameLatin: 'Dilip Barua',
    displayNameNative: 'দিলীপ বড়ুয়া',
    dateOfBirth: '1987-06-30',
    gender: Gender.MALE,
    bloodGroup: 'A+',
    primaryPhone: '+8801711000015',
    employment: {
      employeeNumber: 'EMP-1015',
      orgUnitCode: 'SEW_LINE_A',
      locationCode: 'GZP_PLANT',
      jobTitle: 'Master Tailor Contractor',
      jobCategory: JobCategory.CONTRACTOR,
      joinDate: '2024-03-01',
      status: EmploymentStatus.ACTIVE,
    },
  },
  // Worker 16: Intern
  {
    displayName: 'Sadia Afrin',
    displayNameLatin: 'Sadia Afrin',
    displayNameNative: 'সাদিয়া আফরিন',
    dateOfBirth: '2002-09-15',
    gender: Gender.FEMALE,
    bloodGroup: 'O+',
    primaryPhone: '+8801711000016',
    primaryEmail: 'sadia.afrin@londonboyapparel.com',
    employment: {
      employeeNumber: 'EMP-1016',
      orgUnitCode: 'QA_DEPT',
      locationCode: 'GZP_PLANT',
      jobTitle: 'Apparel Technology Intern',
      jobCategory: JobCategory.INTERN,
      joinDate: '2024-05-01',
      status: EmploymentStatus.ACTIVE,
    },
  },
  // Worker 17: On Leave Worker
  {
    displayName: 'Habibur Rahman',
    displayNameLatin: 'Habibur Rahman',
    displayNameNative: 'হাবিবুর রহমান',
    givenName: 'Habibur',
    familyName: 'Rahman',
    dateOfBirth: '1992-02-14',
    gender: Gender.MALE,
    bloodGroup: 'B+',
    primaryPhone: '+8801711000017',
    employment: {
      employeeNumber: 'EMP-1017',
      orgUnitCode: 'CUT_SEC',
      locationCode: 'GZP_PLANT',
      jobTitle: 'Cutting Section Technician',
      jobCategory: JobCategory.OPERATOR,
      joinDate: '2022-08-01',
      status: EmploymentStatus.ON_LEAVE,
    },
  },
  // Worker 18: Separated Employee
  {
    displayName: 'Nazma Khatun',
    displayNameLatin: 'Nazma Khatun',
    displayNameNative: 'নাজমা খাতুন',
    dateOfBirth: '1995-07-29',
    gender: Gender.FEMALE,
    bloodGroup: 'A+',
    primaryPhone: '+8801711000018',
    employment: {
      employeeNumber: 'EMP-1018',
      orgUnitCode: 'SEW_LINE_A',
      locationCode: 'GZP_PLANT',
      jobTitle: 'Sewing Operator',
      jobCategory: JobCategory.WORKER,
      joinDate: '2021-02-01',
      endDate: '2023-12-31',
      status: EmploymentStatus.SEPARATED,
    },
  },
  // Worker 19: Security payload test (Formula injection defense verification)
  {
    displayName: "=cmd|' /C calc'!A0",
    displayNameLatin: "=cmd|' /C calc'!A0",
    displayNameNative: '=ক্যালকুলেটর',
    dateOfBirth: '1990-01-01',
    gender: Gender.OTHER,
    bloodGroup: 'O+',
    primaryPhone: '+8801711000019',
    employment: {
      employeeNumber: 'EMP-1019',
      orgUnitCode: 'GARMENTS_PROD',
      locationCode: 'GZP_PLANT',
      jobTitle: '@SUM(1+1)*cmd|',
      jobCategory: JobCategory.STAFF,
      joinDate: '2024-01-01',
      status: EmploymentStatus.ACTIVE,
    },
  },
  // Worker 20: Executive Director
  {
    displayName: 'Syed Mustafizur Rahman',
    displayNameLatin: 'Syed Mustafizur Rahman',
    displayNameNative: 'সৈয়দ মুস্তাফিজুর রহমান',
    givenName: 'Syed Mustafizur',
    familyName: 'Rahman',
    dateOfBirth: '1975-05-10',
    gender: Gender.MALE,
    bloodGroup: 'O+',
    primaryPhone: '+8801711000020',
    primaryEmail: 'mustafizur.rahman@londonboyapparel.com',
    identityDocument: {
      type: IdentityDocumentType.PASSPORT,
      number: 'EA0123456',
      country: 'BGD',
      isVerified: true,
    },
    employment: {
      employeeNumber: 'EMP-1020',
      orgUnitCode: 'MFG_DIV',
      locationCode: 'DHK_HQ',
      jobTitle: 'Executive Managing Director',
      jobCategory: JobCategory.EXECUTIVE,
      joinDate: '2020-01-01',
      status: EmploymentStatus.ACTIVE,
    },
  },
];

export interface FictionalWorkerFixture {
  employeeNumber: string;
  displayNameLatin: string;
  displayNameNative: string;
  title: string;
  department: string;
  status: EmploymentStatus;
  joinedDate: string;
  bloodGroup?: string;
  emergencyContact?: string;
}

export const FICTIONAL_WORKERS: readonly FictionalWorkerFixture[] = FICTIONAL_PEOPLE.map((p) => ({
  employeeNumber: p.employment.employeeNumber,
  displayNameLatin: p.displayNameLatin,
  displayNameNative: p.displayNameNative,
  title: p.employment.jobTitle,
  department: p.employment.orgUnitCode,
  status: p.employment.status,
  joinedDate: p.employment.joinDate,
  bloodGroup: p.bloodGroup,
  emergencyContact: p.primaryPhone,
}));

export interface FictionalCardIssueFixture {
  employeeNumber: string;
  cardSerial: string;
  issueNumber: number;
  issueReason: CardIssueReason;
  reasonNotes?: string;
  status: CardIssueStatus;
  isCurrent: boolean;
  issuedAt: string;
  revocationReason?: CardRevocationReason;
  revocationNotes?: string;
}

export const FICTIONAL_CARD_ISSUES: readonly FictionalCardIssueFixture[] = [
  // 1. Initial Issue Active Card
  {
    employeeNumber: 'EMP-1001',
    cardSerial: 'CARD-2026-000001',
    issueNumber: 1,
    issueReason: CardIssueReason.INITIAL,
    status: CardIssueStatus.ISSUED,
    isCurrent: true,
    issuedAt: '2026-01-15T09:00:00.000Z',
  },
  // 2. Replaced historical card (Damaged replacement scenario)
  {
    employeeNumber: 'EMP-1002',
    cardSerial: 'CARD-2026-000002',
    issueNumber: 1,
    issueReason: CardIssueReason.INITIAL,
    status: CardIssueStatus.REPLACED,
    isCurrent: false,
    issuedAt: '2026-01-15T09:15:00.000Z',
  },
  // 3. Current active reprint card (Lineage linked to Issue #1)
  {
    employeeNumber: 'EMP-1002',
    cardSerial: 'CARD-2026-000003',
    issueNumber: 2,
    issueReason: CardIssueReason.DAMAGED,
    reasonNotes: 'Card lanyard clip broke and front surface was severely scratched on shop floor.',
    status: CardIssueStatus.ISSUED,
    isCurrent: true,
    issuedAt: '2026-03-20T11:30:00.000Z',
  },
  // 4. Revoked credential (Separated worker scenario)
  {
    employeeNumber: 'EMP-1018',
    cardSerial: 'CARD-2026-000018',
    issueNumber: 1,
    issueReason: CardIssueReason.INITIAL,
    status: CardIssueStatus.REVOKED,
    isCurrent: false,
    issuedAt: '2026-01-15T10:00:00.000Z',
    revocationReason: CardRevocationReason.SEPARATION,
    revocationNotes:
      'Employee completed formal resignation and returned physical badge to HR security desk.',
  },
];

export interface FictionalPrintJobFixture {
  outputFormat: PrintOutputFormat;
  side: PrintJobSide;
  status: PrintJobStatus;
  operatorStatus: OperatorPrintStatus;
  totalItems: number;
  processedItems: number;
  failedItems: number;
}

export const FICTIONAL_PRINT_JOBS: readonly FictionalPrintJobFixture[] = [
  {
    outputFormat: PrintOutputFormat.A4_SHEET,
    side: PrintJobSide.DUPLEX,
    status: PrintJobStatus.COMPLETED,
    operatorStatus: OperatorPrintStatus.CONFIRMED_PRINTED,
    totalItems: 8,
    processedItems: 8,
    failedItems: 0,
  },
  {
    outputFormat: PrintOutputFormat.INDIVIDUAL_PDF,
    side: PrintJobSide.DUPLEX,
    status: PrintJobStatus.QUEUED,
    operatorStatus: OperatorPrintStatus.UNCONFIRMED,
    totalItems: 1,
    processedItems: 0,
    failedItems: 0,
  },
];
