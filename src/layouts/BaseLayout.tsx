import React from "react";
import DragWindowRegion from "@/components/DragWindowRegion";
import { Toaster } from "@/components/ui/toaster";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DragWindowRegion title="BASELAYOUT.TSX" />
      <Toaster/>
      <main className="h-screen pb-20 p-2">{children}</main>
    </>
  );
}
