import * as React from "react";
import VideoPlayer from "@/components/editor/video-player";
import Timeline from "@/components/editor/timeline";
import EffectsPanel from "@/components/editor/effects-panel";
import { useState, useRef, useEffect } from "react";
import { ExportDialog } from "@/components/editor/export-dialog";
import { Button } from "@/components/ui/button";
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { saveAs } from "file-saver";

interface VideoEditorProps {
  videoSrc: string;
  duration: string;
}

export interface Effect {
  id: string;
  type: "Zoom in" | "Zoom out";
  start: number;
  duration: number;
  centerX: number;
  centerY: number;
}

export interface PositionKeyframe {
  time: number;
  offsetX: number;
  offsetY: number;
}

export default function VideoEditor({ videoSrc, duration }: VideoEditorProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoDuration, setVideoDuration] = useState(parseFloat(duration));
  const [effects, setEffects] = useState<Effect[]>([]);
  const [positionKeyframes, setPositionKeyframes] = useState<PositionKeyframe[]>([]);
  const [currentDragOffset, setCurrentDragOffset] = useState<{ offsetX: number; offsetY: number } | null>(null);
  const [baseDragOffset, setBaseDragOffset] = useState<{ offsetX: number; offsetY: number } | null>(null);
  const [ffmpeg] = useState(new FFmpeg());
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setVideoDuration(parseFloat(duration));
  }, [duration]);

  useEffect(() => {
    const loadFFmpeg = async () => {
      await ffmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
      });
    };
    loadFFmpeg();
  }, []);


  const handleExport = async (outputPath: string) => {
    setIsExporting(true);
    try {
      const inputName = 'input.mp4';
      const outputName = 'output.mp4';
      
      // Write input file to FFmpeg
      const videoData = await fetch(videoSrc).then(r => r.arrayBuffer());
      await ffmpeg.writeFile(inputName, new Uint8Array(videoData));

      ffmpeg.on("progress", ({ progress }) => {
        setExportProgress(Math.min(progress * 100, 100));
      });
  
      // Build FFmpeg filter commands
      let filterComplex = '';
      
      // Zoom effects
      const zoomEffects = effects.map((eff, i) => {
        const progress = `(t-${eff.start})/${eff.duration}`;
        const ease = `(${progress}<0.5 ? 2*${progress}*${progress} : -1 + (4 - 2*${progress})*${progress})`;
        const scale = eff.type === 'Zoom in' 
          ? `1 + 0.5*${ease}` 
          : `1.5 - 0.5*${ease}`;
        
        return `between(t,${eff.start},${eff.start + eff.duration})*${scale}+` +
               `not(between(t,${eff.start},${eff.start + eff.duration}))`;
      }).reverse().join('*');
  
      const z = zoomEffects.length > 0 ? `z='${zoomEffects}'` : '';
  
      // Position keyframes
      let xExpr = '0';
      let yExpr = '0';
      if (positionKeyframes.length > 0) {
        const sorted = [...positionKeyframes].sort((a, b) => a.time - b.time);
        xExpr = sorted.map((kf, i) => {
          if (i === 0) return `t<${kf.time} ? ${kf.offsetX} : `;
          return `t<${kf.time} ? ${kf.offsetX} + (${kf.offsetX - sorted[i-1].offsetX})*(t-${sorted[i-1].time})/(${kf.time - sorted[i-1].time}) : `;
        }).join('') + sorted[sorted.length-1].offsetX.toString();
        
        yExpr = sorted.map((kf, i) => {
          if (i === 0) return `t<${kf.time} ? ${kf.offsetY} : `;
          return `t<${kf.time} ? ${kf.offsetY} + (${kf.offsetY - sorted[i-1].offsetY})*(t-${sorted[i-1].time})/(${kf.time - sorted[i-1].time}) : `;
        }).join('') + sorted[sorted.length-1].offsetY.toString();
      }
  
      filterComplex = `zoompan=${z} x='${xExpr}%' y='${yExpr}%' ` +
                     `d=1:s=hd720:enable='between(t,0,${videoDuration})'`;
  
      // Run FFmpeg command
      await ffmpeg.exec([
        '-i', inputName,
        '-vf', filterComplex,
        '-c:a', 'copy',
        '-y', outputName
      ]);
  
      // Read and save output
      const outputData = await ffmpeg.readFile(outputName);
      const blob = new Blob([outputData], { type: 'video/mp4' });
      saveAs(blob, outputPath);
  
    } catch (error) {
      console.error('Export failed:', error);
    }
    setIsExporting(false);
  };
  

  const handleLoadedMetadata = () => {
    setVideoDuration(parseFloat(duration));
  };

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleTimeUpdateFromVideo = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    setCurrentTime(e.currentTarget.currentTime);
  };

  // Compute the effective position from keyframes (or current drag offset, if active)
  const computeEffectivePosition = () => {
    if (currentDragOffset !== null) return currentDragOffset;
    
    // Create a copy to avoid mutating state
    const sorted = [...positionKeyframes].sort((a, b) => a.time - b.time);
    
    // Handle edge cases first
    if (sorted.length === 0) return { offsetX: 0, offsetY: 0 };
    if (currentTime <= sorted[0].time) return sorted[0];
    if (currentTime >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1];
  
    // Find interpolating keyframes
    for (let i = 0; i < sorted.length - 1; i++) {
      if (currentTime >= sorted[i].time && currentTime <= sorted[i + 1].time) {
        const t = (currentTime - sorted[i].time) / (sorted[i + 1].time - sorted[i].time);
        return {
          offsetX: sorted[i].offsetX + t * (sorted[i + 1].offsetX - sorted[i].offsetX),
          offsetY: sorted[i].offsetY + t * (sorted[i + 1].offsetY - sorted[i].offsetY)
        };
      }
    }
    
    return { offsetX: 0, offsetY: 0 };
  };

  const effectivePosition = computeEffectivePosition();

  // Zoom effect interpolation
  const easeInOutQuad = (t: number) => (t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t);

  const activeZoomEffect = effects
    .filter(
      (eff) =>
        (eff.type === "Zoom in" || eff.type === "Zoom out") &&
        currentTime >= eff.start &&
        currentTime < eff.start + eff.duration
    )
    .sort((a, b) => b.start - a.start)[0];

  let scaleStr = "";
  if (activeZoomEffect) {
    const progress = Math.min((currentTime - activeZoomEffect.start) / activeZoomEffect.duration, 1);
    const eased = easeInOutQuad(progress);
    const scale = activeZoomEffect.type === "Zoom in"
      ? 1 + (1.5 - 1)*eased
      : 1.5 - (1.5 - 1)*eased;
    scaleStr = `scale(${scale})`;
  }

  const positionStr = `translate(${effectivePosition.offsetX}%, ${effectivePosition.offsetY}%)`;

  const combinedStyle: React.CSSProperties = {
    transform: `${positionStr} ${scaleStr}`.trim(),
    transformOrigin: activeZoomEffect ? `${activeZoomEffect.centerX}% ${activeZoomEffect.centerY}%` : undefined,
    transition: "transform 0.1s linear"
  };

  // Handlers for video dragging to create position keyframes
  const handlePositionDragStart = () => {
    setBaseDragOffset(computeEffectivePosition());
  };

  const handlePositionDrag = (delta: { offsetX: number; offsetY: number }) => {
    if (baseDragOffset) {
      setCurrentDragOffset({
        offsetX: baseDragOffset.offsetX + delta.offsetX,
        offsetY: baseDragOffset.offsetY + delta.offsetY,
      });
    }
  };

  const handlePositionDragEnd = () => {
    if (currentDragOffset) {
      setPositionKeyframes(prev => [...prev, { time: currentTime, offsetX: currentDragOffset.offsetX, offsetY: currentDragOffset.offsetY }]);
    }
    setCurrentDragOffset(null);
    setBaseDragOffset(null);
  };

  return (
    <div className="flex gap-4">
      <div className="flex-1">
      <div className="mt-4 flex gap-2">
        <Button onClick={togglePlayback} className="px-4 py-2 bg-blue-500 text-white rounded">
          {isPlaying ? "Pause" : "Play"}
        </Button>
        <ExportDialog
            videoSrc={videoSrc}
            duration={videoDuration}
            effects={effects}
            positionKeyframes={positionKeyframes}
            onExport={handleExport}
            exportProgress={exportProgress}
            isExporting={isExporting}
          />
      </div>
        <VideoPlayer 
          videoSrc={videoSrc}
          ref={videoRef}
          isPlaying={isPlaying}
          onTimeUpdate={handleTimeUpdateFromVideo}
          onLoadedMetadata={handleLoadedMetadata}
          onPlayPause={togglePlayback}
          zoomStyle={combinedStyle}
          onPositionDragStart={handlePositionDragStart}
          onPositionDrag={handlePositionDrag}
          onPositionDragEnd={handlePositionDragEnd}
        />
        <Timeline
          duration={videoDuration}
          currentTime={currentTime}
          effects={effects}
          onEffectsChange={setEffects}
          onTimeUpdate={handleTimeUpdate}
          positionKeyframes={positionKeyframes}
          onPositionKeyframesChange={setPositionKeyframes}
        />
        <div className="mt-4 flex gap-2">
          <button onClick={togglePlayback} className="px-4 py-2 bg-blue-500 text-white rounded">
            {isPlaying ? "Pause" : "Play"}
          </button>
        </div>
      </div>
      <EffectsPanel />
    </div>
  );
}
