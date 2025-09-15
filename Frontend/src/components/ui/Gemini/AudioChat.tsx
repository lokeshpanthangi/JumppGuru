/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, LiveServerMessage, Modality, Session } from '@google/genai';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { createBlob, decode, decodeAudioData } from './utils';
import { GdmLiveAudioVisuals3D } from './visual-3d';

const AudioChat = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [audioNodes, setAudioNodes] = useState<{ inputNode: GainNode, outputNode: GainNode } | null>(null);

  const client = useRef<GoogleGenAI | null>(null);
  const session = useRef<Session | null>(null);
  const inputAudioContext = useRef<AudioContext | null>(null);
  const outputAudioContext = useRef<AudioContext | null>(null);
  const nextStartTime = useRef(0);
  const mediaStream = useRef<MediaStream | null>(null);
  const sourceNode = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorNode = useRef<ScriptProcessorNode | null>(null);
  const sources = useRef(new Set<AudioBufferSourceNode>());
  // Use a ref to hold the latest isRecording state for the audio processor
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  const updateStatus = (msg: string) => setStatus(msg);
  const updateError = (msg: string) => {
    console.error(msg);
    setError(msg);
  };

  const initSession = useCallback(async () => {
    if (!client.current || !outputAudioContext.current || !audioNodes) return;
    const model = 'gemini-2.5-flash-preview-native-audio-dialog';
    try {
      const newSession = await client.current.live.connect({
        model: model,
        callbacks: {
          onopen: () => updateStatus('Opened'),
          onmessage: async (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData;
            if (audio && outputAudioContext.current && audioNodes?.outputNode) {
              nextStartTime.current = Math.max(nextStartTime.current, outputAudioContext.current.currentTime);
              const audioBuffer = await decodeAudioData(
                decode(audio.data),
                outputAudioContext.current,
                24000, 1
              );
              const source = outputAudioContext.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioNodes.outputNode);
              source.addEventListener('ended', () => {
                sources.current.delete(source);
              });
              source.start(nextStartTime.current);
              nextStartTime.current += audioBuffer.duration;
              sources.current.add(source);
            }
            if (message.serverContent?.interrupted) {
              for (const source of sources.current.values()) {
                source.stop();
                sources.current.delete(source);
              }
              nextStartTime.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => updateError(e.message),
          onclose: (e: CloseEvent) => updateStatus('Close:' + e.reason),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } } },
        },
      });
      session.current = newSession;
    } catch (e: any) {
      console.error(e);
      updateError(e.message);
    }
  }, [audioNodes]);

  useEffect(() => {
    const iac = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const oac = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    inputAudioContext.current = iac;
    outputAudioContext.current = oac;
    const inputNode = iac.createGain();
    const outputNode = oac.createGain();
    outputNode.connect(oac.destination);
    setAudioNodes({ inputNode, outputNode });
    nextStartTime.current = oac.currentTime;
    client.current = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    return () => { iac.close(); oac.close(); };
  }, []);

  useEffect(() => {
    if (audioNodes) initSession();
    return () => session.current?.close();
  }, [audioNodes, initSession]);

  const stopRecording = useCallback(() => {
    if (!mediaStream.current) return;
    updateStatus('Stopping recording...');
    setIsRecording(false);
    if (scriptProcessorNode.current && sourceNode.current) {
      scriptProcessorNode.current.disconnect();
      sourceNode.current.disconnect();
    }
    scriptProcessorNode.current = null;
    sourceNode.current = null;
    mediaStream.current.getTracks().forEach((track) => track.stop());
    mediaStream.current = null;
    updateStatus('Recording stopped. Click Start to begin again.');
  }, []);

  const startRecording = async () => {
    if (isRecording || !inputAudioContext.current || !audioNodes?.inputNode) return;
    await inputAudioContext.current.resume();
    updateStatus('Requesting microphone access...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStream.current = stream;
      updateStatus('Microphone access granted. Starting capture...');
      const srcNode = inputAudioContext.current.createMediaStreamSource(stream);
      sourceNode.current = srcNode;
      srcNode.connect(audioNodes.inputNode);
      const bufferSize = 256;
      const spNode = inputAudioContext.current.createScriptProcessor(bufferSize, 1, 1);
      scriptProcessorNode.current = spNode;
      spNode.onaudioprocess = (audioProcessingEvent) => {
        if (!isRecordingRef.current) return;
        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);
        session.current?.sendRealtimeInput({ media: createBlob(pcmData) });
      };
      srcNode.connect(spNode);
      spNode.connect(inputAudioContext.current.destination);
      setIsRecording(true);
      updateStatus('🔴 Recording... Capturing PCM chunks.');
    } catch (err: any) {
      console.error('Error starting recording:', err);
      updateStatus(`Error: ${err.message}`);
      stopRecording();
    }
  };

  const reset = useCallback(() => {
    session.current?.close();
    initSession();
    updateStatus('Session cleared.');
  }, [initSession]);

  return (
    <div className='h-96'> 
      {audioNodes && (
          <GdmLiveAudioVisuals3D
          inputNode={audioNodes.inputNode}
          outputNode={audioNodes.outputNode}
          />
        )}
     
       <div className="controls flex items-center justify-around gap-4 mt-4">
        <button id="resetButton" onClick={reset} disabled={isRecording}>
          <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#ffffff">
            <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
          </svg>
        </button>
        <button id="startButton" onClick={startRecording} disabled={isRecording}>
          <svg viewBox="0 0 100 100" width="32px" height="32px" fill="#c80000" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="50" />
          </svg>
        </button>
        <button id="stopButton" onClick={stopRecording} disabled={!isRecording}>
          <svg viewBox="0 0 100 100" width="32px" height="32px" fill="#000000" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="100" height="100" rx="15" />
          </svg>
        </button>
      </div>
         <div id="status" className=''>{error || status}</div>
    </div>
  );
};

export default AudioChat;
