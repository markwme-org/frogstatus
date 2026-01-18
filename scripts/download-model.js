#!/usr/bin/env node
/**
 * Pre-downloads the transformers.js model files for inclusion in Docker image.
 * This allows JFrog Shadow AI detection to identify the model in the container.
 * 
 * Downloads model files directly from HuggingFace without loading the model,
 * avoiding the need for onnxruntime-node and glibc dependencies.
 * 
 * The model files are downloaded to models/cache/ which is then copied into
 * the Docker image. JFrog Xray will scan these files during container analysis.
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Model information
const MODEL_ID = 'Xenova/flan-t5-small';
const MODEL_CACHE_DIR = path.join(__dirname, '../models/cache');
const HUGGINGFACE_API = 'https://huggingface.co';

// Files needed for the model (these are the standard files for transformers.js models)
const MODEL_FILES = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'model.onnx',
  'model.onnx.data',
];

// Ensure cache directory exists with HuggingFace hub structure
const HUB_CACHE_DIR = path.join(MODEL_CACHE_DIR, 'hub', 'models--Xenova--flan-t5-small');
const SNAPSHOT_DIR = path.join(HUB_CACHE_DIR, 'snapshots', 'main');

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https:') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400) {
        // Follow redirect - handle both absolute and relative URLs
        const redirectUrl = new URL(response.headers.location, url).toString();
        return downloadFile(redirectUrl, dest).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function getFileList(modelId) {
  // Use HuggingFace API to get file list
  const apiUrl = `${HUGGINGFACE_API}/api/models/${modelId}/tree/main`;
  
  return new Promise((resolve, reject) => {
    https.get(apiUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const files = JSON.parse(data);
          resolve(files.map(f => f.path));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('Pre-downloading model files for Docker image');
  console.log(`Model: ${MODEL_ID}`);
  console.log(`Cache directory: ${MODEL_CACHE_DIR}`);
  console.log('='.repeat(60));

  try {
    // Create directory structure
    await mkdir(SNAPSHOT_DIR, { recursive: true });
    
    // Get list of files from HuggingFace
    console.log('Fetching model file list from HuggingFace...');
    const fileList = await getFileList(MODEL_ID);
    console.log(`Found ${fileList.length} files`);
    
    // Download each file
    let downloaded = 0;
    for (const filePath of fileList) {
      const fileName = path.basename(filePath);
      const destPath = path.join(SNAPSHOT_DIR, fileName);
      const url = `${HUGGINGFACE_API}/${MODEL_ID}/resolve/main/${filePath}`;
      
      // Skip if already downloaded
      if (fs.existsSync(destPath)) {
        console.log(`✓ ${fileName} (already exists)`);
        downloaded++;
        continue;
      }
      
      process.stdout.write(`Downloading ${fileName}... `);
      try {
        await downloadFile(url, destPath);
        const size = (fs.statSync(destPath).size / 1024 / 1024).toFixed(2);
        console.log(`✓ (${size} MB)`);
        downloaded++;
      } catch (error) {
        console.log(`✗ Error: ${error.message}`);
        // Continue with other files
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✓ Downloaded ${downloaded}/${fileList.length} files`);
    console.log(`✓ Model files cached in: ${MODEL_CACHE_DIR}`);
    console.log('Model is ready for inclusion in Docker image');
    console.log('JFrog Xray will detect these model files during container scan');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n✗ Failed to download model files:', error.message);
    console.error('This is non-fatal - build will continue, but model won\'t be in image');
    // Don't exit with error code to allow build to continue
    process.exit(0);
  }
}

main();
