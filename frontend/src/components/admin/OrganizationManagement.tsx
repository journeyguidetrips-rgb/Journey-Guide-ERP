import React, { useState, useEffect } from 'react';
import { fetchAllOrganizations, createOrganization, deleteOrganization } from '../../services/adminService';

const OrganizationManagement: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const orgsData = await fetchAllOrganizations();
        setOrganizations(orgsData);
      } catch (err) {
        setError('Failed to fetch organizations');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Organization Management</h2>
      {/* Render organizations UI */}
    </div>
  );
};

export default OrganizationManagement;