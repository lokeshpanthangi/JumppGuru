import React, { useState } from 'react';
import { Play, Eye, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { YouTubeModal } from './YouTubeModal';

interface YouTubeVideo {
  title: string;
  link: string;
  thumbnail: string;
  views: string;
  channel: string;
  published: string;
}

interface YouTubeCardsProps {
  videos: YouTubeVideo[];
  remainingVideos?: YouTubeVideo[];
  playgroundMode?: boolean;
  onVideoSelectForPlayground?: (video: YouTubeVideo) => void;
}

export const YouTubeCards: React.FC<YouTubeCardsProps> = ({ videos, remainingVideos = [], playgroundMode = false, onVideoSelectForPlayground }) => {
  const [showMore, setShowMore] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  
  if (!videos || videos.length === 0) {
    return (
      <div className="text-center py-4 text-text-muted">
        No videos found
      </div>
    );
  }

  const handleVideoClick = (video: YouTubeVideo) => {
    if (playgroundMode && onVideoSelectForPlayground) {
      // In playground mode, select video for playground
      onVideoSelectForPlayground(video);
    } else {
      // Normal mode - open video modal
      setSelectedVideo(video);
      setModalOpen(true);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedVideo(null);
  };

  const displayedVideos = showMore ? [...videos, ...remainingVideos] : videos;
  const hasMoreVideos = remainingVideos.length > 0;

  return (
    <>
      <div className="w-full">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {displayedVideos.map((video, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-80 bg-surface-elevated border border-input-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
            onClick={() => handleVideoClick(video)}
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gray-200">
              {video.thumbnail ? (
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-300">
                  <Play className="w-12 h-12 text-gray-500" />
                </div>
              )}
              
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300">
                  <Play className="w-6 h-6 text-white ml-1" fill="white" />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Title */}
              <h3 className="font-medium text-text-primary line-clamp-2 text-sm leading-5 mb-2 group-hover:text-brand-primary transition-colors">
                {video.title}
              </h3>

              {/* Channel */}
              <p className="text-xs text-text-muted mb-2 truncate">
                {video.channel}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-text-muted">
                {video.views && (
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{video.views}</span>
                  </div>
                )}
                {video.published && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{video.published}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        </div>
        
        {/* Show more videos button */}
        {hasMoreVideos && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setShowMore(!showMore)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover transition-colors duration-200 text-sm font-medium"
            >
              {showMore ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show less videos
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show more videos ({remainingVideos.length})
                </>
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* YouTube Modal */}
      <YouTubeModal
        isOpen={modalOpen}
        onClose={closeModal}
        videoUrl={selectedVideo?.link || ''}
        title={selectedVideo?.title || ''}
      />
    </>
  );
};

// Utility function to parse YouTube cards from markdown content
export const parseYouTubeCards = (content: string): { content: string; videos: YouTubeVideo[] | null; remainingVideos?: YouTubeVideo[] } => {
  const youtubeCardsRegex = /<youtube-cards>(.*?)<\/youtube-cards>/s;
  const match = content.match(youtubeCardsRegex);
  
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      const cleanedContent = content.replace(youtubeCardsRegex, '').trim();
      
      // Handle both old format (array) and new format (object with videos and remainingVideos)
      if (Array.isArray(data)) {
        return { content: cleanedContent, videos: data };
      } else if (data.videos) {
        return { 
          content: cleanedContent, 
          videos: data.videos,
          remainingVideos: data.remainingVideos || []
        };
      }
      
      return { content: cleanedContent, videos: null };
    } catch (error) {
      console.error('Failed to parse YouTube videos:', error);
      return { content: content.replace(youtubeCardsRegex, '⚠️ Failed to load video recommendations'), videos: null };
    }
  }
  
  return { content, videos: null };
};