export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role_id: number;
    is_active: boolean;
    created_at: string;
  }
  
  export interface UserWithRole extends User {
    role_name: string;
    permissions: string[];
  }
  
  export interface LoginRequest {
    email: string;
    password: string;
  }
  
  export interface LoginResponse {
    success: boolean;
    token: string;
    user: UserWithRole;
  }
  
  export interface JWTPayload {
    id: number;
    email: string;
    role_id: number;
    permissions: string[];
  }