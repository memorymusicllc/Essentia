/**
 * Cloudflare R2 Configuration
 *
 * Configures Cloudflare R2 for storing audio analysis results.
 * R2 provides S3-compatible object storage with zero egress fees.
 *
 * @module config/r2Config
 */

// R2 bucket binding is provided by Wrangler in the worker environment
// This is a placeholder for type definitions and configuration

/**
 * Get R2 bucket instance from environment
 * @param {Object} env - Cloudflare Worker environment
 * @returns {R2Bucket} R2 bucket instance
 */
export function getR2Bucket(env) {
  if (!env.R2_BUCKET) {
    throw new Error('R2_BUCKET binding not found in environment');
  }
  return env.R2_BUCKET;
}

/**
 * Upload data to R2 bucket
 *
 * @param {R2Bucket} bucket - R2 bucket instance
 * @param {string} key - Object key (file path)
 * @param {string|ArrayBuffer|Blob} data - Data to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export async function uploadToR2(bucket, key, data, options = {}) {
  try {
    const object = await bucket.put(key, data, {
      httpMetadata: {
        contentType: options.contentType || 'application/json',
        ...options.httpMetadata
      },
      ...options
    });

    return {
      key,
      size: object.size,
      uploaded: object.uploaded,
      httpEtag: object.httpEtag,
      version: object.version
    };
  } catch (error) {
    console.error('R2 upload error:', error);
    throw new Error(`Failed to upload to R2: ${error.message}`);
  }
}

/**
 * Download data from R2 bucket
 *
 * @param {R2Bucket} bucket - R2 bucket instance
 * @param {string} key - Object key
 * @returns {Promise<Object|null>} Object data or null if not found
 */
export async function downloadFromR2(bucket, key) {
  try {
    const object = await bucket.get(key);

    if (!object) {
      return null;
    }

    const data = await object.text();
    return {
      key,
      data: JSON.parse(data),
      size: object.size,
      uploaded: object.uploaded,
      httpEtag: object.httpEtag
    };
  } catch (error) {
    console.error('R2 download error:', error);
    throw new Error(`Failed to download from R2: ${error.message}`);
  }
}

/**
 * List objects in R2 bucket with prefix
 *
 * @param {R2Bucket} bucket - R2 bucket instance
 * @param {string} prefix - Key prefix to filter by
 * @param {Object} options - List options
 * @returns {Promise<Array>} Array of object keys
 */
export async function listR2Objects(bucket, prefix, options = {}) {
  try {
    const listResult = await bucket.list({
      prefix,
      limit: options.limit || 1000,
      ...options
    });

    return listResult.objects.map(obj => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded,
      httpEtag: obj.httpEtag,
      version: obj.version
    }));
  } catch (error) {
    console.error('R2 list error:', error);
    throw new Error(`Failed to list R2 objects: ${error.message}`);
  }
}

/**
 * Delete object from R2 bucket
 *
 * @param {R2Bucket} bucket - R2 bucket instance
 * @param {string} key - Object key to delete
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteFromR2(bucket, key) {
  try {
    await bucket.delete(key);
    return true;
  } catch (error) {
    console.error('R2 delete error:', error);
    throw new Error(`Failed to delete from R2: ${error.message}`);
  }
}

/**
 * Generate public URL for R2 object
 * Note: R2 objects are private by default, this generates a signed URL
 *
 * @param {R2Bucket} bucket - R2 bucket instance
 * @param {string} key - Object key
 * @param {Object} options - URL generation options
 * @returns {Promise<string>} Public URL (signed if needed)
 */
export async function getR2PublicUrl(bucket, key, options = {}) {
  // For now, return a Cloudflare R2 public URL pattern
  // In production, you might want to use signed URLs for private objects
  const accountId = options.accountId || 'your-account-id';
  const bucketName = options.bucketName || 'essentiajs';

  return `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`;
}

