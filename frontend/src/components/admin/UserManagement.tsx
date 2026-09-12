import React, { useState, useEffect } from 'react';
import { fetchAllUsers, createUser, deleteUser, updateUserRole, fetchAllRoles, fetchAllOrganizations } from '../../services/adminService';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    roleId: 0,
    orgId: 0,
  });

  // Fetch data ONLY when this component mounts
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch ONLY users, roles, and organizations for this component
        const [usersData, rolesData, orgsData] = await Promise.all([
          fetchAllUsers(),
          fetchAllRoles(),
          fetchAllOrganizations(),
        ]);
        setUsers(usersData);
        setRoles(rolesData);
        setOrganizations(orgsData);
      } catch (err) {
        setError('Failed to fetch data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);  // Empty dependency array = runs once on mount

  // Rest of the component (unchanged)
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">User Management</h2>
      {/* Render user management UI */}
    </div>
  );
};

export default UserManagement;