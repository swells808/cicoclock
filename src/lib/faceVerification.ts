import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let modelsLoading: Promise<void> | null = null;

/**
 * Lazy-load face-api.js models once.
 * Models are cached after first load.
 */
export async function loadFaceModelsOnce(): Promise<void> {
  if (modelsLoaded) return;
  
  // Prevent duplicate loading
  if (modelsLoading) {
    await modelsLoading;
    return;
  }

  modelsLoading = (async () => {
    try {
      const modelPath = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
      ]);
      modelsLoaded = true;
      console.log('[FaceVerification] Models loaded successfully');
    } catch (error) {
      console.error('[FaceVerification] Failed to load models:', error);
      throw error;
    }
  })();

  await modelsLoading;
}

/**
 * Extract 128-dimensional face descriptor from an image element.
 */
export async function getDescriptorFromImage(
  input: HTMLImageElement | HTMLCanvasElement
): Promise<{ ok: true; descriptor: Float32Array } | { ok: false; reason: string }> {
  try {
    const detection = await faceapi
      .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return { ok: false, reason: 'no_face' };
    }

    return { ok: true, descriptor: detection.descriptor };
  } catch (error) {
    console.error('[FaceVerification] Detection error:', error);
    return { ok: false, reason: 'detection_error' };
  }
}

/**
 * Compute Euclidean distance between two 128-d embeddings.
 */
export function euclideanDistance(a: Float32Array | number[], b: Float32Array | number[]): number {
  const aArr = a instanceof Float32Array ? a : new Float32Array(a);
  const bArr = b instanceof Float32Array ? b : new Float32Array(b);
  
  let sum = 0;
  for (let i = 0; i < aArr.length; i++) {
    sum += Math.pow(aArr[i] - bArr[i], 2);
  }
  return Math.sqrt(sum);
}

/**
 * Convert a Blob to an HTMLImageElement.
 */
export function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Fetch an image from a URL and convert to HTMLImageElement.
 */
export async function urlToImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

export interface VerificationResult {
  ok: boolean;
  distance?: number;
  pass?: boolean;
  reason: string;
  embedding?: number[];
}

/**
 * Run full face verification comparing clock photo to profile embedding.
 * @param clockPhotoBlob - The photo blob captured during clock action
 * @param profileEmbedding - The stored 128-d embedding from user profile
 * @param threshold - Match threshold (default 0.55, lower = stricter)
 */
export async function verifyFace(
  clockPhotoBlob: Blob,
  profileEmbedding: number[],
  threshold: number = 0.55
): Promise<VerificationResult> {
  try {
    await loadFaceModelsOnce();

    // Convert blob to image
    const img = await blobToImage(clockPhotoBlob);

    // Get clock photo descriptor
    const clockResult = await getDescriptorFromImage(img);
    if (!clockResult.ok) {
      const failedResult = clockResult as { ok: false; reason: string };
      return { 
        ok: true, 
        reason: failedResult.reason, 
        pass: false 
      };
    }

    // Compute distance - at this point clockResult.ok is true, so descriptor exists
    const distance = euclideanDistance(clockResult.descriptor, profileEmbedding);
    const pass = distance <= threshold;

    return {
      ok: true,
      distance,
      pass,
      reason: 'ok',
      embedding: Array.from(clockResult.descriptor),
    };
  } catch (error) {
    console.error('[FaceVerification] Verification error:', error);
    return { 
      ok: false, 
      reason: 'model_load_failed' 
    };
  }
}

/**
 * Extract face embedding from an image URL (for enrollment).
 * @param imageUrl - URL of the profile photo
 */
export async function extractEmbeddingFromUrl(
  imageUrl: string
): Promise<{ ok: true; embedding: number[] } | { ok: false; reason: string }> {
  try {
    await loadFaceModelsOnce();

    const img = await urlToImage(imageUrl);
    const result = await getDescriptorFromImage(img);

    if (!result.ok) {
      const failedResult = result as { ok: false; reason: string };
      return { ok: false, reason: failedResult.reason };
    }

    const successResult = result as { ok: true; descriptor: Float32Array };
    return { ok: true, embedding: Array.from(successResult.descriptor) };
  } catch (error) {
    console.error('[FaceVerification] Enrollment error:', error);
    return { ok: false, reason: 'extraction_failed' };
  }
}

/**
 * Format embedding array for Supabase pgvector insert.
 * pgvector expects format like '[0.1,0.2,...]'
 */
export function formatEmbeddingForPgvector(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
