import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@hr/db';
import {
  createOrgUnit,
  getOrgUnits,
  getOrgUnitTree,
  moveOrgUnit,
  updateOrgUnit,
  setOrgUnitArchived,
  deleteOrgUnit,
  HierarchyCycleError,
  SiblingNameConflictError,
  DuplicateOrgUnitCodeError,
  CrossOrganizationHierarchyError,
  OrgUnitHasChildrenError,
} from '../src/services/org-unit.service.js';
import { OrgUnitType } from '@hr/domain';

describe('Phase 3: OrgUnit Hierarchy & Integrity Rules', () => {
  let tenantId: string;
  let organizationId: string;

  beforeEach(async () => {
    const slug = `test-org-tree-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const tenant = await prisma.tenant.create({
      data: { slug, name: 'Test Tree Workspace' },
    });
    tenantId = tenant.id;

    const org = await prisma.organization.create({
      data: {
        tenantId,
        name: 'London Boy Apparel Ltd.',
        displayName: 'London Boy Apparel',
        code: `LONDON_BOY_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      },
    });
    organizationId = org.id;
  });

  afterEach(async () => {
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    }
  });

  describe('Tree Creation & Hierarchy Assembly', () => {
    it('creates root, child, and grandchild units with Unicode/Bangla support', async () => {
      // Level 1: Division
      const div = await createOrgUnit(tenantId, {
        organizationId,
        name: 'Manufacturing Division',
        nameBangla: 'উৎপাদন বিভাগ',
        code: 'MFG_DIV',
        type: OrgUnitType.DIVISION,
      });

      expect(div.id).toBeDefined();
      expect(div.parentId).toBeNull();
      expect(div.nameBangla).toBe('উৎপাদন বিভাগ');

      // Level 2: Department
      const dept = await createOrgUnit(tenantId, {
        organizationId,
        parentId: div.id,
        name: 'Garments Production',
        nameBangla: 'পোশাক প্রস্তুতকরণ',
        code: 'GARMENTS_PROD',
        type: OrgUnitType.DEPARTMENT,
      });

      expect(dept.parentId).toBe(div.id);

      // Level 3: Section
      const sec = await createOrgUnit(tenantId, {
        organizationId,
        parentId: dept.id,
        name: 'Cutting Section',
        nameBangla: 'কাটিং সেকশন',
        code: 'CUT_SEC',
        type: OrgUnitType.SECTION,
      });

      expect(sec.parentId).toBe(dept.id);

      // Retrieve tree
      const tree = await getOrgUnitTree(tenantId, organizationId);
      expect(tree).toHaveLength(1);
      expect(tree[0]!.name).toBe('Manufacturing Division');
      expect(tree[0]!.children).toHaveLength(1);
      expect(tree[0]!.children[0]!.name).toBe('Garments Production');
      expect(tree[0]!.children[0]!.children).toHaveLength(1);
      expect(tree[0]!.children[0]!.children[0]!.name).toBe('Cutting Section');

      // Check breadcrumbs
      const flat = await getOrgUnits(tenantId, organizationId);
      const cuttingUnit = flat.find((u) => u.code === 'CUT_SEC');
      expect(cuttingUnit?.breadcrumbPath).toBe(
        'Manufacturing Division > Garments Production > Cutting Section',
      );
    });

    it('enforces sibling name uniqueness under the same parent', async () => {
      const div = await createOrgUnit(tenantId, {
        organizationId,
        name: 'Operations',
        code: 'OPS',
        type: OrgUnitType.DIVISION,
      });

      await createOrgUnit(tenantId, {
        organizationId,
        parentId: div.id,
        name: 'Quality Assurance',
        code: 'QA_1',
        type: OrgUnitType.DEPARTMENT,
      });

      // Attempting to create sibling with same name (case-insensitive) should throw
      await expect(
        createOrgUnit(tenantId, {
          organizationId,
          parentId: div.id,
          name: 'quality assurance',
          code: 'QA_2',
          type: OrgUnitType.DEPARTMENT,
        }),
      ).rejects.toThrow(SiblingNameConflictError);
    });

    it('allows identical unit names under DIFFERENT parents', async () => {
      const div1 = await createOrgUnit(tenantId, {
        organizationId,
        name: 'Plant A',
        code: 'PLANT_A',
        type: OrgUnitType.DIVISION,
      });

      const div2 = await createOrgUnit(tenantId, {
        organizationId,
        name: 'Plant B',
        code: 'PLANT_B',
        type: OrgUnitType.DIVISION,
      });

      const dept1 = await createOrgUnit(tenantId, {
        organizationId,
        parentId: div1.id,
        name: 'Maintenance',
        code: 'MAINT_A',
        type: OrgUnitType.DEPARTMENT,
      });

      const dept2 = await createOrgUnit(tenantId, {
        organizationId,
        parentId: div2.id,
        name: 'Maintenance',
        code: 'MAINT_B',
        type: OrgUnitType.DEPARTMENT,
      });

      expect(dept1.id).toBeDefined();
      expect(dept2.id).toBeDefined();
      expect(dept1.parentId).not.toBe(dept2.parentId);
    });
  });

  describe('Cycle Prevention & Hierarchy Moves', () => {
    it('prevents a unit from being moved to become its own child', async () => {
      const root = await createOrgUnit(tenantId, {
        organizationId,
        name: 'Root Division',
        code: 'ROOT_DIV',
        type: OrgUnitType.DIVISION,
      });

      await expect(moveOrgUnit(tenantId, root.id, root.id)).rejects.toThrow(HierarchyCycleError);
    });

    it('prevents moving a parent unit into its own descendant (deep cycle check)', async () => {
      // Level 1: A
      const nodeA = await createOrgUnit(tenantId, {
        organizationId,
        name: 'Node A',
        code: 'NODE_A',
        type: OrgUnitType.DIVISION,
      });

      // Level 2: B (child of A)
      const nodeB = await createOrgUnit(tenantId, {
        organizationId,
        parentId: nodeA.id,
        name: 'Node B',
        code: 'NODE_B',
        type: OrgUnitType.DEPARTMENT,
      });

      // Level 3: C (child of B)
      const nodeC = await createOrgUnit(tenantId, {
        organizationId,
        parentId: nodeB.id,
        name: 'Node C',
        code: 'NODE_C',
        type: OrgUnitType.SECTION,
      });

      // Attempting to move Node A under Node C would create A -> B -> C -> A
      await expect(moveOrgUnit(tenantId, nodeA.id, nodeC.id)).rejects.toThrow(HierarchyCycleError);

      // Attempting to move Node A under Node B would create A -> B -> A
      await expect(moveOrgUnit(tenantId, nodeA.id, nodeB.id)).rejects.toThrow(HierarchyCycleError);
    });

    it('successfully moves a unit to another valid branch and records previous parent', async () => {
      const branch1 = await createOrgUnit(tenantId, {
        organizationId,
        name: 'Branch 1',
        code: 'BR1',
        type: OrgUnitType.DIVISION,
      });

      const branch2 = await createOrgUnit(tenantId, {
        organizationId,
        name: 'Branch 2',
        code: 'BR2',
        type: OrgUnitType.DIVISION,
      });

      const team = await createOrgUnit(tenantId, {
        organizationId,
        parentId: branch1.id,
        name: 'Design Team',
        code: 'DESIGN_TEAM',
        type: OrgUnitType.TEAM,
      });

      expect(team.parentId).toBe(branch1.id);

      const moveResult = await moveOrgUnit(tenantId, team.id, branch2.id);
      expect(moveResult.previousParentId).toBe(branch1.id);
      expect(moveResult.unit.parentId).toBe(branch2.id);
    });

    it('rejects cross-organization parent assignments', async () => {
      const otherOrg = await prisma.organization.create({
        data: {
          tenantId,
          name: 'Other Company Ltd.',
          code: 'OTHER_ORG',
        },
      });

      const otherUnit = await createOrgUnit(tenantId, {
        organizationId: otherOrg.id,
        name: 'Other Org Unit',
        code: 'OTHER_UNIT',
        type: OrgUnitType.DIVISION,
      });

      const myUnit = await createOrgUnit(tenantId, {
        organizationId,
        name: 'My Unit',
        code: 'MY_UNIT',
        type: OrgUnitType.DIVISION,
      });

      await expect(moveOrgUnit(tenantId, myUnit.id, otherUnit.id)).rejects.toThrow(
        CrossOrganizationHierarchyError,
      );
    });
  });

  describe('Archiving & Safe Deletion', () => {
    it('blocks hard deletion of units that have child units', async () => {
      const parent = await createOrgUnit(tenantId, {
        organizationId,
        name: 'Parent Unit',
        code: 'PARENT_U',
        type: OrgUnitType.DIVISION,
      });

      await createOrgUnit(tenantId, {
        organizationId,
        parentId: parent.id,
        name: 'Child Unit',
        code: 'CHILD_U',
        type: OrgUnitType.DEPARTMENT,
      });

      await expect(deleteOrgUnit(tenantId, parent.id)).rejects.toThrow(OrgUnitHasChildrenError);
    });

    it('allows archiving a unit and hides it from active tree queries by default', async () => {
      const unit = await createOrgUnit(tenantId, {
        organizationId,
        name: 'Legacy Dept',
        code: 'LEGACY_DEPT',
        type: OrgUnitType.DEPARTMENT,
      });

      // Archive unit
      await setOrgUnitArchived(tenantId, unit.id, true);

      // Active tree query should not include it
      const activeTree = await getOrgUnitTree(tenantId, organizationId);
      expect(activeTree.some((u) => u.id === unit.id)).toBe(false);

      // Query with includeArchived should include it
      const allTree = await getOrgUnitTree(tenantId, organizationId, {
        includeArchived: true,
      });
      expect(allTree.some((u) => u.id === unit.id)).toBe(true);
    });
  });
});
