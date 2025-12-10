import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type TimeclockFooterProps = {
  onClosePage: () => void;
  closeDisabled: boolean;
  t: (key: string) => string;
};

export const TimeclockFooter: React.FC<TimeclockFooterProps> = ({
  onClosePage,
  closeDisabled,
  t,
}) => (
  <footer className="fixed bottom-0 left-0 right-0 p-4">
    <div className="max-w-md mx-auto">
      <Card className="p-4">
        <Button
          variant="secondary"
          className="w-full"
          onClick={onClosePage}
          disabled={closeDisabled}
        >
          <X className="w-4 h-4 mr-2" />
          {t("timeclock.closePage")}
        </Button>
      </Card>
    </div>
  </footer>
);
