import React from "react";
import ToggleTheme from "@/components/ToggleTheme";
import { useTranslation } from "react-i18next";
import LangToggle from "@/components/LangToggle";
import Footer from "@/components/temp/Footer";
import InitialIcons from "@/components/temp/InitialIcons";

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <InitialIcons />
        <span>
          <h1 className="font-mono text-4xl font-bold">{t("title")}</h1>
          <p className="text-end text-sm uppercase text-muted-foreground">
            {t("homePageName")}
          </p>
        </span>
        <LangToggle />
        <ToggleTheme />
      </div>
      <Footer />
    </div>
  );
}
