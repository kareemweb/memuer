import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface VoiceMessagePlayerProps {
  src: string; // Base64 audio data or standard url
  duration?: number;
  isMe?: boolean;
}

export function VoiceMessagePlayer({ src, duration, isMe }: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let audioUrl = src;
    
    // Check if the source is base64 and needs a data-uri prefix
    if (src && !src.startsWith('data:') && !src.startsWith('http://') && !src.startsWith('https://')) {
      audioUrl = `data:audio/webm;base64,${src}`;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      if (audio.duration && !duration) {
        setTotalDuration(audio.duration);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audioRef.current = null;
    };
  }, [src, duration]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => {
        console.error("Audio playback failed:", err);
      });
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
      isMe ? 'bg-white/10 text-white' : 'bg-black/10 text-white'
    }`} style={{ minWidth: '220px' }}>
      <button 
        onClick={togglePlay}
        className={`p-2 rounded-full cursor-pointer transition-colors ${
          isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-white/10 hover:bg-white/15 text-white'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>

      <div className="flex-1">
        {/* Progress bar / mock waveform */}
        <div className="relative w-full h-1 bg-white/20 rounded-full overflow-hidden">
          <div 
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-100 ${
              isMe ? 'bg-cyan-300' : 'bg-indigo-300'
            }`}
            style={{ width: `${totalDuration ? (currentTime / totalDuration) * 100 : 0}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px] text-white/60">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      <button 
        onClick={toggleMute}
        className="p-1.5 opacity-60 hover:opacity-100 transition-opacity"
      >
        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
