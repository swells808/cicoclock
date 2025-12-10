import { supabase } from '@/integrations/supabase/client';

export const fetchSignedPhotoUrl = async (photoPath: string): Promise<string | null> => {
  if (!photoPath) return null;

  let cleanPath = photoPath;
  if (photoPath.startsWith('timeclock-photos/')) {
    cleanPath = photoPath.replace('timeclock-photos/', '');
  }

  try {
    const { data } = await supabase.storage
      .from('timeclock-photos')
      .createSignedUrl(cleanPath, 3600);
    return data?.signedUrl || null;
  } catch (error) {
    console.error('Error fetching photo URL:', error);
    return null;
  }
};

export const convertImageToBase64 = async (url: string): Promise<string | null> => {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
};

export const fetchPhotoAsBase64 = async (photoPath: string): Promise<string | null> => {
  const signedUrl = await fetchSignedPhotoUrl(photoPath);
  if (!signedUrl) return null;
  return convertImageToBase64(signedUrl);
};

export const rotateImageBase64 = async (
  base64Image: string,
  degrees: number
): Promise<string | null> => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        const radians = (degrees * Math.PI) / 180;
        const sin = Math.abs(Math.sin(radians));
        const cos = Math.abs(Math.cos(radians));
        
        canvas.width = img.height * sin + img.width * cos;
        canvas.height = img.height * cos + img.width * sin;
        
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(radians);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => resolve(null);
      img.src = base64Image;
    } catch (error) {
      console.error('Error rotating image:', error);
      resolve(null);
    }
  });
};
