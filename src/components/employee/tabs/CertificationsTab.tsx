import { CertificationsList } from "@/components/users/CertificationsList";

interface CertificationsTabProps {
  profileId: string;
}

export const CertificationsTab = ({ profileId }: CertificationsTabProps) => {
  return (
    <div className="bg-card rounded-lg border p-6">
      <CertificationsList profileId={profileId} />
    </div>
  );
};
