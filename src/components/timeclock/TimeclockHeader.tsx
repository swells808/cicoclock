import React from "react";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type TimeclockHeaderProps = {
  currentTime: Date;
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
};

export const TimeclockHeader: React.FC<TimeclockHeaderProps> = ({
  currentTime,
  language,
  setLanguage,
  t,
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(
      language === "en"
        ? "en-US"
        : language === "es"
        ? "es-ES"
        : "fr-FR",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(
      language === "en"
        ? "en-US"
        : language === "es"
        ? "es-ES"
        : "fr-FR",
      {
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    );
  };

  return (
    <header className="bg-white shadow-sm p-4">
      <div className="w-full flex justify-center">
        <div className="flex items-center">
          <Clock className="text-[#4BA0F4] w-6 h-6 mr-2" />
          <span className="text-xl font-semibold">{t("timeclock.title")}</span>
        </div>
      </div>
      <section className="mb-8 text-center">
        <Card className="p-8 mb-6">
          <div className="text-6xl font-bold text-gray-800 mb-4">
            {formatTime(currentTime)}
          </div>
          <div className="text-xl text-gray-600 mb-6">
            {formatDate(currentTime)}
          </div>
          <div className="flex justify-center gap-3">
            <Button
              variant={language === "en" ? "default" : "outline"}
              onClick={() => setLanguage("en")}
              className={language === "en" ? "bg-[#008000] text-white" : ""}
            >
              English
            </Button>
            <Button
              variant={language === "es" ? "default" : "outline"}
              onClick={() => setLanguage("es")}
              className={language === "es" ? "bg-[#008000] text-white" : ""}
            >
              Español
            </Button>
            <Button
              variant={language === "fr" ? "default" : "outline"}
              onClick={() => setLanguage("fr")}
              className={language === "fr" ? "bg-[#008000] text-white" : ""}
            >
              Français
            </Button>
          </div>
        </Card>
      </section>
    </header>
  );
};
