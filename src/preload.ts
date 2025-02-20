import { contextBridge, ipcRenderer } from 'electron';
import exposeContexts from './helpers/ipc/context-exposer';
import { promises as fs } from "fs";

contextBridge.exposeInMainWorld("electron", {
  getSources: async (options: any) => {
    const sources = await ipcRenderer.invoke("DESKTOP_CAPTURER_GET_SOURCES", options);
    return sources;
  },
  saveRecording: async (vidChunks: Blob[]) => {
    const blob = new Blob(vidChunks, { type: 'video/webm; codecs=vp9' });
    const buffer = await blob.arrayBuffer();
  
    const { filePath } = await ipcRenderer.invoke("SHOW_SAVE_DIALOG", {
      title: 'Save Video',
      defaultPath: `vid-${Date.now()}.webm`,
      filters: [
        { name: 'Video Files', extensions: ['webm'] },
      ],
    });
  
    if (filePath) {
      try {
        await fs.writeFile(filePath, Buffer.from(buffer));
        console.log("Video saved successfully:", filePath);
      } catch (error) {
        console.error("Error saving video:", error);
      }
    }
  },

  showSave: async (options: any) => {
    const result = await ipcRenderer.invoke("SHOW_SAVE_DIALOG", options);
    return result;
  }
});

exposeContexts();