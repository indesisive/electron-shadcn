import * as React from 'react'
import { useParams } from "@tanstack/react-router";
import VideoEditor from "@/components/video-editor";

export default function EditingPage() {
  const { videoSrc, timer } = useParams({ from: "/editing/$videoSrc/$timer" });
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Video Editor</h1>
      </div>
      {videoSrc ? (
        <VideoEditor videoSrc={videoSrc} duration={timer} />
      ) : (
        <div>No video selected</div>
      )}
    </div>
  );
}
