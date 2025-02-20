import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Effect, PositionKeyframe } from "@/components/video-editor";

interface ExportDialogProps {
  videoSrc: string;
  duration: number;
  effects: Effect[];
  positionKeyframes: PositionKeyframe[];
  onExport: (filePath: string) => Promise<void>;
  exportProgress: number;
  isExporting: boolean;
}

declare global {
  interface Window {
    electron: {
      showSave: (options: any) => any;    
      getSources: (options: { types: string[] }) => Promise<Electron.DesktopCapturerSource[]>;
      saveRecording: (vidChunks: Blob[]) => Promise<void>;
    };
  }
}

export function ExportDialog({
  videoSrc,
  duration,
  effects,
  positionKeyframes,
  onExport,
  exportProgress,
  isExporting
}: ExportDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleExport = async () => {
    try {
    //   const { ipcRenderer } = window.require("electron");
    //   const result = await ipcRenderer.invoke("show-save-dialog", {
    //     filters: [{ name: "MP4 Files", extensions: ["mp4"] }],
    //     defaultPath: "edited-video.mp4"
    //   });
      const result = window.electron.showSave({
        filters: [{ name: "MP4 Files", extensions: ["mp4"] }],
        defaultPath: "edited-video.mp4"
      })

      if (!result.canceled && result.filePath) {
        await onExport(result.filePath);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Export Video</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
          <DialogDescription>
            Export video with all applied effects and animations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isExporting && (
            <div className="space-y-2">
              <Progress value={exportProgress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Exporting... {Math.round(exportProgress)}%
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Start Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}