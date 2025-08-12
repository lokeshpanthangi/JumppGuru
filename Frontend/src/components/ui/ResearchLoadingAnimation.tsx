import React, { useState, useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const ResearchLoadingAnimation: React.FC = () => {
  const [currentAnimation, setCurrentAnimation] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const animations = [
    "https://lottie.host/a71815bd-869c-495e-952c-96dbde106ce7/cOeKzCHR8v.lottie",
    "https://lottie.host/1d0c37f0-25d5-49b7-9b01-563b50da71f3/aPeGqeRPOS.lottie",
    "https://lottie.host/a2401c1f-de21-4ff1-aed1-c129117728c0/qSlRJhjNRs.lottie",
    "https://lottie.host/345ada62-90a5-4037-83cc-f3e30ae27132/bK1nULM8RC.lottie",
    "https://lottie.host/0bc4a8ea-b1cf-4ab5-9205-209e5b871179/vf2QUaxJFt.lottie"
  ];

  const messages = [
    "It's not you, it's us... we're just thinking really hard",
    "Brewing something amazing for you",
    "Our AI hamsters are running at full speed",
    "Consulting the digital crystal ball",
    "Teaching robots how to be creative",
    "Diving deep into the knowledge ocean",
    "Connecting the dots in our neural networks"
  ];

  // Select random animation on mount
  useEffect(() => {
    const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
    setCurrentAnimation(randomAnimation);
  }, []);

  // Stream text with typing effect
  useEffect(() => {
    const typeText = async (text: string) => {
      setIsTyping(true);
      setDisplayText('');
      
      // Stream text character by character
      for (let i = 0; i <= text.length; i++) {
        setDisplayText(text.substring(0, i));
        await new Promise(resolve => setTimeout(resolve, 25)); // 25ms per character
      }
      
      setIsTyping(false);
      
      // Wait for 2 seconds before changing to next text
      await new Promise(resolve => setTimeout(resolve, 2000));
    };

    const rotateMessages = async () => {
      while (true) {
        for (const message of messages) {
          await typeText(message);
        }
      }
    };

    rotateMessages();
  }, []);

  return (
    <div className="flex items-start justify-center p-4">
      {/* Animation on the left - smaller and moved up more */}
      <div className="w-16 h-16 flex-shrink-0 mr-2 -mt-5">
        {currentAnimation && (
          <DotLottieReact
            src={currentAnimation}
            loop
            autoplay
            className="w-full h-full"
          />
        )}
      </div>
      
      {/* Text content on the right */}
      <div className="flex-1 max-w-md">
        <p className="text-text-primary font-medium text-lg leading-relaxed">
          {/* {displayText} */}
          {isTyping && <span className="animate-pulse">|</span>}
        </p>
      </div>
    </div>
  );
};

export default ResearchLoadingAnimation;