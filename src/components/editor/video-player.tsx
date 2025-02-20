import * as React from "react";
import { useRef } from "react";

interface VideoPlayerProps {
  videoSrc: string;
  isPlaying: boolean;
  onTimeUpdate: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onLoadedMetadata: () => void;
  onPlayPause: () => void;
  zoomStyle?: React.CSSProperties;
  onPositionDragStart?: () => void;
  onPositionDrag?: (delta: { offsetX: number; offsetY: number }) => void;
  onPositionDragEnd?: () => void;
}

export default React.forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ videoSrc, isPlaying, onTimeUpdate, onLoadedMetadata, onPlayPause, zoomStyle, onPositionDragStart, onPositionDrag, onPositionDragEnd }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      if (onPositionDragStart) onPositionDragStart();
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
    
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
    
      // Convert pixel deltas to percentage-based movement
      const offsetXPercent = (deltaX / containerWidth) * 100;
      const offsetYPercent = (deltaY / containerHeight) * 100;
    
      if (onPositionDrag) onPositionDrag({ 
        offsetX: offsetXPercent, 
        offsetY: offsetYPercent 
      });
    };

    const handleMouseUp = () => {
      if (onPositionDragEnd) onPositionDragEnd();
      dragStartRef.current = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    return (
      <div
        ref={containerRef}
        className="relative cursor-move"
        onMouseDown={handleMouseDown}
        style={{ overflow: 'hidden' }}
      >
        <video
          ref={ref}
          src={videoSrc}
          className="w-full aspect-video bg-muted rounded-lg select-none"
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          muted
          style={zoomStyle}
        />
      </div>
    );
  }
);
