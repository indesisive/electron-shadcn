import * as React from "react";
import { useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { PositionKeyframe } from "@/components/video-editor";

interface Effect {
  id: string;
  type: "Zoom in" | "Zoom out";
  start: number;
  duration: number;
  centerX: number;
  centerY: number;
}

interface TimelineProps {
  duration: number;
  currentTime: number;
  effects: Effect[];
  onEffectsChange: (effects: Effect[]) => void;
  onTimeUpdate: (time: number) => void;
  positionKeyframes: PositionKeyframe[];
  onPositionKeyframesChange: (keyframes: PositionKeyframe[]) => void;
}

export default function Timeline({
  duration,
  currentTime,
  effects,
  onEffectsChange,
  onTimeUpdate,
  positionKeyframes,
  onPositionKeyframesChange,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const safeDuration = (isNaN(duration) || !isFinite(duration) || duration <= 0) ? 1 : duration;
  const safeCurrentTime = isNaN(currentTime) || !isFinite(currentTime) ? 0 : currentTime;
  const handleSliderChange = (value: number[]) => {
    onTimeUpdate(value[0]);
  };
  const handleSliderCommit = () => {};

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropX = e.clientX - rect.left;
      const dropY = e.clientY - rect.top;
      const startTime = (dropX / rect.width) * safeDuration;
      const centerY = (dropY / rect.height) * 100;
      const effectName = e.dataTransfer.getData("text/plain") as "Zoom in" | "Zoom out";
      const newEffect: Effect = {
        id: Date.now().toString(),
        type: effectName,
        start: startTime,
        duration: 2,
        centerX: 50,
        centerY: centerY,
      };
      onEffectsChange([...effects, newEffect]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const onMarkerMouseDown = (e: React.MouseEvent<HTMLDivElement>, effect: Effect) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialStart = effect.start;
    const initialCenterY = effect.centerY;
    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const newStart = initialStart + (deltaX / rect.width) * safeDuration;
      const newCenterY = Math.min(100, Math.max(0, initialCenterY + (deltaY / rect.height) * 100));
      onEffectsChange(effects.map(ev => ev.id === effect.id ? { ...ev, start: newStart, centerY: newCenterY } : ev));
    };
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const onMarkerResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>, effect: Effect) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const initialDuration = effect.duration;
    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newDuration = initialDuration + (deltaX / rect.width) * safeDuration;
      onEffectsChange(effects.map(ev => ev.id === effect.id ? { ...ev, duration: Math.max(newDuration, 0.1) } : ev));
    };
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // Position Keyframe marker dragging (horizontal only to adjust time)
  const onPositionMarkerMouseDown = (e: React.MouseEvent<HTMLDivElement>, keyframe: PositionKeyframe) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const initialTime = keyframe.time;
    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newTime = initialTime + (deltaX / rect.width) * safeDuration;
      onPositionKeyframesChange(
        positionKeyframes.map(kf => kf === keyframe ? { ...kf, time: Math.max(newTime, 0) } : kf)
      );
    };
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div ref={containerRef} onDrop={handleDrop} onDragOver={handleDragOver} className="relative border border-gray-400 h-32">
      {/* Render effect markers */}
      {effects.map(effect => {
        const leftPercent = (effect.start / safeDuration) * 100;
        const widthPercent = (effect.duration / safeDuration) * 100;
        return (
          <div
            key={effect.id}
            style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, top: `${(effect.centerY / 100) * 32}px` }}
            className="absolute h-6 bg-green-500 opacity-70 flex items-center justify-between cursor-move"
            onMouseDown={(e) => onMarkerMouseDown(e, effect)}
          >
            <span className="text-xs text-white pl-1">{effect.type}</span>
            <div
              className="w-4 h-full bg-transparent cursor-ew-resize"
              onMouseDown={(e) => onMarkerResizeMouseDown(e, effect)}
            ></div>
          </div>
        );
      })}
      {/* Render position keyframe markers */}
      {positionKeyframes.map((kf, idx) => {
        const leftPercent = (kf.time / safeDuration) * 100;
        return (
          <div
            key={`pos-${idx}`}
            style={{
              left: `${leftPercent}%`,
              top: "80%",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "blue",
              position: "absolute",
              transform: "translate(-50%, -50%)",
              cursor: "ew-resize"
            }}
            onMouseDown={(e) => onPositionMarkerMouseDown(e, kf)}
          ></div>
        );
      })}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-white">
        <Slider
          value={[safeCurrentTime]}
          min={0}
          max={safeDuration}
          step={0.1}
          onValueChange={handleSliderChange}
          onValueCommit={handleSliderCommit}
          className="w-full"
        />
        <div className="text-xs text-muted-foreground text-right">
          {formatTime(safeCurrentTime)} / {formatTime(safeDuration)}
        </div>
      </div>
    </div>
  );
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};
