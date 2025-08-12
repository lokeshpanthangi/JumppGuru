import React from 'react';
import { X } from 'lucide-react';

interface YouTubeModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
}

export const YouTubeModal: React.FC<YouTubeModalProps> = ({ isOpen, onClose, videoUrl, title }) => {
  if (!isOpen) return null;

  // Extract video ID from YouTube URL
  const getYouTubeVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const videoId = getYouTubeVideoId(videoUrl);
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : '';

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-all duration-200 z-10"
        aria-label="Close video"
      >
        <X className="w-6 h-6 text-white" />
      </button>
      
      {/* Video Content */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl max-w-4xl w-full max-h-[70vh]">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white">
            <p>Unable to load video</p>
          </div>
        )}
      </div>
    </div>
  );
};