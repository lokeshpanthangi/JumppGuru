interface VideoAnalysis {
  summary: string;
  keyTopics: string[];
  mainPoints: string[];
  duration?: string;
  transcript?: string;
}

interface YouTubeVideoInfo {
  title: string;
  description: string;
  duration: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: string;
  likeCount?: string;
  tags?: string[];
}

export class YouTubeAnalysisService {
  private geminiApiKey: string;
  private youtubeApiKey?: string;

  constructor() {
    this.geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    this.youtubeApiKey = import.meta.env.VITE_YOUTUBE_API_KEY; // Optional for enhanced features
  }

  /**
   * Extract video ID from YouTube URL
   */
  extractVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Get basic video information from YouTube Data API (if available)
   */
  async getVideoInfo(videoId: string): Promise<YouTubeVideoInfo | null> {
    if (!this.youtubeApiKey) {
      return null; // Fallback to URL-only analysis
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${this.youtubeApiKey}&part=snippet,statistics,contentDetails`
      );
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const video = data.items[0];
        return {
          title: video.snippet.title,
          description: video.snippet.description,
          duration: video.contentDetails.duration,
          channelTitle: video.snippet.channelTitle,
          publishedAt: video.snippet.publishedAt,
          viewCount: video.statistics.viewCount,
          likeCount: video.statistics.likeCount,
          tags: video.snippet.tags
        };
      }
    } catch (error) {
      console.error('Error fetching video info:', error);
    }
    
    return null;
  }

  /**
   * Analyze video content using Gemini API
   */
  async analyzeVideoContent(videoUrl: string, videoInfo?: YouTubeVideoInfo): Promise<VideoAnalysis> {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const videoId = this.extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Enhanced video info if available
    const enhancedInfo = videoInfo || await this.getVideoInfo(videoId);
    
    // Construct comprehensive prompt for Gemini
    let analysisPrompt = `Analyze this YouTube video: ${videoUrl}`;
    
    if (enhancedInfo) {
      analysisPrompt += `

Video Information:
- Title: ${enhancedInfo.title}
- Channel: ${enhancedInfo.channelTitle}
- Description: ${enhancedInfo.description.substring(0, 500)}...
- Duration: ${enhancedInfo.duration}
- Published: ${enhancedInfo.publishedAt}
- Views: ${enhancedInfo.viewCount}`;
      
      if (enhancedInfo.tags && enhancedInfo.tags.length > 0) {
        analysisPrompt += `
- Tags: ${enhancedInfo.tags.slice(0, 10).join(', ')}`;
      }
    }

    analysisPrompt += `

Please provide a comprehensive analysis including:
1. A detailed summary of the video content
2. Key topics and themes covered
3. Main points and takeaways
4. Educational value and target audience
5. Any notable insights or unique perspectives

Format your response as a structured analysis that can be used for contextual conversations about this video.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: analysisPrompt
              }]
            }]
          })
        }
      );

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const analysisText = data.candidates[0].content.parts[0].text;
        
        // Parse the analysis to extract structured information
        return this.parseAnalysisResponse(analysisText, enhancedInfo);
      } else {
        throw new Error('Invalid response from Gemini API');
      }
    } catch (error) {
      console.error('Error analyzing video with Gemini:', error);
      throw error;
    }
  }

  /**
   * Parse Gemini's analysis response into structured data
   */
  private parseAnalysisResponse(analysisText: string, videoInfo?: YouTubeVideoInfo): VideoAnalysis {
    // Extract key topics (look for bullet points, numbered lists, etc.)
    const topicMatches = analysisText.match(/(?:key topics?|themes?|subjects?):[\s\S]*?(?=\n\n|$)/gi);
    const keyTopics: string[] = [];
    
    if (topicMatches) {
      const topicText = topicMatches[0];
      const topics = topicText.match(/[-•*]\s*([^\n]+)/g) || topicText.match(/\d+\.\s*([^\n]+)/g);
      if (topics) {
        keyTopics.push(...topics.map(topic => topic.replace(/^[-•*\d\.\s]+/, '').trim()));
      }
    }

    // Extract main points
    const pointMatches = analysisText.match(/(?:main points?|takeaways?|insights?):[\s\S]*?(?=\n\n|$)/gi);
    const mainPoints: string[] = [];
    
    if (pointMatches) {
      const pointText = pointMatches[0];
      const points = pointText.match(/[-•*]\s*([^\n]+)/g) || pointText.match(/\d+\.\s*([^\n]+)/g);
      if (points) {
        mainPoints.push(...points.map(point => point.replace(/^[-•*\d\.\s]+/, '').trim()));
      }
    }

    // If no structured data found, create fallback structure
    if (keyTopics.length === 0 && mainPoints.length === 0) {
      const sentences = analysisText.split(/[.!?]+/).filter(s => s.trim().length > 20);
      keyTopics.push(...sentences.slice(0, 3).map(s => s.trim()));
      mainPoints.push(...sentences.slice(3, 6).map(s => s.trim()));
    }

    return {
      summary: analysisText,
      keyTopics: keyTopics.slice(0, 5), // Limit to 5 key topics
      mainPoints: mainPoints.slice(0, 5), // Limit to 5 main points
      duration: videoInfo?.duration,
    };
  }

  /**
   * Generate contextual chat prompt with video analysis
   */
  generateContextualPrompt(
    videoAnalysis: VideoAnalysis, 
    conversationHistory: Array<{sender: string, content: string}>, 
    userMessage: string
  ): string {
    let prompt = `You are an AI assistant helping users understand and discuss a YouTube video.

Video Analysis:
Summary: ${videoAnalysis.summary}

Key Topics: ${videoAnalysis.keyTopics.join(', ')}

Main Points:
${videoAnalysis.mainPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')}`;

    if (videoAnalysis.duration) {
      prompt += `\n\nVideo Duration: ${videoAnalysis.duration}`;
    }

    if (conversationHistory.length > 0) {
      prompt += `\n\nConversation History:\n${conversationHistory.map(msg => `${msg.sender}: ${msg.content}`).join('\n')}`;
    }

    prompt += `\n\nUser Question: ${userMessage}\n\nPlease provide a helpful, accurate response based on the video content and context. Be conversational and engaging while staying focused on the video's content.`;

    return prompt;
  }

  /**
   * Send contextual message to Gemini API
   */
  async sendContextualMessage(
    userMessage: string,
    videoUrl: string,
    conversationHistory: Array<{role: string, content: string}>
  ): Promise<string> {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Build conversation context
    const conversationContext = conversationHistory.length > 0 
      ? `\n\nPrevious conversation:\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
      : '';

    const prompt = `You are an AI assistant helping users understand and discuss YouTube videos. 

Video URL: ${videoUrl}

Please analyze this YouTube video and answer the user's question based on the video content.${conversationContext}

User question: ${userMessage}

Please provide a helpful, accurate response based on the video content. Be conversational and engaging.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          })
        }
      );

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Invalid response from Gemini API');
      }
    } catch (error) {
      console.error('Error sending contextual message:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const youtubeAnalysisService = new YouTubeAnalysisService();