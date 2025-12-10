import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export const useCompanyFeatures = () => {
  const { company } = useCompany();

  return useQuery({
    queryKey: ["company-features", company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      
      const { data, error } = await supabase
        .from("company_features")
        .select("*")
        .eq("company_id", company.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
};
