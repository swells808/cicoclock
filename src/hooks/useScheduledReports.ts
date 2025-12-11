import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface ScheduledReport {
  id: string;
  company_id: string;
  report_type: string;
  schedule_frequency: string;
  schedule_time: string;
  schedule_day_of_week: number | null;
  schedule_day_of_month: number | null;
  is_active: boolean;
  report_config: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduledReportRecipient {
  id: string;
  scheduled_report_id: string;
  profile_id: string | null;
  email: string;
  created_at: string;
}

export const useScheduledReports = () => {
  const { company } = useCompany();
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    if (!company?.id) {
      setReports([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching scheduled reports:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createReport = async (reportData: {
    report_type: string;
    schedule_frequency: string;
    schedule_time: string;
    schedule_day_of_week: number | null;
    schedule_day_of_month: number | null;
    is_active: boolean;
    report_config: Json;
    created_by: string | null;
  }) => {
    if (!company?.id) throw new Error('No company selected');

    const { data, error } = await supabase
      .from('scheduled_reports')
      .insert([{
        report_type: reportData.report_type,
        schedule_frequency: reportData.schedule_frequency,
        schedule_time: reportData.schedule_time,
        schedule_day_of_week: reportData.schedule_day_of_week,
        schedule_day_of_month: reportData.schedule_day_of_month,
        is_active: reportData.is_active,
        report_config: reportData.report_config,
        created_by: reportData.created_by,
        company_id: company.id,
      }])
      .select()
      .single();

    if (error) throw error;
    await fetchReports();
    toast.success('Scheduled report created');
    return data;
  };

  const updateReport = async (id: string, updates: {
    report_type?: string;
    schedule_frequency?: string;
    schedule_time?: string;
    schedule_day_of_week?: number | null;
    schedule_day_of_month?: number | null;
    is_active?: boolean;
    report_config?: Json;
    created_by?: string | null;
  }) => {
    const { data, error } = await supabase
      .from('scheduled_reports')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await fetchReports();
    toast.success('Scheduled report updated');
    return data;
  };

  const deleteReport = async (id: string) => {
    const { error } = await supabase
      .from('scheduled_reports')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchReports();
    toast.success('Scheduled report deleted');
  };

  const toggleReportStatus = async (id: string, is_active: boolean) => {
    await updateReport(id, { is_active });
  };

  const sendTestEmail = async (reportId: string, testEmail?: string) => {
    const { error } = await supabase.functions.invoke('send-test-report', {
      body: { report_id: reportId, test_email: testEmail }
    });
    if (error) throw error;
    toast.success('Test email sent successfully');
  };

  const getReportPreview = async (reportId: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('send-test-report', {
      body: { report_id: reportId, preview_only: true }
    });
    if (error) throw error;
    return data?.html || '<p>No preview available</p>';
  };

  useEffect(() => {
    fetchReports();
  }, [company?.id]);

  return {
    reports,
    loading,
    error,
    refetch: fetchReports,
    createReport,
    updateReport,
    deleteReport,
    toggleReportStatus,
    sendTestEmail,
    getReportPreview,
  };
};

export interface ReportExecutionLog {
  id: string;
  scheduled_report_id: string;
  executed_at: string;
  recipients_count: number;
  status: string;
  error_message: string | null;
}

export const useReportExecutionLog = (reportId?: string) => {
  const [logs, setLogs] = useState<ReportExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    if (!reportId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('report_execution_log')
        .select('*')
        .eq('scheduled_report_id', reportId)
        .order('executed_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching execution logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [reportId]);

  return {
    logs,
    loading,
    refetch: fetchLogs,
  };
};

export const useReportRecipients = (reportId?: string) => {
  const [recipients, setRecipients] = useState<ScheduledReportRecipient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecipients = async () => {
    if (!reportId) {
      setRecipients([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('scheduled_report_recipients')
        .select('*')
        .eq('scheduled_report_id', reportId);

      if (error) throw error;
      setRecipients(data || []);
    } catch (err) {
      console.error('Error fetching recipients:', err);
    } finally {
      setLoading(false);
    }
  };

  const addRecipient = async (email: string, profile_id?: string) => {
    if (!reportId) throw new Error('No report selected');

    const { error } = await supabase
      .from('scheduled_report_recipients')
      .insert({
        scheduled_report_id: reportId,
        email,
        profile_id: profile_id || null,
      });

    if (error) throw error;
    await fetchRecipients();
    toast.success('Recipient added');
  };

  const removeRecipient = async (id: string) => {
    const { error } = await supabase
      .from('scheduled_report_recipients')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchRecipients();
    toast.success('Recipient removed');
  };

  useEffect(() => {
    fetchRecipients();
  }, [reportId]);

  return {
    recipients,
    loading,
    refetch: fetchRecipients,
    addRecipient,
    removeRecipient,
  };
};
