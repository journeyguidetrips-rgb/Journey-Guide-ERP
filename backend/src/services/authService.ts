import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../database/connection';
import { User, UserWithRole, JWTPayload } from '../types/user';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set. Server cannot start without it.');
}

const JWT_EXPIRY = '24h';

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

// Compare password
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Generate JWT token
export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

// Verify JWT token
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};

// Get user with permissions
export const getUserWithPermissions = async (userId: number): Promise<UserWithRole | null> => {
  try {
    const query = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.role_id, u.is_active, u.created_at,
        r.name as role_name,
        COALESCE(ARRAY_AGG(p.name), ARRAY[]::text[]) as permissions
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1
      GROUP BY u.id, r.name
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0] ?? null;
  } catch (error: any) {
    console.error('getUserWithPermissions error:', error.message);
    return null;
  }
};

// Register new user
export const registerUser = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  roleId: number = 3
): Promise<User | null> => {
  try {
    if (!email || !password || !firstName || !lastName) {
      return null;
    }

    const checkResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (checkResult.rows.length > 0) {
      return null; // Email already exists
    }

    const roleResult = await pool.query(
      'SELECT id FROM roles WHERE id = $1',
      [roleId]
    );
    if (roleResult.rows.length === 0) {
      return null; // Role does not exist
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertResult = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, role_id, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, email, first_name, last_name, role_id, is_active, created_at`,
      [email, hashedPassword, firstName, lastName, roleId]
    );

    return insertResult.rows[0] ?? null;
  } catch (error: any) {
    console.error('registerUser error:', error.message);
    return null;
  }
};

// Login user
export const loginUser = async (email: string, password: string): Promise<UserWithRole | null> => {
  try {
    // Get user by email
    const userQuery = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
    const userResult = await pool.query(userQuery, [email]);
    
    if (userResult.rows.length === 0) {
      return null;
    }
    
    const user = userResult.rows[0];
    
    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }
    
    // Get user with permissions
    return await getUserWithPermissions(user.id);
  } catch (error) {
    console.error('Error logging in user:', error);
    return null;
  }
};

// Get all users
export const getAllUsers = async (): Promise<UserWithRole[]> => {
  try {
    const query = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.role_id, u.is_active, u.created_at,
        r.name as role_name,
        COALESCE(ARRAY_AGG(p.name), ARRAY[]::text[]) as permissions
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.is_active = true
      GROUP BY u.id, r.name
      ORDER BY u.created_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

// Update user role
export const updateUserRole = async (userId: number, roleId: number): Promise<boolean> => {
  try {
    const query = 'UPDATE users SET role_id = $1 WHERE id = $2';
    await pool.query(query, [roleId, userId]);
    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    return false;
  }
};

// Deactivate user
export const deactivateUser = async (userId: number): Promise<boolean> => {
  try {
    const query = 'UPDATE users SET is_active = false WHERE id = $1';
    await pool.query(query, [userId]);
    return true;
  } catch (error) {
    console.error('Error deactivating user:', error);
    return false;
  }
};