import React, { useState, useEffect } from 'react';
import { X, User, Check } from 'lucide-react';

interface UserData {
  name: string;
  username: string;
}

interface SwitchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchUser: (user: UserData) => void;
  currentUsername: string;
  isLoading: boolean;
}

export const SwitchUserModal: React.FC<SwitchUserModalProps> = ({ 
  isOpen, 
  onClose, 
  onSwitchUser, 
  currentUsername,
  isLoading 
}) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      setFetchError(null);
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
      
      const response = await fetch(`${BACKEND_URL}/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const data = await response.json();
      
      // Assuming the API returns an array of users or {users: [...]}
      const usersList = Array.isArray(data) ? data : data.users || [];
      setUsers(usersList);
      
    } catch (error) {
      console.error('Error fetching users:', error);
      setFetchError(error instanceof Error ? error.message : 'Failed to fetch users');
    }
  };

  const handleUserSelect = (user: UserData) => {
    if (!isLoading && user.username !== currentUsername) {
      onSwitchUser(user);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-surface-elevated rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-text-primary">Switch User</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-1 rounded-full hover:bg-button-secondary transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-80 overflow-y-auto">
          {fetchError ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-4">⚠️ {fetchError}</div>
              <button
                onClick={fetchUsers}
                className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-text-muted mb-4">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-primary border-t-transparent"></div>
                    Loading users...
                  </div>
                ) : (
                  'No users found'
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user, index) => {
                const isSelected = user.username === currentUsername;
                return (
                  <button
                    key={user.username || index}
                    onClick={() => handleUserSelect(user)}
                    disabled={isLoading || isSelected}
                    className={`w-full p-4 rounded-lg border transition-all duration-200 text-left
                      ${isSelected 
                        ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' 
                        : 'bg-transparent border-input-border text-text-primary hover:bg-button-secondary hover:border-brand-primary/50'
                      }
                      ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-brand-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{user.name}</div>
                        <div className="text-sm text-text-muted truncate">@{user.username}</div>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-brand-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-input-border">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="w-full px-4 py-2 border border-input-border text-text-primary rounded-lg
                     hover:bg-button-secondary transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
