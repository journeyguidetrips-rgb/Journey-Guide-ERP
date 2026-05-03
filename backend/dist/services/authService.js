"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivateUser = exports.updateUserRole = exports.getAllUsers = exports.loginUser = exports.registerUser = exports.getUserWithPermissions = exports.verifyToken = exports.generateToken = exports.comparePassword = exports.hashPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const connection_1 = require("../database/connection");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = '24h';
// Hash password
const hashPassword = async (password) => {
    console.log('🔐 Hashing password...');
    try {
        const hashed = await bcryptjs_1.default.hash(password, 10);
        console.log('✅ Password hashed successfully');
        return hashed;
    }
    catch (error) {
        console.error('❌ Password hashing failed:', error.message);
        throw error;
    }
};
exports.hashPassword = hashPassword;
// Compare password
const comparePassword = async (password, hash) => {
    return bcryptjs_1.default.compare(password, hash);
};
exports.comparePassword = comparePassword;
// Generate JWT token
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};
exports.generateToken = generateToken;
// Verify JWT token
const verifyToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (error) {
        return null;
    }
};
exports.verifyToken = verifyToken;
// Get user with permissions
const getUserWithPermissions = async (userId) => {
    console.log(`📋 Fetching user #${userId} with permissions...`);
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
        console.log('   Executing query...');
        const result = await connection_1.pool.query(query, [userId]);
        if (result.rows.length === 0) {
            console.error(`��� User #${userId} not found`);
            return null;
        }
        console.log(`✅ User fetched: ${result.rows[0].email}`);
        return result.rows[0];
    }
    catch (error) {
        console.error('❌ Error fetching user with permissions:', error.message);
        console.error('   Stack:', error.stack);
        return null;
    }
};
exports.getUserWithPermissions = getUserWithPermissions;
// Register new user
const registerUser = async (email, password, firstName, lastName, roleId = 3) => {
    console.log('\n========== USER REGISTRATION ==========');
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${firstName} ${lastName}`);
    console.log(`👥 Role ID: ${roleId}`);
    try {
        // Step 1: Validate inputs
        console.log('\n[STEP 1] Validating inputs...');
        if (!email || !password || !firstName || !lastName) {
            console.error('❌ Missing required fields');
            return null;
        }
        console.log('✅ All inputs provided');
        // Step 2: Check if email already exists
        console.log('\n[STEP 2] Checking if email already exists...');
        const checkQuery = 'SELECT id FROM users WHERE email = $1';
        const checkResult = await connection_1.pool.query(checkQuery, [email]);
        if (checkResult.rows.length > 0) {
            console.error(`��� Email already exists (User ID: ${checkResult.rows[0].id})`);
            return null;
        }
        console.log('✅ Email is unique');
        // Step 3: Verify role exists
        console.log('\n[STEP 3] Verifying role exists...');
        const roleQuery = 'SELECT id FROM roles WHERE id = $1';
        const roleResult = await connection_1.pool.query(roleQuery, [roleId]);
        if (roleResult.rows.length === 0) {
            console.error(`❌ Role ID ${roleId} does not exist`);
            console.log('   Available roles:');
            const allRoles = await connection_1.pool.query('SELECT id, name FROM roles');
            allRoles.rows.forEach(r => console.log(`   - Role ${r.id}: ${r.name}`));
            return null;
        }
        console.log(`✅ Role exists: ${roleResult.rows[0].id}`);
        // Step 4: Hash password
        console.log('\n[STEP 4] Hashing password...');
        const hashedPassword = await (0, exports.hashPassword)(password);
        console.log('✅ Password hashed');
        // Step 5: Insert user into database
        console.log('\n[STEP 5] Inserting user into database...');
        const insertQuery = `
      INSERT INTO users (email, password, first_name, last_name, role_id, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id, email, first_name, last_name, role_id, is_active, created_at
    `;
        console.log('   Query:', insertQuery);
        console.log('   Parameters: [$1=email, $2=hashed_password, $3=firstName, $4=lastName, $5=roleId]');
        const insertResult = await connection_1.pool.query(insertQuery, [
            email,
            hashedPassword,
            firstName,
            lastName,
            roleId,
        ]);
        if (insertResult.rows.length === 0) {
            console.error('❌ Insert query returned no rows');
            return null;
        }
        console.log('✅ User inserted successfully');
        console.log(`   User ID: ${insertResult.rows[0].id}`);
        console.log(`   Email: ${insertResult.rows[0].email}`);
        console.log('========== REGISTRATION COMPLETE ==========\n');
        return insertResult.rows[0];
    }
    catch (error) {
        console.error('\n❌ REGISTRATION FAILED');
        console.error('   Error Message:', error.message);
        console.error('   Error Code:', error.code);
        console.error('   Error Detail:', error.detail);
        console.error('   Error Stack:', error.stack);
        console.error('========== REGISTRATION COMPLETE ==========\n');
        return null;
    }
};
exports.registerUser = registerUser;
// Login user
const loginUser = async (email, password) => {
    try {
        // Get user by email
        const userQuery = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
        const userResult = await connection_1.pool.query(userQuery, [email]);
        if (userResult.rows.length === 0) {
            return null;
        }
        const user = userResult.rows[0];
        // Verify password
        const isPasswordValid = await (0, exports.comparePassword)(password, user.password);
        if (!isPasswordValid) {
            return null;
        }
        // Get user with permissions
        return await (0, exports.getUserWithPermissions)(user.id);
    }
    catch (error) {
        console.error('Error logging in user:', error);
        return null;
    }
};
exports.loginUser = loginUser;
// Get all users
const getAllUsers = async () => {
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
        const result = await connection_1.pool.query(query);
        return result.rows;
    }
    catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
};
exports.getAllUsers = getAllUsers;
// Update user role
const updateUserRole = async (userId, roleId) => {
    try {
        const query = 'UPDATE users SET role_id = $1 WHERE id = $2';
        await connection_1.pool.query(query, [roleId, userId]);
        return true;
    }
    catch (error) {
        console.error('Error updating user role:', error);
        return false;
    }
};
exports.updateUserRole = updateUserRole;
// Deactivate user
const deactivateUser = async (userId) => {
    try {
        const query = 'UPDATE users SET is_active = false WHERE id = $1';
        await connection_1.pool.query(query, [userId]);
        return true;
    }
    catch (error) {
        console.error('Error deactivating user:', error);
        return false;
    }
};
exports.deactivateUser = deactivateUser;
//# sourceMappingURL=authService.js.map