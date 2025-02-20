import * as React from "react";
import { Button } from "@/components/ui/button";

const effects = ["Zoom in", "Zoom out"];

export default function EffectsPanel() {
  const handleDragStart = (effect: string, e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", effect);
  };
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Effects</h3>
      <div className="grid grid-cols-2 gap-2">
        {effects.map((effect) => (
          <Button
            key={effect}
            variant="outline"
            className="w-full cursor-move"
            draggable
            onDragStart={(e) => handleDragStart(effect, e)}
          >
            {effect}
          </Button>
        ))}
      </div>
    </div>
  );
}
