#!/usr/bin/env node
/**
 * Pre-downloads the transformers.js model for inclusion in Docker image.
 * This allows JFrog Shadow AI detection to identify the model in the container.
 * 
 * The model files are downloaded to models/cache/ which is then copied into
 * the Docker image. JFrog Xray will scan these files during container analysis.
 */

import { pipeline } from '@xenova/transformers';
import { env } from '@xenova/transformers';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set cache directory to a location we can copy into Docker image
// This directory structure matches what transformers.js expects
const MODEL_CACHE_DIR = path.join(__dirname, '../models/cache');
env.cacheDir = MODEL_CACHE_DIR;

// Ensure cache directory exists
await mkdir(MODEL_CACHE_DIR, { recursive: true });

console.log('='.repeat(60));
console.log('Pre-downloading model for Docker image');
console.log('Model: Xenova/flan-t5-small');
console.log(`Cache directory: ${MODEL_CACHE_DIR}`);
console.log('='.repeat(60));

try {
  // Download the model - this will cache all necessary files
  // The model files will be stored in the cache directory structure
  // that transformers.js uses (typically huggingface/hub format)
  const model = await pipeline(
    'text2text-generation',
    'Xenova/flan-t5-small',
    {
      progress_callback: (progress) => {
        if (progress.progress !== undefined) {
          const percent = Math.round(progress.progress * 100);
          process.stdout.write(`\rProgress: ${percent}%`);
        }
      },
    }
  );
  
  console.log('\n✓ Model downloaded successfully');
  console.log(`✓ Model files cached in: ${MODEL_CACHE_DIR}`);
  
  // Test the model works to ensure download was successful
  console.log('Testing model...');
  const testResult = await model('Hello', {
    max_new_tokens: 5,
  });
  
  console.log('✓ Model test successful');
  console.log(`✓ Test output preview: ${JSON.stringify(testResult).substring(0, 100)}...`);
  console.log('\n' + '='.repeat(60));
  console.log('Model is ready for inclusion in Docker image');
  console.log('JFrog Xray will detect these model files during container scan');
  console.log('='.repeat(60));
  
} catch (error) {
  console.error('\n✗ Failed to download model:', error);
  console.error('This is non-fatal - build will continue, but model won\'t be in image');
  // Don't exit with error code to allow build to continue
  // The model can still be downloaded at runtime if needed
  process.exit(0);
}
