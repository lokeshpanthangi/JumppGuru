import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUser: (name: string) => void;
  isCreating: boolean;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ 
  isOpen, 
  onClose, 
  onCreateUser, 
  isCreating 
}) => {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isCreating) return;
    
    onCreateUser(name.trim());
    setName('');
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isCreating) {
      onClose();
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setName('');
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-surface-elevated rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-text-primary">Create New User</h2>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="p-1 rounded-full hover:bg-button-secondary transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="userName" className="block text-sm font-medium text-text-primary mb-2">
              User Name
            </label>
            <input
              id="userName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name..."
              disabled={isCreating}
              className="w-full px-4 py-3 bg-[hsl(var(--input-field-bg)/0.85)] border border-input-border rounded-lg 
                       text-text-primary placeholder:text-text-muted
                       focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:bg-[hsl(var(--input-field-bg)/0.95)]
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="flex-1 px-4 py-2 border border-input-border text-text-primary rounded-lg
                       hover:bg-button-secondary transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg
                       hover:bg-brand-primary-hover transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
