import { prisma, PermissionType } from './index.js';
import {
  BUILT_IN_ROLE_PERMISSIONS,
  BuiltInRole,
  Permission,
  Gender,
  EmploymentStatus,
  JobCategory,
  IdentityDocumentType,
  TemplatePresetId,
  TemplateVersionStatus,
  TemplateAssignmentTarget,
} from '@hr/domain';
import { createClassicVerticalPreset } from '@hr/card-kit';
import { hash } from '@node-rs/argon2';
import { FICTIONAL_PEOPLE } from '@hr/fixtures';
import crypto from 'crypto';

function encryptSensitiveValue(plaintext: string): string {
  if (!plaintext) return '';
  const envKey = process.env.SYSTEM_ENCRYPTION_KEY || 'hr-platform-local-secure-key-2026-32b!';
  const key = crypto.createHash('sha256').update(envKey).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function hashForBlindIndex(value: string, tenantSalt: string): string {
  if (!value) return '';
  const normalized = value.trim().toUpperCase().replace(/[\s-]/g, '');
  return crypto.createHmac('sha256', tenantSalt).update(normalized).digest('hex');
}

function maskSensitiveIdentifier(value: string, visibleChars = 4): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.length <= visibleChars) return '•'.repeat(trimmed.length);
  const maskedLength = trimmed.length - visibleChars;
  return `${'•'.repeat(Math.min(maskedLength, 8))}${trimmed.slice(-visibleChars)}`;
}

function mapPermissionToPrisma(perm: Permission): PermissionType {
  const map: Record<Permission, PermissionType> = {
    [Permission.PEOPLE_VIEW]: PermissionType.PEOPLE_VIEW,
    [Permission.PEOPLE_EDIT]: PermissionType.PEOPLE_EDIT,
    [Permission.IDENTITY_REVEAL]: PermissionType.IDENTITY_REVEAL,
    [Permission.IDENTITY_EDIT]: PermissionType.IDENTITY_EDIT,
    [Permission.CARDS_DESIGN]: PermissionType.CARDS_DESIGN,
    [Permission.CARDS_PRINT]: PermissionType.CARDS_PRINT,
    [Permission.CARDS_ISSUE]: PermissionType.CARDS_ISSUE,
    [Permission.CARDS_REVOKE]: PermissionType.CARDS_REVOKE,
    [Permission.EXPORTS_CREATE]: PermissionType.EXPORTS_CREATE,
    [Permission.ORGANIZATION_MANAGE]: PermissionType.ORGANIZATION_MANAGE,
    [Permission.USERS_MANAGE]: PermissionType.USERS_MANAGE,
    [Permission.ROLES_MANAGE]: PermissionType.ROLES_MANAGE,
    [Permission.AUDIT_VIEW]: PermissionType.AUDIT_VIEW,
    [Permission.BACKUP_MANAGE]: PermissionType.BACKUP_MANAGE,
    [Permission.SYSTEM_MANAGE]: PermissionType.SYSTEM_MANAGE,
  };
  return map[perm];
}

export async function seed() {
  console.log('🌱 Starting database seed (fictional data only)...');

  // 1. Ensure System Installation state
  let installation = await prisma.systemInstallation.findFirst();
  if (!installation) {
    installation = await prisma.systemInstallation.create({
      data: {
        isActivated: false,
        deploymentMode: 'local',
        lanEnabled: false,
      },
    });
    console.log(`✅ System Installation initialized: Unactivated (Local Mode)`);
  } else {
    console.log(`ℹ️ Existing Installation found: isActivated=${installation.isActivated}`);
  }

  // 2. Create or ensure Default Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      slug: 'default',
      name: 'Default Workspace',
    },
  });

  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

  // 3. Create Default Organization with full fields
  const org = await prisma.organization.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: 'LONDON_BOY',
      },
    },
    update: {
      name: 'London Boy Apparel Ltd.',
      displayName: 'London Boy Apparel',
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
    },
    create: {
      tenantId: tenant.id,
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
      isDefault: true,
    },
  });

  console.log(`✅ Organization: ${org.name} (${org.id})`);

  // 3.1 Create Locations
  const dhlHq = await prisma.location.upsert({
    where: {
      organizationId_code: {
        organizationId: org.id,
        code: 'DHK_HQ',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      organizationId: org.id,
      name: 'Dhaka Corporate Office',
      code: 'DHK_HQ',
      type: 'HEADQUARTERS',
      address: {
        street: 'Plot 42, Sector 3, Uttara C/A',
        city: 'Dhaka',
        postalCode: '1230',
        country: 'Bangladesh',
      },
      contactPhone: '+88028901234',
      isDefault: true,
    },
  });

  const gzpPlant = await prisma.location.upsert({
    where: {
      organizationId_code: {
        organizationId: org.id,
        code: 'GZP_PLANT',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      organizationId: org.id,
      name: 'Gazipur Manufacturing Plant',
      code: 'GZP_PLANT',
      type: 'FACTORY',
      address: {
        street: 'Bypass Road, Joydebpur',
        city: 'Gazipur',
        postalCode: '1700',
        country: 'Bangladesh',
      },
      contactPhone: '+88029205678',
      isDefault: false,
    },
  });

  console.log(`✅ Locations seeded: ${dhlHq.name}, ${gzpPlant.name}`);

  // 3.2 Create 3-Level OrgUnit Hierarchy
  const mfgDiv = await prisma.orgUnit.upsert({
    where: {
      organizationId_code: {
        organizationId: org.id,
        code: 'MFG_DIV',
      },
    },
    update: {
      nameBangla: 'উৎপাদন বিভাগ',
    },
    create: {
      tenantId: tenant.id,
      organizationId: org.id,
      parentId: null,
      name: 'Manufacturing Division',
      nameBangla: 'উৎপাদন বিভাগ',
      code: 'MFG_DIV',
      type: 'DIVISION',
      locationId: gzpPlant.id,
      sortOrder: 1,
    },
  });

  const garmentsProd = await prisma.orgUnit.upsert({
    where: {
      organizationId_code: {
        organizationId: org.id,
        code: 'GARMENTS_PROD',
      },
    },
    update: {
      nameBangla: 'পোশাক প্রস্তুতকরণ',
      parentId: mfgDiv.id,
    },
    create: {
      tenantId: tenant.id,
      organizationId: org.id,
      parentId: mfgDiv.id,
      name: 'Garments Production',
      nameBangla: 'পোশাক প্রস্তুতকরণ',
      code: 'GARMENTS_PROD',
      type: 'DEPARTMENT',
      locationId: gzpPlant.id,
      sortOrder: 1,
    },
  });

  const qaDept = await prisma.orgUnit.upsert({
    where: {
      organizationId_code: {
        organizationId: org.id,
        code: 'QA_DEPT',
      },
    },
    update: {
      nameBangla: 'মান নিয়ন্ত্রণ',
      parentId: mfgDiv.id,
    },
    create: {
      tenantId: tenant.id,
      organizationId: org.id,
      parentId: mfgDiv.id,
      name: 'Quality Assurance',
      nameBangla: 'মান নিয়ন্ত্রণ',
      code: 'QA_DEPT',
      type: 'DEPARTMENT',
      locationId: gzpPlant.id,
      sortOrder: 2,
    },
  });

  const cutSec = await prisma.orgUnit.upsert({
    where: {
      organizationId_code: {
        organizationId: org.id,
        code: 'CUT_SEC',
      },
    },
    update: {
      nameBangla: 'কাটিং সেকশন',
      parentId: garmentsProd.id,
    },
    create: {
      tenantId: tenant.id,
      organizationId: org.id,
      parentId: garmentsProd.id,
      name: 'Cutting Section',
      nameBangla: 'কাটিং সেকশন',
      code: 'CUT_SEC',
      type: 'SECTION',
      locationId: gzpPlant.id,
      sortOrder: 1,
    },
  });

  const sewLineA = await prisma.orgUnit.upsert({
    where: {
      organizationId_code: {
        organizationId: org.id,
        code: 'SEW_LINE_A',
      },
    },
    update: {
      nameBangla: 'সুইং লাইন এ',
      parentId: garmentsProd.id,
    },
    create: {
      tenantId: tenant.id,
      organizationId: org.id,
      parentId: garmentsProd.id,
      name: 'Sewing Line A',
      nameBangla: 'সুইং লাইন এ',
      code: 'SEW_LINE_A',
      type: 'LINE',
      locationId: gzpPlant.id,
      sortOrder: 2,
    },
  });

  await prisma.orgUnit.upsert({
    where: {
      organizationId_code: {
        organizationId: org.id,
        code: 'FIN_PACK',
      },
    },
    update: {
      nameBangla: 'ফিনিশিং ও প্যাকিং',
      parentId: garmentsProd.id,
    },
    create: {
      tenantId: tenant.id,
      organizationId: org.id,
      parentId: garmentsProd.id,
      name: 'Finishing & Packing',
      nameBangla: 'ফিনিশিং ও প্যাকিং',
      code: 'FIN_PACK',
      type: 'SECTION',
      locationId: gzpPlant.id,
      sortOrder: 3,
    },
  });

  const inlineQc = await prisma.orgUnit.upsert({
    where: {
      organizationId_code: {
        organizationId: org.id,
        code: 'INLINE_QC',
      },
    },
    update: {
      nameBangla: 'ফেব্রিক ও ইনলাইন কিউসি',
      parentId: qaDept.id,
    },
    create: {
      tenantId: tenant.id,
      organizationId: org.id,
      parentId: qaDept.id,
      name: 'Fabric & Inline QC',
      nameBangla: 'ফেব্রিক ও ইনলাইন কিউসি',
      code: 'INLINE_QC',
      type: 'SECTION',
      locationId: gzpPlant.id,
      sortOrder: 1,
    },
  });

  console.log(`✅ 3-Level OrgUnit hierarchy seeded.`);

  // OrgUnit map
  const orgUnitsByCode: Record<string, string> = {
    MFG_DIV: mfgDiv.id,
    GARMENTS_PROD: garmentsProd.id,
    QA_DEPT: qaDept.id,
    CUT_SEC: cutSec.id,
    SEW_LINE_A: sewLineA.id,
    INLINE_QC: inlineQc.id,
  };

  // 3.3 Seed Fictional People & Employments
  for (const personData of FICTIONAL_PEOPLE) {
    const orgUnitId = orgUnitsByCode[personData.employment.orgUnitCode] || mfgDiv.id;
    const locationId = personData.employment.locationCode === 'DHK_HQ' ? dhlHq.id : gzpPlant.id;

    // Check if employment already exists
    const existingEmp = await prisma.employment.findFirst({
      where: {
        tenantId: tenant.id,
        organizationId: org.id,
        employeeNumber: personData.employment.employeeNumber,
      },
      include: { person: true },
    });

    if (!existingEmp) {
      const person = await prisma.person.create({
        data: {
          tenantId: tenant.id,
          displayName: personData.displayName,
          displayNameLatin: personData.displayNameLatin,
          displayNameNative: personData.displayNameNative,
          givenName: personData.givenName || null,
          familyName: personData.familyName || null,
          dateOfBirth: personData.dateOfBirth ? new Date(personData.dateOfBirth) : null,
          gender: personData.gender,
          bloodGroup: personData.bloodGroup || null,
          primaryPhone: personData.primaryPhone || null,
          primaryEmail: personData.primaryEmail || null,
          address: personData.address || undefined,
          version: 1,
        },
      });

      await prisma.employment.create({
        data: {
          tenantId: tenant.id,
          personId: person.id,
          organizationId: org.id,
          locationId,
          orgUnitId,
          employeeNumber: personData.employment.employeeNumber,
          jobTitle: personData.employment.jobTitle,
          jobCategory: personData.employment.jobCategory,
          joinDate: new Date(personData.employment.joinDate),
          status: personData.employment.status,
          isPrimary: true,
          version: 1,
        },
      });

      if (personData.identityDocument) {
        const rawNumber = personData.identityDocument.number;
        await prisma.identityDocument.create({
          data: {
            tenantId: tenant.id,
            personId: person.id,
            documentType: personData.identityDocument.type,
            country: personData.identityDocument.country,
            documentNumberEncrypted: encryptSensitiveValue(rawNumber),
            documentNumberMasked: maskSensitiveIdentifier(rawNumber),
            documentNumberHash: hashForBlindIndex(rawNumber, tenant.id),
            isVerified: personData.identityDocument.isVerified,
          },
        });
      }
    }
  }

  console.log(
    `✅ Seeded ${FICTIONAL_PEOPLE.length} fictional workers with bilingual records and employments.`,
  );

  // 4. Seed Built-In Roles
  const createdRoles: Record<string, string> = {};
  for (const [roleName, permissions] of Object.entries(BUILT_IN_ROLE_PERMISSIONS)) {
    const prismaPermissions = permissions.map((p) => mapPermissionToPrisma(p as Permission));

    const role = await prisma.role.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: roleName,
        },
      },
      update: {
        permissions: prismaPermissions,
      },
      create: {
        tenantId: tenant.id,
        name: roleName,
        isBuiltIn: true,
        description: `Built-in role for ${roleName}`,
        permissions: prismaPermissions,
      },
    });
    createdRoles[roleName] = role.id;
  }

  console.log('✅ Built-in roles seeded successfully.');

  // 4.1 Seed Default Published Card Template & Organization Assignment
  const defaultLayout = createClassicVerticalPreset();
  const defaultTemplate = await prisma.cardTemplate.upsert({
    where: {
      id: 'default-classic-template',
    },
    update: {},
    create: {
      id: 'default-classic-template',
      tenantId: tenant.id,
      organizationId: org.id,
      name: 'London Boy Dual-Sided Master (60×90mm)',
      description: 'Standard 60×90 mm bilingual factory credential for production workforce',
      presetId: TemplatePresetId.CLASSIC_VERTICAL,
      isArchived: false,
    },
  });

  const defaultVersion = await prisma.templateVersion.upsert({
    where: {
      templateId_versionNumber: {
        templateId: defaultTemplate.id,
        versionNumber: 1,
      },
    },
    update: {
      status: TemplateVersionStatus.PUBLISHED,
      layout: defaultLayout as any,
    },
    create: {
      tenantId: tenant.id,
      templateId: defaultTemplate.id,
      versionNumber: 1,
      status: TemplateVersionStatus.PUBLISHED,
      layoutSchemaVersion: '1.0.0',
      layout: defaultLayout as any,
      publishedAt: new Date(),
    },
  });

  await prisma.cardTemplate.update({
    where: { id: defaultTemplate.id },
    data: { activeVersionId: defaultVersion.id },
  });

  await prisma.templateAssignment.upsert({
    where: {
      id: 'default-org-assignment',
    },
    update: {
      templateId: defaultTemplate.id,
    },
    create: {
      id: 'default-org-assignment',
      tenantId: tenant.id,
      templateId: defaultTemplate.id,
      targetType: TemplateAssignmentTarget.ORGANIZATION,
      targetId: org.id,
      priority: 50,
    },
  });

  console.log('✅ Default Card Template & Organization Assignment seeded.');

  // 5. Seed Initial Temporary Bootstrap User if system is unactivated
  if (!installation.isActivated) {
    const adminUser = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        username: 'admin',
      },
    });

    if (!adminUser) {
      const passwordHash = await hash('admin', {
        memoryCost: 65536,
        timeCost: 3,
        outputLen: 32,
        parallelism: 1,
      });

      const user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          username: 'admin',
          email: null,
          passwordHash,
          isTemporaryBootstrap: true,
          mustChangePassword: true,
          isActive: true,
        },
      });

      // Grant System Owner role
      const systemOwnerRoleId = createdRoles[BuiltInRole.SYSTEM_OWNER];
      if (systemOwnerRoleId) {
        await prisma.roleGrant.create({
          data: {
            userId: user.id,
            roleId: systemOwnerRoleId,
          },
        });
      }

      console.log('🔑 Temporary bootstrap user created: admin / admin (Activation required)');
    }
  }
}

seed()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
