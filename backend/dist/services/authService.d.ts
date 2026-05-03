import { User, UserWithRole, JWTPayload } from '../types/user';
export declare const hashPassword: (password: string) => Promise<string>;
export declare const comparePassword: (password: string, hash: string) => Promise<boolean>;
export declare const generateToken: (payload: JWTPayload) => string;
export declare const verifyToken: (token: string) => JWTPayload | null;
export declare const getUserWithPermissions: (userId: number) => Promise<UserWithRole | null>;
export declare const registerUser: (email: string, password: string, firstName: string, lastName: string, roleId?: number) => Promise<User | null>;
export declare const loginUser: (email: string, password: string) => Promise<UserWithRole | null>;
export declare const getAllUsers: () => Promise<UserWithRole[]>;
export declare const updateUserRole: (userId: number, roleId: number) => Promise<boolean>;
export declare const deactivateUser: (userId: number) => Promise<boolean>;
//# sourceMappingURL=authService.d.ts.map