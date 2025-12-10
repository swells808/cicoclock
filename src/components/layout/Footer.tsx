import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export const Footer = () => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">CICO</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              {t("footerTagline")}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t("product")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/features" className="hover:text-foreground transition-colors">{t("features")}</Link></li>
              <li><Link to="/pricing" className="hover:text-foreground transition-colors">{t("pricing")}</Link></li>
              <li><Link to="/about" className="hover:text-foreground transition-colors">{t("about")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t("support")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/contact" className="hover:text-foreground transition-colors">{t("contact")}</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">{t("privacy")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t("getStarted")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/login" className="hover:text-foreground transition-colors">{t("login")}</Link></li>
              <li><Link to="/company-signup" className="hover:text-foreground transition-colors">{t("signUp")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} CICO. {t("allRightsReserved")}</p>
        </div>
      </div>
    </footer>
  );
};
