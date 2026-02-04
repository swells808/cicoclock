import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { extractEmbeddingFromUrl, formatEmbeddingForPgvector } from '@/lib/faceVerification';
import { toast } from 'sonner';

export type EnrollmentStatus = 'not_enrolled' | 'enrolled' | 'failed';

interface UseFaceEnrollmentReturn {
  enrolling: boolean;
  enrollFace: (profileId: string, avatarUrl: string) => Promise<boolean>;
}

/**
 * Hook for handling face enrollment when profile photos are uploaded.
 */
export const useFaceEnrollment = (): UseFaceEnrollmentReturn => {
  const [enrolling, setEnrolling] = useState(false);

  const enrollFace = async (profileId: string, avatarUrl: string): Promise<boolean> => {
    if (!profileId || !avatarUrl) {
      console.warn('[FaceEnrollment] Missing profileId or avatarUrl');
      return false;
    }

    setEnrolling(true);
    
    try {
      console.log('[FaceEnrollment] Starting enrollment for profile:', profileId);
      
      // Extract embedding from the profile photo
      const result = await extractEmbeddingFromUrl(avatarUrl);
      
      if (!result.ok) {
        const reason = (result as { ok: false; reason: string }).reason;
        console.warn('[FaceEnrollment] Failed to extract embedding:', reason);
        
        // Update profile with failed status
        await supabase
          .from('profiles')
          .update({
            face_enrollment_status: 'failed' as EnrollmentStatus,
            face_embedding_updated_at: new Date().toISOString(),
          })
          .eq('id', profileId);

        if (reason === 'no_face') {
          toast.warning('No face detected in photo. Face verification disabled for this employee.');
        } else {
          toast.error('Face enrollment failed. Face verification disabled for this employee.');
        }
        
        return false;
      }

      // Format embedding for pgvector and update profile
      const embeddingString = formatEmbeddingForPgvector(result.embedding);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          face_embedding: embeddingString,
          face_enrollment_status: 'enrolled' as EnrollmentStatus,
          face_embedding_updated_at: new Date().toISOString(),
        })
        .eq('id', profileId);

      if (error) {
        console.error('[FaceEnrollment] Database update error:', error);
        toast.error('Failed to save face data');
        return false;
      }

      console.log('[FaceEnrollment] Successfully enrolled face for profile:', profileId);
      toast.success('Face enrolled successfully for verification');
      return true;
      
    } catch (error) {
      console.error('[FaceEnrollment] Unexpected error:', error);
      
      // Update profile with failed status
      await supabase
        .from('profiles')
        .update({
          face_enrollment_status: 'failed' as EnrollmentStatus,
          face_embedding_updated_at: new Date().toISOString(),
        })
        .eq('id', profileId);

      toast.error('Face enrollment failed');
      return false;
    } finally {
      setEnrolling(false);
    }
  };

  return { enrolling, enrollFace };
};
