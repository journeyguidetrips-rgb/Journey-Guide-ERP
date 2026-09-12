// backend/src/routes/admin.ts
import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { isSuperAdmin } from '../middleware/adminMiddleware';
import {
  getAllUsers,
  getAllRoles,
  getAllOrganizations,
  getAllPermissions,
  getAllPermissionsAssignedToRole,
  removePermissionFromRole,
  assignPermissionToRole,
  createUserRole,
  updateUserRole
} from '../services/adminService';

const router = express.Router();

// Apply authenticate FIRST, then isSuperAdmin
router.use(authenticate, isSuperAdmin); // ✅ Correct order

// Get user roles
router.get('/roles', authenticate, async (req, res) => {
  try {
    const result = await getAllRoles();

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create user roles
router.put('/roles', authenticate, async (req, res) => {
  try {
    const { roleName, roleDescription } = req.body;
    const result = await createUserRole(roleName, roleDescription);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update user roles
router.put('/updateRoles', authenticate, async (req, res) => {
  try {
    const { id, roleName, roleDescription } = req.body;
    const result = await updateUserRole(id, roleName, roleDescription);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user permissions
router.get('/permissions', authenticate, async (req, res) => {
  try {
    const result = await getAllPermissions();

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user permissions assigned to roles
router.get('/permissionsAssignedToRole', authenticate, async (req, res) => {
  try {
    const result = await getAllPermissionsAssignedToRole();

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Remove permission for role
router.delete(`/roles/:roleId/permissions/:permissionId`, authenticate, async (req, res) => {
  try {
    const result = await removePermissionFromRole(parseInt(req.params.roleId), parseInt(req.params.permissionId));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add permission to role
router.put(`/roles/:roleId/permissions/:permissionId`, authenticate, async (req, res) => {
  try {
    const result = await assignPermissionToRole(parseInt(req.params.roleId), parseInt(req.params.permissionId));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;