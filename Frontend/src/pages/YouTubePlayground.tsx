import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Play, ExternalLink } from 'lucide-react';
import Playground from './Playground';

interface PlaygroundData {
  html_content: string;
  video_title: string;
  success: boolean;
  message: string;
}

const YouTubePlayground: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playgroundData, setPlaygroundData] = useState<PlaygroundData | null>(null);
  
  const youtubeUrl = searchParams.get('url');

  useEffect(() => {
    if (!videoId || !youtubeUrl) {
      setError('Invalid playground URL - missing video ID or YouTube URL');
      setLoading(false);
      return;
    }

    generatePlayground();
  }, [videoId, youtubeUrl]);

  const generatePlayground = async () => {
    if (!youtubeUrl) return;

    try {
      setLoading(true);
      setError(null);

      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      
      const response = await fetch(`${backendUrl}/api/youtube-learning/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: youtubeUrl
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PlaygroundData = await response.json();
      
      if (!data.html_content) {
        throw new Error(data.message || 'Failed to generate playground');
      }

      setPlaygroundData(data);
    } catch (error) {
      console.error('Error generating playground:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate playground');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    generatePlayground();
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const openYouTubeVideo = () => {
    if (youtubeUrl) {
      window.open(youtubeUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="bg-surface-elevated border-b border-input-border px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoBack}
              className="p-2 hover:bg-button-secondary rounded-lg transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-text-primary" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">YouTube Learning Playground</h1>
              <p className="text-sm text-text-muted">Generating interactive learning experience...</p>
            </div>
          </div>
        </div>

        {/* Loading Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <Loader2 className="w-16 h-16 text-brand-primary animate-spin mx-auto" />
            </div>
            <h2 className="text-2xl font-semibold text-text-primary mb-3">
              Creating Your Learning Playground
            </h2>
            <p className="text-text-secondary mb-6">
              We're analyzing the YouTube video and generating an interactive learning experience. 
              This may take a few moments...
            </p>
            <div className="bg-surface-elevated rounded-lg p-4 border border-input-border">
              <p className="text-sm text-text-muted">
                Processing video: <span className="font-medium text-text-primary">{videoId}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="bg-surface-elevated border-b border-input-border px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoBack}
              className="p-2 hover:bg-button-secondary rounded-lg transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-text-primary" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">YouTube Learning Playground</h1>
              <p className="text-sm text-text-muted">Failed to generate playground</p>
            </div>
          </div>
        </div>

        {/* Error Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            </div>
            <h2 className="text-2xl font-semibold text-text-primary mb-3">
              Oops! Something went wrong
            </h2>
            <p className="text-text-secondary mb-6">
              {error}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleRetry}
                className="px-6 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Loader2 className="w-4 h-4" />
                Try Again
              </button>
              {youtubeUrl && (
                <button
                  onClick={openYouTubeVideo}
                  className="px-6 py-3 bg-surface-elevated hover:bg-button-secondary text-text-primary rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-input-border"
                >
                  <ExternalLink className="w-4 h-4" />
                  Watch on YouTube
                </button>
              )}
              <button
                onClick={handleGoBack}
                className="px-6 py-3 text-text-secondary hover:text-text-primary transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!playgroundData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-surface-elevated border-b border-input-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoBack}
              className="p-2 hover:bg-button-secondary rounded-lg transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-text-primary" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">
                {playgroundData?.video_title || 'YouTube Learning Playground'}
              </h1>
              <p className="text-sm text-text-muted">Interactive learning experience</p>
            </div>
          </div>
          
          {youtubeUrl && (
            <button
              onClick={openYouTubeVideo}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Watch on YouTube
            </button>
          )}
        </div>
      </div>

      {/* Playground Content */}
      <div
  style={{
    border: '2px solid light-dark(#000, #fff)',
    borderRadius: '8px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh', // full viewport height
    maxHeight: '100vh', // prevent shrinking
    minHeight: '100vh', // prevent shrinking
    overflow: 'hidden',
    position: 'relative',
  }}
>
  <div style={{ height: '100%', width: '100%', position: 'relative' }}>
    <iframe
      srcDoc={playgroundData.html_content}
      style={{
        border: 'none',
        width: '100%',
        height: '100%',
      }}
      title="rendered-html"
      sandbox="allow-scripts"
    />
  </div>
</div>

      {/* <div className="flex-1 overflow-auto">
        <div 
          className="playground-content w-full h-full"
        //   dangerouslySetInnerHTML={{ __html: playgroundData.html_content }}
        />
        <Playground playgroundData={playgroundData} />
      </div> */}
     

    </div>
  );
};

export default YouTubePlayground;


const html_content={
    "html_content": "```html\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Craft Your Own Plant Milk</title>\n    <style>\n        :root {\n            --primary-color: #4a7c59;\n            --secondary-color: #f3f0e9;\n            --accent-color: #d4a373;\n            --text-color: #333;\n            --disabled-color: #c0c0c0;\n            --white-color: #fff;\n            --success-color: #5cb85c;\n        }\n\n        body {\n            font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;\n            background-color: var(--secondary-color);\n            color: var(--text-color);\n            margin: 0;\n            padding: 20px;\n            display: flex;\n            justify-content: center;\n            align-items: center;\n            min-height: 100vh;\n            -webkit-user-select: none; /* Safari */\n            -ms-user-select: none; /* IE 10 and IE 11 */\n            user-select: none; /* Standard syntax */\n        }\n\n        #app-container {\n            width: 100%;\n            max-width: 800px;\n            background-color: var(--white-color);\n            border-radius: 15px;\n            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);\n            overflow: hidden;\n            border: 1px solid #ddd;\n        }\n\n        .screen {\n            display: none;\n            padding: 25px 35px;\n            flex-direction: column;\n            align-items: center;\n            text-align: center;\n        }\n\n        .screen.active {\n            display: flex;\n        }\n\n        h1 {\n            font-size: 2.2rem;\n            color: var(--primary-color);\n            margin-bottom: 10px;\n        }\n\n        h2 {\n            font-size: 1.5rem;\n            color: var(--primary-color);\n            margin-bottom: 20px;\n        }\n\n        p {\n            font-size: 1.1rem;\n            line-height: 1.6;\n            max-width: 600px;\n        }\n        \n        .info-box {\n            background-color: #e8f5e9;\n            border-left: 4px solid var(--primary-color);\n            padding: 10px 15px;\n            margin: 10px 0;\n            font-size: 0.9rem;\n            text-align: left;\n            border-radius: 4px;\n        }\n\n        .button {\n            background-color: var(--primary-color);\n            color: var(--white-color);\n            border: none;\n            padding: 15px 30px;\n            font-size: 1.1rem;\n            font-weight: bold;\n            border-radius: 50px;\n            cursor: pointer;\n            transition: background-color 0.3s, transform 0.2s;\n            margin-top: 20px;\n        }\n\n        .button:hover {\n            background-color: #3b6347;\n            transform: translateY(-2px);\n        }\n\n        .button:disabled {\n            background-color: var(--disabled-color);\n            cursor: not-allowed;\n            transform: none;\n        }\n\n        /* Screen 2: Ingredient Selection */\n        #selection-grid {\n            display: grid;\n            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));\n            gap: 15px;\n            width: 100%;\n            margin-top: 20px;\n        }\n\n        .item {\n            border: 2px solid #ddd;\n            border-radius: 10px;\n            padding: 10px;\n            cursor: pointer;\n            transition: all 0.2s ease-in-out;\n            position: relative;\n        }\n\n        .item.selected {\n            border-color: var(--accent-color);\n            background-color: #fffaf0;\n            transform: scale(1.05);\n        }\n        \n        .item.selected::after {\n            content: '✔';\n            position: absolute;\n            top: 5px;\n            right: 8px;\n            color: var(--success-color);\n            font-size: 1.5rem;\n            font-weight: bold;\n        }\n        \n        .item img {\n            width: 60px;\n            height: 60px;\n            object-fit: contain;\n            margin-bottom: 5px;\n        }\n        \n        .item-name {\n            font-size: 0.9rem;\n        }\n\n        /* Screens 3-6: Simulation Workspace */\n        .workspace {\n            width: 100%;\n            min-height: 300px;\n            background-color: #f9f9f9;\n            border: 1px dashed #ccc;\n            border-radius: 10px;\n            margin-top: 20px;\n            padding: 20px;\n            display: flex;\n            justify-content: space-around;\n            align-items: center;\n            flex-wrap: wrap;\n            gap: 20px;\n            position: relative;\n        }\n        \n        .workspace-item {\n            border: 2px solid var(--accent-color);\n            background: var(--white-color);\n            border-radius: 10px;\n            padding: 10px;\n            min-width: 100px;\n            min-height: 100px;\n            display: flex;\n            flex-direction: column;\n            justify-content: center;\n            align-items: center;\n            text-align: center;\n            position: relative;\n            transition: all 0.3s ease;\n        }\n\n        .workspace-item.clickable {\n            cursor: pointer;\n        }\n\n        .workspace-item.clickable:hover {\n            border-color: var(--primary-color);\n            box-shadow: 0 0 10px rgba(0,0,0,0.1);\n        }\n        \n        .workspace-item.is-selected-for-action {\n            border-color: var(--primary-color);\n            border-style: dashed;\n            transform: scale(1.05);\n        }\n\n        .workspace-item .content {\n            font-size: 0.8rem;\n            color: #666;\n        }\n\n        #bowl .content::before { content: 'Empty Bowl'; }\n        #bowl.has-almonds .content::before { content: 'Almonds'; }\n        #bowl.has-water .content::before { content: 'Almonds in Water'; background-color: #add8e6; padding: 5px; border-radius: 5px;}\n        #bowl.soaked .content::before { content: 'Soaked Almonds'; background-color: #a39171; color: white; padding: 5px; border-radius: 5px;}\n        \n        #blender .content::before { content: 'Empty Blender'; }\n        #blender.has-ingredients .content::before { content: 'Almonds, Water, Salt'; }\n        #blender.is-blending .content { animation: shake 0.5s infinite; }\n        #blender.is-blended .content::before { content: 'Creamy Milk'; background: #fdf5e6; padding: 5px; border-radius: 5px;}\n\n        #pitcher .content::before { content: 'Empty Pitcher'; }\n        #pitcher.has-bag .content::before { content: 'Pitcher with Bag'; }\n        #pitcher.has-milk-in-bag .content::before { content: 'Milk in Bag'; }\n        #pitcher.is-squeezing .content::before { content: 'Straining...'; }\n        #pitcher.has-strained-milk { background-image: linear-gradient(to top, #fdf5e6 80%, transparent 80%); }\n        #pitcher.has-strained-milk .content::before { content: 'Fresh Milk!'; }\n        \n        #storage-bottle .content::before { content: 'Empty Bottle'; }\n        #storage-bottle.is-full { background-image: linear-gradient(to top, #fdf5e6 95%, transparent 95%); }\n        #storage-bottle.is-full .content::before { content: 'Enjoy!'; }\n\n        .overlay-text {\n            position: absolute;\n            top: 50%;\n            left: 50%;\n            transform: translate(-50%, -50%);\n            background-color: rgba(0, 0, 0, 0.7);\n            color: white;\n            padding: 15px 25px;\n            border-radius: 10px;\n            font-size: 1.2rem;\n            z-index: 10;\n            display: none; /* Hidden by default */\n        }\n        \n        #blending-options {\n            display: flex;\n            gap: 20px;\n            align-items: center;\n            margin-top: 15px;\n        }\n        #blending-options label { font-size: 0.9rem; }\n\n        @keyframes shake {\n            0% { transform: translate(1px, 1px) rotate(0deg); }\n            10% { transform: translate(-1px, -2px) rotate(-1deg); }\n            20% { transform: translate(-3px, 0px) rotate(1deg); }\n            30% { transform: translate(3px, 2px) rotate(0deg); }\n            40% { transform: translate(1px, -1px) rotate(1deg); }\n            50% { transform: translate(-1px, 2px) rotate(-1deg); }\n            60% { transform: translate(-3px, 1px) rotate(0deg); }\n            70% { transform: translate(3px, 1px) rotate(-1deg); }\n            80% { transform: translate(-1px, -1px) rotate(1deg); }\n            90% { transform: translate(1px, 2px) rotate(0deg); }\n            100% { transform: translate(1px, -2px) rotate(-1deg); }\n        }\n\n        /* Responsive */\n        @media (max-width: 600px) {\n            body { padding: 5px; }\n            .screen { padding: 15px; }\n            h1 { font-size: 1.8rem; }\n            h2 { font-size: 1.3rem; }\n            p { font-size: 1rem; }\n            .workspace { flex-direction: column; }\n            #selection-grid { grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); }\n            .item img { width: 40px; height: 40px; }\n            .button { padding: 12px 25px; font-size: 1rem; }\n            #blending-options { flex-direction: column; gap: 10px; }\n        }\n    </style>\n</head>\n<body>\n\n    <div id=\"app-container\">\n        <!-- Screen 1: Introduction -->\n        <div id=\"screen-intro\" class=\"screen active\">\n            <h1>Craft Your Own Plant Milk</h1>\n            <p>Discover how easy it is to make fresh, delicious plant-based milk right in your kitchen!</p>\n            <p class=\"info-box\">Control your ingredients, avoid unnecessary additives, and customize to your taste.</p>\n            <button id=\"start-btn\" class=\"button\">Start</button>\n        </div>\n\n        <!-- Screen 2: Ingredient & Tool Selection -->\n        <div id=\"screen-selection\" class=\"screen\">\n            <h2>1. Select Ingredients & Tools</h2>\n            <p>Click to select the essential items for making basic almond milk.</p>\n            <div id=\"selection-grid\">\n                <!-- Data attributes used by JS -->\n                <div class=\"item\" data-item=\"almonds\" data-essential=\"true\">\n                    <img src=\"https://placehold.co/100x100/DEB887/000?text=🌰\" alt=\"Raw Almonds\">\n                    <div class=\"item-name\">Raw Almonds</div>\n                </div>\n                <div class=\"item\" data-item=\"water\" data-essential=\"true\">\n                    <img src=\"https://placehold.co/100x100/ADD8E6/000?text=💧\" alt=\"Water\">\n                    <div class=\"item-name\">Water</div>\n                </div>\n                <div class=\"item\" data-item=\"salt\" data-essential=\"true\">\n                    <img src=\"https://placehold.co/100x100/F5F5F5/000?text=🧂\" alt=\"Salt\">\n                    <div class=\"item-name\">Salt</div>\n                </div>\n                <div class=\"item\" data-item=\"dates\" data-essential=\"false\">\n                    <img src=\"https://placehold.co/100x100/8B4513/FFF?text=Dates\" alt=\"Dates\">\n                    <div class=\"item-name\">Dates (Optional)</div>\n                </div>\n                <div class=\"item\" data-item=\"maple\" data-essential=\"false\">\n                    <img src=\"https://placehold.co/100x100/D2691E/FFF?text=Maple\" alt=\"Maple Syrup\">\n                    <div class=\"item-name\">Maple Syrup (Opt.)</div>\n                </div>\n                <div class=\"item\" data-item=\"vanilla\" data-essential=\"false\">\n                    <img src=\"https://placehold.co/100x100/F5DEB3/000?text=V\" alt=\"Vanilla Extract\">\n                    <div class=\"item-name\">Vanilla (Optional)</div>\n                </div>\n                <div class=\"item\" data-item=\"bowl\" data-essential=\"true\">\n                    <img src=\"https://placehold.co/100x100/B0E0E6/000?text=🥣\" alt=\"Bowl\">\n                    <div class=\"item-name\">Bowl</div>\n                </div>\n                <div class=\"item\" data-item=\"blender\" data-essential=\"true\">\n                    <img src=\"https://placehold.co/100x100/D3D3D3/000?text=🌪️\" alt=\"Blender\">\n                    <div class=\"item-name\">Blender</div>\n                </div>\n                <div class=\"item\" data-item=\"nut-milk-bag\" data-essential=\"true\">\n                    <img src=\"https://placehold.co/100x100/FDF5E6/000?text=🛍️\" alt=\"Nut Milk Bag\">\n                    <div class=\"item-name\">Nut Milk Bag</div>\n                </div>\n                <div class=\"item\" data-item=\"pitcher\" data-essential=\"true\">\n                    <img src=\"https://placehold.co/100x100/E0FFFF/000?text=🏺\" alt=\"Pitcher\">\n                    <div class=\"item-name\">Pitcher</div>\n                </div>\n                <div class=\"item\" data-item=\"storage-bottle\" data-essential=\"true\">\n                    <img src=\"https://placehold.co/100x100/FFFFFF/000?text=🍼\" alt=\"Storage Bottle\">\n                    <div class=\"item-name\">Storage Bottle</div>\n                </div>\n            </div>\n            <div class=\"info-box\" style=\"margin-top: 20px;\">Always use raw almonds, not roasted or salted, to ensure pure flavor and proper soaking.</div>\n            <button id=\"selection-next-btn\" class=\"button\" disabled>Next Step</button>\n        </div>\n        \n        <!-- Screen 3: Soaking -->\n        <div id=\"screen-soaking\" class=\"screen\">\n            <h2>2. Soak the Almonds</h2>\n            <p>Click the almonds, then click the bowl to add them. Repeat for the water to begin soaking.</p>\n            <div class=\"workspace\">\n                <div id=\"almonds-source\" class=\"workspace-item clickable\">\n                    <span>Raw Almonds</span>\n                    <div class=\"content\">🌰</div>\n                </div>\n                <div id=\"water-source\" class=\"workspace-item clickable\">\n                    <span>Water</span>\n                    <div class=\"content\">💧</div>\n                </div>\n                <div id=\"bowl\" class=\"workspace-item clickable\">\n                    <span>Bowl</span>\n                    <div class=\"content\"></div>\n                </div>\n                <div id=\"soaking-overlay\" class=\"overlay-text\">Almonds have softened and plumped, releasing enzyme inhibitors. They're ready for blending!</div>\n            </div>\n            <button id=\"soak-btn\" class=\"button\" style=\"display: none;\">Soak Overnight</button>\n            <button id=\"soaking-next-btn\" class=\"button\" style=\"display: none;\">Next Step</button>\n        </div>\n\n        <!-- Screen 4: Blending -->\n        <div id=\"screen-blending\" class=\"screen\">\n            <h2>3. Blend Ingredients</h2>\n            <p>Add the soaked almonds, water, and salt to the blender. Add optional flavorings, then blend!</p>\n            <div class=\"workspace\">\n                <div id=\"soaked-almonds-source\" class=\"workspace-item clickable\">\n                    <span>Soaked Almonds</span>\n                    <div class=\"content\">🌰+💧</div>\n                </div>\n                <div id=\"blender\" class=\"workspace-item clickable\">\n                    <span>Blender</span>\n                    <div class=\"content\"></div>\n                </div>\n            </div>\n            <div id=\"blending-options\">\n                <button id=\"add-water-btn\" class=\"button\" style=\"margin: 0;\">+ Add Water (4 cups)</button>\n                <button id=\"add-salt-btn\" class=\"button\" style=\"margin: 0;\">+ Add Salt (pinch)</button>\n                <div class=\"info-box\" style=\"margin: 0;\">You control the sweetness! Choose your preferred natural sweetener.</div>\n                <div>\n                  <input type=\"checkbox\" id=\"add-vanilla-check\">\n                  <label for=\"add-vanilla-check\">Add Vanilla</label>\n                </div>\n            </div>\n            <button id=\"blend-btn\" class=\"button\" disabled>Blend!</button>\n            <button id=\"blending-next-btn\" class=\"button\" style=\"display: none;\">Next Step</button>\n        </div>\n\n        <!-- Screen 5: Straining -->\n        <div id=\"screen-straining\" class=\"screen\">\n            <h2>4. Strain the Milk</h2>\n            <p>Place the nut milk bag in the pitcher, then pour the blended mixture in. Squeeze to separate the milk from the pulp.</p>\n            <div class=\"workspace\">\n                <div id=\"blender-full\" class=\"workspace-item clickable\">\n                    <span>Blended Milk</span>\n                    <div class=\"content\" style=\"background: #fdf5e6; padding: 5px; border-radius: 5px;\">Creamy</div>\n                </div>\n                <div id=\"nut-milk-bag-source\" class=\"workspace-item clickable\">\n                    <span>Nut Milk Bag</span>\n                    <div class=\"content\">🛍️</div>\n                </div>\n                <div id=\"pitcher\" class=\"workspace-item clickable\">\n                    <span>Pitcher</span>\n                    <div class=\"content\"></div>\n                </div>\n                 <div id=\"straining-overlay\" class=\"overlay-text\">The pulp is separated, leaving you with smooth, creamy plant milk!</div>\n            </div>\n            <button id=\"squeeze-btn\" class=\"button\" style=\"display: none;\">Squeeze Milk</button>\n            <button id=\"straining-next-btn\" class=\"button\" style=\"display: none;\">Next Step</button>\n        </div>\n        \n        <!-- Screen 6: Storage -->\n        <div id=\"screen-storage\" class=\"screen\">\n            <h2>5. Store & Enjoy!</h2>\n            <p>Pour your freshly made milk into a storage bottle. That's it!</p>\n            <div class=\"workspace\">\n                 <div id=\"pitcher-full\" class=\"workspace-item clickable\" style=\"background-image: linear-gradient(to top, #fdf5e6 80%, transparent 80%);\">\n                    <span>Fresh Milk</span>\n                    <div class=\"content\"></div>\n                </div>\n                 <div id=\"storage-bottle\" class=\"workspace-item clickable\">\n                    <span>Storage Bottle</span>\n                    <div class=\"content\"></div>\n                </div>\n            </div>\n            <div id=\"final-message\" style=\"display: none;\">\n                <h2>Congratulations!</h2>\n                <p class=\"info-box\">Your fresh plant milk is ready! Store it in the refrigerator and enjoy. You've successfully made delicious milk with complete control over the ingredients, and with no unwanted additives.</p>\n                <button id=\"restart-btn\" class=\"button\">Make Another Batch!</button>\n            </div>\n        </div>\n\n    </div>\n\n    <script>\n        document.addEventListener('DOMContentLoaded', () => {\n            // --- STATE MANAGEMENT ---\n            const state = {\n                selectedItem: null,\n                soaking: { almonds: false, water: false },\n                blending: { almonds: false, water: false, salt: false },\n                straining: { bag: false, milk: false },\n                storage: { poured: false }\n            };\n\n            // --- DOM ELEMENTS ---\n            const screens = document.querySelectorAll('.screen');\n            const buttons = {\n                start: document.getElementById('start-btn'),\n                selectionNext: document.getElementById('selection-next-btn'),\n                soak: document.getElementById('soak-btn'),\n                soakingNext: document.getElementById('soaking-next-btn'),\n                blend: document.getElementById('blend-btn'),\n                blendingNext: document.getElementById('blending-next-btn'),\n                squeeze: document.getElementById('squeeze-btn'),\n                strainingNext: document.getElementById('straining-next-btn'),\n                restart: document.getElementById('restart-btn'),\n            };\n\n            // --- NAVIGATION ---\n            function navigateTo(screenId) {\n                screens.forEach(s => s.classList.remove('active'));\n                document.getElementById(screenId).classList.add('active');\n            }\n\n            // --- HELPER FUNCTIONS ---\n            function showOverlayText(elementId, duration = 2000) {\n                const overlay = document.getElementById(elementId);\n                overlay.style.display = 'block';\n                setTimeout(() => {\n                    overlay.style.display = 'none';\n                }, duration);\n            }\n\n            function selectForAction(element) {\n                // Deselect any previously selected item\n                document.querySelectorAll('.is-selected-for-action').forEach(el => el.classList.remove('is-selected-for-action'));\n                \n                if (element) {\n                    element.classList.add('is-selected-for-action');\n                    state.selectedItem = element;\n                } else {\n                    state.selectedItem = null;\n                }\n            }\n            \n            // --- SCREEN 1: INTRO ---\n            buttons.start.addEventListener('click', () => navigateTo('screen-selection'));\n\n            // --- SCREEN 2: SELECTION ---\n            const selectionGrid = document.getElementById('selection-grid');\n            selectionGrid.addEventListener('click', (e) => {\n                const item = e.target.closest('.item');\n                if (!item) return;\n                \n                item.classList.toggle('selected');\n                \n                const essentialItems = document.querySelectorAll('.item[data-essential=\"true\"]');\n                const allSelected = Array.from(essentialItems).every(el => el.classList.contains('selected'));\n                \n                buttons.selectionNext.disabled = !allSelected;\n            });\n            buttons.selectionNext.addEventListener('click', () => navigateTo('screen-soaking'));\n\n            // --- SCREEN 3: SOAKING ---\n            const soakables = {\n                almonds: document.getElementById('almonds-source'),\n                water: document.getElementById('water-source'),\n                bowl: document.getElementById('bowl')\n            };\n\n            soakables.almonds.addEventListener('click', () => selectForAction(soakables.almonds));\n            soakables.water.addEventListener('click', () => selectForAction(soakables.water));\n            \n            soakables.bowl.addEventListener('click', () => {\n                if (!state.selectedItem) return;\n\n                if (state.selectedItem.id === 'almonds-source' && !state.soaking.almonds) {\n                    state.soaking.almonds = true;\n                    soakables.bowl.classList.add('has-almonds');\n                    state.selectedItem.style.opacity = '0.5';\n                    state.selectedItem.classList.remove('clickable');\n                } else if (state.selectedItem.id === 'water-source' && state.soaking.almonds && !state.soaking.water) {\n                    state.soaking.water = true;\n                    soakables.bowl.classList.add('has-water');\n                    state.selectedItem.style.opacity = '0.5';\n                    state.selectedItem.classList.remove('clickable');\n                }\n                \n                selectForAction(null); // Deselect\n\n                if (state.soaking.almonds && state.soaking.water) {\n                    buttons.soak.style.display = 'inline-block';\n                }\n            });\n\n            buttons.soak.addEventListener('click', () => {\n                soakables.bowl.classList.add('soaked');\n                showOverlayText('soaking-overlay');\n                buttons.soak.style.display = 'none';\n                buttons.soakingNext.style.display = 'inline-block';\n            });\n            buttons.soakingNext.addEventListener('click', () => navigateTo('screen-blending'));\n\n            // --- SCREEN 4: BLENDING ---\n            const blendables = {\n                almonds: document.getElementById('soaked-almonds-source'),\n                blender: document.getElementById('blender'),\n                addWater: document.getElementById('add-water-btn'),\n                addSalt: document.getElementById('add-salt-btn')\n            };\n\n            function checkBlendReady() {\n                buttons.blend.disabled = !(state.blending.almonds && state.blending.water && state.blending.salt);\n            }\n\n            blendables.almonds.addEventListener('click', () => selectForAction(blendables.almonds));\n            blendables.blender.addEventListener('click', () => {\n                 if (state.selectedItem && state.selectedItem.id === 'soaked-almonds-source' && !state.blending.almonds) {\n                    state.blending.almonds = true;\n                    blendables.blender.classList.add('has-ingredients'); // Simplified visual\n                    state.selectedItem.style.opacity = '0.5';\n                    state.selectedItem.classList.remove('clickable');\n                    selectForAction(null);\n                    checkBlendReady();\n                }\n            });\n            \n            blendables.addWater.addEventListener('click', () => {\n                state.blending.water = true;\n                blendables.addWater.disabled = true;\n                blendables.addWater.textContent = '✓ Water Added';\n                checkBlendReady();\n            });\n             blendables.addSalt.addEventListener('click', () => {\n                state.blending.salt = true;\n                blendables.addSalt.disabled = true;\n                blendables.addSalt.textContent = '✓ Salt Added';\n                checkBlendReady();\n            });\n            \n            buttons.blend.addEventListener('click', () => {\n                buttons.blend.disabled = true;\n                blendables.blender.classList.add('is-blending');\n                setTimeout(() => {\n                    blendables.blender.classList.remove('is-blending');\n                    blendables.blender.classList.add('is-blended');\n                    buttons.blendingNext.style.display = 'inline-block';\n                }, 2000);\n            });\n            buttons.blendingNext.addEventListener('click', () => navigateTo('screen-straining'));\n\n            // --- SCREEN 5: STRAINING ---\n            const strainables = {\n                blender: document.getElementById('blender-full'),\n                bag: document.getElementById('nut-milk-bag-source'),\n                pitcher: document.getElementById('pitcher')\n            };\n\n            strainables.bag.addEventListener('click', () => selectForAction(strainables.bag));\n            strainables.blender.addEventListener('click', () => selectForAction(strainables.blender));\n\n            strainables.pitcher.addEventListener('click', () => {\n                if (!state.selectedItem) return;\n\n                if (state.selectedItem.id === 'nut-milk-bag-source' && !state.straining.bag) {\n                    state.straining.bag = true;\n                    strainables.pitcher.classList.add('has-bag');\n                    state.selectedItem.style.opacity = '0.5';\n                    state.selectedItem.classList.remove('clickable');\n                } else if (state.selectedItem.id === 'blender-full' && state.straining.bag && !state.straining.milk) {\n                    state.straining.milk = true;\n                    strainables.pitcher.classList.add('has-milk-in-bag');\n                    state.selectedItem.style.opacity = '0.5';\n                    state.selectedItem.classList.remove('clickable');\n                }\n                \n                selectForAction(null);\n\n                if (state.straining.bag && state.straining.milk) {\n                    buttons.squeeze.style.display = 'inline-block';\n                }\n            });\n\n            buttons.squeeze.addEventListener('click', () => {\n                buttons.squeeze.disabled = true;\n                strainables.pitcher.classList.add('is-squeezing');\n                setTimeout(() => {\n                    strainables.pitcher.classList.remove('is-squeezing');\n                    strainables.pitcher.classList.add('has-strained-milk');\n                    showOverlayText('straining-overlay');\n                    buttons.squeeze.style.display = 'none';\n                    buttons.strainingNext.style.display = 'inline-block';\n                }, 2000);\n            });\n            buttons.strainingNext.addEventListener('click', () => navigateTo('screen-storage'));\n            \n            // --- SCREEN 6: STORAGE ---\n            const storageItems = {\n                pitcher: document.getElementById('pitcher-full'),\n                bottle: document.getElementById('storage-bottle')\n            };\n\n            storageItems.pitcher.addEventListener('click', () => selectForAction(storageItems.pitcher));\n            storageItems.bottle.addEventListener('click', () => {\n                if (state.selectedItem && state.selectedItem.id === 'pitcher-full' && !state.storage.poured) {\n                    state.storage.poured = true;\n                    storageItems.bottle.classList.add('is-full');\n                    state.selectedItem.style.opacity = '0.5';\n                    selectForAction(null);\n                    document.getElementById('final-message').style.display = 'block';\n                }\n            });\n            \n            buttons.restart.addEventListener('click', () => window.location.reload());\n        });\n    </script>\n</body>\n</html>\n"
}