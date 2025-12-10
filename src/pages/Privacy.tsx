import { PublicLayout } from "@/components/layout/PublicLayout";
import { useLanguage } from "@/contexts/LanguageContext";

const Privacy = () => {
  const { t } = useLanguage();

  return (
    <PublicLayout>
      <div className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
            <h1>{t("privacyTitle")}</h1>
            <p className="lead">{t("privacyLastUpdated")}: December 2024</p>

            <h2>{t("privacySection1Title")}</h2>
            <p>{t("privacySection1Content")}</p>

            <h2>{t("privacySection2Title")}</h2>
            <p>{t("privacySection2Content")}</p>

            <h2>{t("privacySection3Title")}</h2>
            <p>{t("privacySection3Content")}</p>

            <h2>{t("privacySection4Title")}</h2>
            <p>{t("privacySection4Content")}</p>

            <h2>{t("privacySection5Title")}</h2>
            <p>{t("privacySection5Content")}</p>

            <h2>{t("privacyContactTitle")}</h2>
            <p>{t("privacyContactContent")}</p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Privacy;
