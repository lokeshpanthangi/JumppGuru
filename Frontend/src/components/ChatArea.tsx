import React, { useEffect, useRef, useState } from 'react';
import { Search, Globe, Copy, ThumbsUp, ThumbsDown, Volume2, VolumeX, Brain } from 'lucide-react';
import { useChatContext } from '../contexts/ChatContext';
import { ChatInput } from './ChatInput';
import { TypingAnimation } from './ui/typing-animation';
import { LoadingState } from './ui/LoadingState';
import { MarkdownRenderer } from './ui/MarkdownRenderer';
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ), 
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                               \
     ColorStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  ColorStop currentColor = colors[index];                   \
  ColorStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  
  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);
  
  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);
  
  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;
  
  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);
  
  vec3 auroraColor = intensity * rampColor;
  
  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`;

interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  time?: number;
  speed?: number;
}

const Aurora: React.FC<AuroraProps> = (props) => {
  const {
    colorStops = ["#5227FF", "#7cff67", "#5227FF"],
    amplitude = 1.0,
    blend = 0.5,
  } = props;
  const propsRef = useRef<AuroraProps>(props);
  propsRef.current = props;

  const ctnDom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctn = ctnDom.current;
    if (!ctn) return;

    const renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.canvas.style.backgroundColor = "transparent";

    let program: Program | undefined;

    function resize() {
      if (!ctn) return;
      const width = ctn.offsetWidth;
      const height = ctn.offsetHeight;
      renderer.setSize(width, height);
      if (program) {
        program.uniforms.uResolution.value = [width, height];
      }
    }
    window.addEventListener("resize", resize);

    const geometry = new Triangle(gl);
    if (geometry.attributes.uv) {
      delete (geometry.attributes).uv;
    }

    const colorStopsArray = colorStops.map((hex) => {
      const c = new Color(hex);
      return [c.r, c.g, c.b];
    });

    program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: amplitude },
        uColorStops: { value: colorStopsArray },
        uResolution: { value: [ctn.offsetWidth, ctn.offsetHeight] },
        uBlend: { value: blend },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    ctn.appendChild(gl.canvas);

    let animateId = 0;
    const update = (t: number) => {
      animateId = requestAnimationFrame(update);
      const { time = t * 0.01, speed = 1.0 } = propsRef.current;
      if (program) {
        program.uniforms.uTime.value = time * speed * 0.1;
        program.uniforms.uAmplitude.value = propsRef.current.amplitude ?? 1.0;
        program.uniforms.uBlend.value = propsRef.current.blend ?? blend;
        const stops = propsRef.current.colorStops ?? colorStops;
        program.uniforms.uColorStops.value = stops.map((hex: string) => {
          const c = new Color(hex);
          return [c.r, c.g, c.b];
        });
        renderer.render({ scene: mesh });
      }
    };
    animateId = requestAnimationFrame(update);

    resize();

    return () => {
      cancelAnimationFrame(animateId);
      window.removeEventListener("resize", resize);
      if (ctn && gl.canvas.parentNode === ctn) {
        ctn.removeChild(gl.canvas);
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [amplitude]);

  return (
     <div 
       ref={ctnDom} 
       style={{
         position: 'fixed',
         top: '0',
         left: '0',
         width: '100%',
         height: '40%',
         pointerEvents: 'none',
         zIndex: 1,
         borderRadius: '0 0 20px 20px',
         overflow: 'hidden',
       }}
     />
   );
};

const getTimeOfDayGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatMessageTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

interface QuizQuestion {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: string;
  explanation: string;
}

interface QuizMessageProps {
  question: QuizQuestion;
  timestamp: Date;
}

const QuizMessage: React.FC<QuizMessageProps> = ({ question, timestamp }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleAnswerSelect = (option: string) => {
    setSelectedAnswer(option);
    setShowExplanation(true);
    console.log('Selected:', option, 'Correct:', question.correct, 'Match:', option === question.correct);
  };

  const isCorrect = selectedAnswer === question.correct;

  return (
    <div className="space-y-3 group relative max-w-[120%]">
      <div className="bg-blue-50 dark:bg-gray-800/50 border border-blue-200 dark:border-gray-600 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-blue-600 dark:text-gray-400" />
          <span className="font-semibold text-blue-800 dark:text-gray-300">Quiz Question</span>
        </div>
        
        <h3 className="text-lg font-medium text-text-primary mb-4">{question.question}</h3>
        
        <div className="space-y-2 mb-4">
          {Object.entries(question.options).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleAnswerSelect(key)}
              disabled={selectedAnswer !== null}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedAnswer === null
                  ? 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-gray-500 hover:bg-blue-50 dark:hover:bg-gray-700/30'
                  : selectedAnswer === key
                  ? key === question.correct
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                    : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                  : key === question.correct
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                  : 'border-gray-200 dark:border-gray-700 opacity-50'
              }`}
            >
              <span className="font-medium">{key}.</span> {value}
            </button>
          ))}
        </div>
        
        {showExplanation && (
          <div className={`p-3 rounded-lg ${
            isCorrect 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <span className="text-green-600 dark:text-green-400 font-semibold">✓ Correct!</span>
              ) : (
                <span className="text-red-600 dark:text-red-400 font-semibold">✗ Incorrect</span>
              )}
            </div>
            <p className="text-sm text-text-secondary">
              <strong>Explanation:</strong> {question.explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const ChatArea: React.FC = () => {
  const { state, addQuizMessage, addAIMessage } = useChatContext();
  const [showCenteredInput, setShowCenteredInput] = useState(true);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set());
  const [dislikedMessages, setDislikedMessages] = useState<Set<string>>(new Set());
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const hasMessages = state.currentChat?.messages.length ?? 0 > 0;

  useEffect(() => {
    if (hasMessages) {
      setShowCenteredInput(false);
    } else {
      setShowCenteredInput(true);
    }
  }, [hasMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.currentChat?.messages]);

  const handleMessageSent = () => {
    if (showCenteredInput) {
      // Smooth transition delay to allow message to be added first
      setTimeout(() => {
        setShowCenteredInput(false);
      }, 300);
    }
  };

  const getModeIcon = (mode?: string) => {
    switch (mode) {
      case 'web':
        return <Search className="w-3 h-3" />;
      case 'research':
        return <Globe className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    setNotification('Copied');
    setTimeout(() => setNotification(null), 2000);
  };

  const handleLikeMessage = (messageId: string) => {
    setLikedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        // Remove from disliked if it was disliked
        setDislikedMessages(prevDisliked => {
          const newDislikedSet = new Set(prevDisliked);
          newDislikedSet.delete(messageId);
          return newDislikedSet;
        });
      }
      return newSet;
    });
  };

  const handleDislikeMessage = (messageId: string) => {
    setDislikedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
        // Remove from liked if it was liked
        setLikedMessages(prevLiked => {
          const newLikedSet = new Set(prevLiked);
          newLikedSet.delete(messageId);
          return newLikedSet;
        });
      }
      return newSet;
    });
  };

  const handleSpeakMessage = (content: string, messageId: string) => {
    if ('speechSynthesis' in window) {
      if (playingVoice === messageId) {
        // Stop current speech
        speechSynthesis.cancel();
        setPlayingVoice(null);
      } else {
        // Stop any current speech and start new one
        speechSynthesis.cancel();
        setPlayingVoice(messageId);
        
        const utterance = new SpeechSynthesisUtterance(content);
        utterance.onend = () => setPlayingVoice(null);
        utterance.onerror = () => setPlayingVoice(null);
        speechSynthesis.speak(utterance);
      }
    }
  };

  const handleGenerateQuiz = async () => {
    if (!state.currentChat?.messages.length) return;
    
    setIsGeneratingQuiz(true);
    try {
      // Get only the last 5 messages from current chat
      const recentMessages = state.currentChat.messages.slice(-5);
      const chatHistory = recentMessages
        .map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');
      
      // Generate random number of questions (3-7)
      const numQuestions = Math.floor(Math.random() * 5) + 3;
      
      const quizPrompt = `Based on the following recent conversation, generate exactly ${numQuestions} multiple choice quiz questions to test understanding of the topics discussed. Each question should have 4 options (A, B, C, D) with only one correct answer. 

IMPORTANT: Respond with ONLY a valid JSON array, no markdown formatting or code blocks. Use this exact structure:

[
  {
    "question": "Question text here?",
    "options": {
      "A": "Option A text",
      "B": "Option B text", 
      "C": "Option C text",
      "D": "Option D text"
    },
    "correct": "A",
    "explanation": "Brief explanation of why this is correct"
  }
]

Recent conversation:\n${chatHistory}`;
      
      // Use the existing OpenAI setup from ChatContext
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      });
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: quizPrompt }],
        max_tokens: 2000,
        temperature: 0.7,
      });
      
      const response = completion.choices[0]?.message?.content;
      if (response) {
        try {
          // Clean the response to extract JSON from markdown code blocks if present
          let cleanedResponse = response.trim();
          
          // Remove markdown code block formatting if present
          if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          
          const questions = JSON.parse(cleanedResponse);
          
          // Add quiz header message first
          const quizHeader = {
            type: 'quiz-header',
            content: `Quiz Time! 🧠 (${questions.length} questions)`,
            timestamp: new Date()
          };
          addAIMessage(`🧠 **Quiz Time!** I've generated ${questions.length} questions based on our conversation. Test your knowledge!`);
          
          // Add quiz questions as chat messages
          questions.forEach((question: any, index: number) => {
            // Clean and validate the question data
            const cleanedQuestion = {
              ...question,
              correct: question.correct?.trim?.() || question.correct
            };
            console.log('Adding quiz question:', cleanedQuestion);
            addQuizMessage(JSON.stringify(cleanedQuestion));
          });
          
        } catch (parseError) {
          console.error('Failed to parse quiz JSON:', parseError);
          setNotification('Failed to generate quiz. Please try again.');
          setTimeout(() => setNotification(null), 3000);
        }
      }
    } catch (error) {
      console.error('Quiz generation error:', error);
      setNotification('Failed to generate quiz. Please try again.');
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  return (
    <div 
      className="flex-1 flex flex-col bg-chat-bg transition-all duration-500 ease-in-out h-screen"
    >
      {/* Aurora Effect */}
      <div className={`transition-opacity duration-1000 ease-in-out ${
        state.showAurora ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <Aurora 
          colorStops={["#5227FF", "#7cff67", "#5227FF"]}
          amplitude={1.0}
          blend={0.5}
          speed={1.0}
        />
      </div>
      
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          {notification}
        </div>
      )}
      {showCenteredInput && !hasMessages ? (
        /* Welcome Screen */
        <div className="flex-1 flex flex-col items-center justify-start min-h-screen p-8 pt-48">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-6">
              <span className="gradient-welcome">
                {getTimeOfDayGreeting()}, {state.userName}
              </span>
            </h1>
            <p className="text-xl text-text-secondary mb-6">
              What would you like to explore today?
            </p>
          </div>
          
          <div className="w-full max-w-3xl">
            <ChatInput centered onMessageSent={handleMessageSent} />
          </div>
        </div>
      ) : (
        /* Active Chat */
        <div className="flex-1 flex flex-col h-full">
          {/* Messages Container */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6 min-h-0"
          >
            {state.currentChat?.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] ${
                    message.type === 'user'
                      ? 'bg-chat-message-user text-white rounded-2xl rounded-br-md px-4 py-3'
                      : 'bg-transparent text-text-primary'
                  }`}
                >
                  {message.type === 'user' ? (
                    <div>
                      {message.mode && (
                        <div className="flex items-center gap-2 mb-2 text-white/80 text-sm">
                          {getModeIcon(message.mode)}
                          <span>
                            {message.mode === 'web' ? 'Web Search' : 'Research'}
                          </span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <div className="text-xs text-white/70 mt-2">
                        {formatMessageTime(message.timestamp)}
                      </div>
                    </div>
                  ) : message.type === 'quiz' ? (
                    <QuizMessage 
                      question={JSON.parse(message.content)} 
                      timestamp={message.timestamp}
                    />
                  ) : (
                    <div 
                      className="space-y-3 group relative"
                      onMouseEnter={() => setHoveredMessageId(message.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white">
                          <img src="/logo.png" alt="JumppGuru Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="font-medium text-text-primary">JumppGuru</span>
                        <span className="text-xs text-text-muted">
                          {formatMessageTime(message.timestamp)}
                        </span>
                      </div>
                      <div className="prose max-w-none">
                        <MarkdownRenderer content={message.content} />
                      </div>
                      
                      {/* Action Buttons - Always reserve space but only visible on hover */}
                      <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => handleCopyMessage(message.content)}
                          className="p-2 rounded-lg hover:bg-button-secondary transition-colors duration-200 text-text-muted hover:text-text-primary"
                          title="Copy"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleLikeMessage(message.id)}
                          className={`p-2 rounded-lg hover:bg-button-secondary transition-colors duration-200 ${
                            likedMessages.has(message.id) 
                              ? 'text-green-500 bg-green-100 dark:bg-green-900/20' 
                              : 'text-text-muted hover:text-green-500'
                          }`}
                          title={likedMessages.has(message.id) ? 'Unlike' : 'Like'}
                        >
                          <ThumbsUp className={`w-4 h-4 ${likedMessages.has(message.id) ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleDislikeMessage(message.id)}
                          className={`p-2 rounded-lg hover:bg-button-secondary transition-colors duration-200 ${
                            dislikedMessages.has(message.id) 
                              ? 'text-red-500 bg-red-100 dark:bg-red-900/20' 
                              : 'text-text-muted hover:text-red-500'
                          }`}
                          title={dislikedMessages.has(message.id) ? 'Remove dislike' : 'Dislike'}
                        >
                          <ThumbsDown className={`w-4 h-4 ${dislikedMessages.has(message.id) ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleSpeakMessage(message.content, message.id)}
                          className={`p-2 rounded-lg hover:bg-button-secondary transition-colors duration-200 ${
                            playingVoice === message.id 
                              ? 'text-blue-500 bg-blue-100 dark:bg-blue-900/20' 
                              : 'text-text-muted hover:text-blue-500'
                          }`}
                          title={playingVoice === message.id ? 'Stop reading' : 'Read aloud'}
                        >
                          {playingVoice === message.id ? (
                            <VolumeX className="w-4 h-4 animate-pulse" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={handleGenerateQuiz}
                          disabled={isGeneratingQuiz}
                          className={`p-2 rounded-lg hover:bg-button-secondary transition-colors duration-200 ${
                            isGeneratingQuiz 
                              ? 'text-purple-500 bg-purple-100 dark:bg-purple-900/20 cursor-not-allowed' 
                              : 'text-text-muted hover:text-purple-500'
                          }`}
                          title={isGeneratingQuiz ? 'Generating quiz...' : 'Generate quiz from conversation'}
                        >
                          <Brain className={`w-4 h-4 ${isGeneratingQuiz ? 'animate-pulse' : ''}`} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {(state.isTyping || state.loadingState) && (
              <div className="flex justify-start">
                <div className="bg-transparent text-text-primary max-w-[80%]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white">
                      <img src="/logo.png" alt="JumppGuru Logo" className="w-full h-full object-contain" />
                    </div>
                    <span className="font-medium text-text-primary">JumppGuru</span>
                  </div>
                  <div className="prose max-w-none">
                    {state.loadingState ? (
                      <LoadingState message={state.loadingState} />
                    ) : (
                      <TypingAnimation className="text-base" />
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>



          {/* Input Area - Fixed at bottom */}
          <div className="flex-shrink-0 bg-chat-bg p-6">
            <ChatInput onMessageSent={handleMessageSent} />
          </div>
        </div>
      )}
    </div>
  );
};