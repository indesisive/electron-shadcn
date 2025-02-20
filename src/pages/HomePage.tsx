import React, { useEffect, useRef, useState } from "react";
import ToggleTheme from "@/components/ToggleTheme";
import { Link, useRouter } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { desktopCapturer, dialog } from "electron";
import { writeFile } from "fs";
import { Toast, ToastProvider } from "@/components/ui/toast";

declare global {
  interface Window {
    electron: {
      showSave: (options: any) => any;
      getSources: (options: { types: string[] }) => Promise<Electron.DesktopCapturerSource[]>;
      saveRecording: (vidChunks: Blob[]) => Promise<void>;
    };
  }
}

export default function HomePage() {
  const playbackRef = useRef<HTMLVideoElement | null>(null);
  const [sources, setSources] = useState<Electron.DesktopCapturerSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>("Select Source");
  const vidChunksRef = useRef<Blob[]>([]);
  const glRecorder = useRef<MediaRecorder | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'paused'>('idle');
  const countTimerRef = useRef<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const router = useRouter()

  // Settings state
  const [frameRate, setFrameRate] = useState<number>(30);
  const [resolutionWidth, setResolutionWidth] = useState<number>(1280);
  const [resolutionHeight, setResolutionHeight] = useState<number>(720);
  const [videoBitrate, setVideoBitrate] = useState<number>(2500000);

  useEffect(() => {
    const getSources = async () => {
      try {
        if (!window.electron || typeof window.electron.getSources !== "function") {
          console.error("Electron API not available on window.");
          return;
        }
        const sources = await window.electron.getSources({ types: ["window", "screen"] });
        setSources(sources);
      } catch (error) {
        console.error("Error fetching sources:", error);
      }
    };
    getSources();
  }, []);

  const startTimer = () => {
      timerRef.current = setInterval(() => {
        countTimerRef.current = +(countTimerRef.current + 0.01).toFixed(2);
      }, 10);
  };


  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // timerRef.current = 0
  };

  const selectSource = async (source: Electron.DesktopCapturerSource) => {
    setSelectedSource(source.name);
    const constraints = {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: source.id,
          width: resolutionWidth,
          height: resolutionHeight,
        },
      },
    } as MediaStreamConstraints;
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (playbackRef.current) {
      playbackRef.current.srcObject = stream;
      playbackRef.current.play();
    }

    // Advanced recording options with default bitrate
    const options: MediaRecorderOptions = {
      mimeType: 'video/webm; codecs=vp9',
      videoBitsPerSecond: videoBitrate,
    };

    const recorder = new MediaRecorder(stream, options);
    glRecorder.current = recorder;
    
    vidChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      vidChunksRef.current.push(e.data);
    };
    
    recorder.onstop = async () => {
      toast({ title: "Video Ended", description: "Your video recording has ended." });
      const blob = new Blob(vidChunksRef.current, { type: 'video/webm; codecs=vp9' });
      const videoUrl = URL.createObjectURL(blob);
    
      
      console.log(countTimerRef.current)
      router.navigate({
        to: "/editing/$videoSrc/$timer",
        params: { videoSrc: encodeURIComponent(videoUrl), timer: countTimerRef.current.toString() },
      });
    };
    recorder.onerror = (e) => {
      console.error("Recording error:", e);
    };
  };

  const handleStartRecording = () => {
    if (glRecorder.current && recordingStatus === 'idle') {
      glRecorder.current.start();
      setRecordingStatus('recording');
      startTimer();
      toast({ title: "Video Started", description: "Your video recording has started." });
    }
  };

  const handleStopRecording = () => {
    if (glRecorder.current && recordingStatus !== 'idle') {
      glRecorder.current.stop();
      setRecordingStatus('idle');
      stopTimer();
    }
  };

  const handlePauseRecording = () => {
    if (glRecorder.current && recordingStatus === 'recording' && glRecorder.current.state === "recording") {
      glRecorder.current.pause();
      setRecordingStatus('paused');
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleResumeRecording = () => {
    if (glRecorder.current && recordingStatus === 'paused' && glRecorder.current.state === "paused") {
      glRecorder.current.resume();
      setRecordingStatus('recording');
      startTimer();
    }
  };

  return (
    <div className="flex h-full">
    {/* Sidebar */}
    <aside
      className={`${
        isSidebarOpen ? 'w-64 p-4 border-r' : 'w-0 p-0'
      } transition-all duration-300 overflow-hidden bg-neutral-500/10 dark:bg-neutral-200/[2%]`}
    >
      <div className={`${isSidebarOpen ? 'block' : 'hidden'}`}>
        <h2 className="text-xl font-bold mb-4">Advanced Settings</h2>
        <div className="flex flex-col gap-2">
        <label className="flex flex-col">
            Frame Rate:
            <input
              type="number"
              value={frameRate}
              onChange={(e) => setFrameRate(Number(e.target.value))}
              className="border rounded p-1"
            />
          </label>
          <label className="flex flex-col">
            Width:
            <input
              type="number"
              value={resolutionWidth}
              onChange={(e) => setResolutionWidth(Number(e.target.value))}
              className="border rounded p-1"
            />
          </label>
          <label className="flex flex-col">
            Height:
            <input
              type="number"
              value={resolutionHeight}
              onChange={(e) => setResolutionHeight(Number(e.target.value))}
              className="border rounded p-1"
            />
          </label>
          <label className="flex flex-col">
            Bitrate:
            <input
              type="number"
              value={videoBitrate}
              onChange={(e) => setVideoBitrate(Number(e.target.value))}
              className="border rounded p-1"
            />
          </label>
        </div>
      </div>
    </aside>

    {/* Main Content */}
    <main className="flex-1 flex flex-col items-center justify-center gap-4 p-4 relative">
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute left-4 top-4 p-2 bg-neutral-200 dark:bg-neutral-800 rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
      >
        {isSidebarOpen ? '◀ Hide' : '▶ Show'} Advanced Settings
      </button>
        <span>
          <h1 className="font-mono text-4xl font-bold">Recorder</h1>
          <p className="text-end text-sm uppercase text-muted-foreground" data-testid="pageTitle">
            the best
          </p>
        </span>
        {/* <Link to="/editing" className="p-2 rounded-full bg-red-500">Go edit</Link> */}

        <video ref={playbackRef} width={500} height={500} className="shadow-md shadow-black rounded-[5px] bg-neutral-700 dark:bg-neutral-300"></video>
        
        <div className="flex gap-2">
          <Button onClick={handleStartRecording} disabled={recordingStatus !== 'idle'}>
            Start
          </Button>
          <Button onClick={handlePauseRecording} disabled={recordingStatus !== 'recording'}>
            Pause
          </Button>
          <Button onClick={handleResumeRecording} disabled={recordingStatus !== 'paused'}>
            Resume
          </Button>
          <Button onClick={handleStopRecording} disabled={recordingStatus === 'idle'}>
            Stop
          </Button>
        </div>
        
        <div>
          <p>Recording Timer: {countTimerRef.current} seconds</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[200px] w-max justify-start">
              {selectedSource}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {sources.map((source) => (
              <DropdownMenuItem
                key={source.id}
                onSelect={() => selectSource(source)}
              >
                {source.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <ToggleTheme />
        <ToastProvider>
        <Toast/>
        </ToastProvider>
      </main>
    </div>
  );
}
