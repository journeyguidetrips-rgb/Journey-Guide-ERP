// frontend/src/pages/AdminDashboard.tsx
import React, { useState } from 'react';
import UserManagement from '../components/admin/UserManagement';
import RoleManagement from '../components/admin/RoleManagement';
import PermissionManagement from '../components/admin/PermissionManagement';
import OrganizationManagement from '../components/admin/OrganizationManagement';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'permissions' | 'organizations'>('users');

  // Tab configuration
  const tabs = [
    { id: 'users', label: 'User Management', component: <UserManagement /> },
    { id: 'roles', label: 'Role Management', component: <RoleManagement /> },
    { id: 'permissions', label: 'Permission Management', component: <PermissionManagement /> },
    { id: 'organizations', label: 'Organization Management', component: <OrganizationManagement /> },
  ];

  // Find the active tab component
  const activeTabComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Central Administration</h1>
          <p className="text-gray-500 mt-1">Handle all users and roles</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 shadow-sm overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[100px] py-2.5 px-4 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>      

      {/* Tab Content */}
      {activeTabComponent}
    </div>
  );
};

export default AdminDashboard;