import {
  LocationType,
  OrgUnitType,
  Gender,
  EmploymentStatus,
  JobCategory,
  IdentityDocumentType,
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
