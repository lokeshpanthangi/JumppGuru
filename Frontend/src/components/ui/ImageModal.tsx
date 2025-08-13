import React from 'react';
import { X } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  alt?: string;
}

export const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageSrc, alt }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-all duration-200 z-10"
        aria-label="Close image"
      >
        <X className="w-6 h-6 text-white" />
      </button>
      
      {/* Image */}
      <div className="relative max-w-[50vw] max-h-[50vh] flex items-center justify-center">
        <img
          src={imageSrc}
          alt={alt || 'Image'}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          style={{ maxWidth: '80vw', maxHeight: '80vh' }}
        />
      </div>
    </div>
  );
};
