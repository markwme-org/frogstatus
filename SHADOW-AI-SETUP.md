# Shadow AI Detection Setup

This document explains how the local AI model is configured for JFrog Shadow AI detection.

## Overview

JFrog Shadow AI detection (via Xray) scans Docker container images to identify AI models. According to JFrog documentation, **"Currently, Shadow AI detection supports only model packages"**, meaning it detects model files that are included in the Docker image, not API calls to external LLM services.

## Current Implementation

### Model: Xenova/flan-t5-small

The application uses `@xenova/transformers` to run a local AI model in the browser. The model (`Xenova/flan-t5-small`, ~242MB) is used for chat functionality.

### Previous Behavior (On-the-Fly Download)

Previously, the model was downloaded on-the-fly when users selected the "Local Model" option:
- Model files were downloaded to the browser's cache at runtime
- Model files were **not** included in the Docker image
- JFrog Xray could **not** detect the model because it wasn't in the container

### Current Behavior (Pre-Packaged Model)

The model is now pre-downloaded during the Docker build process:
- Model files are downloaded during `docker build` via `scripts/download-model.js`
- Model files are included in the Docker image at `/app/models/cache/`
- JFrog Xray can now scan and detect the model in the container image

## Files Modified

1. **`scripts/download-model.js`** (NEW)
   - Pre-downloads the model during Docker build
   - Stores model files in `models/cache/` directory
   - This directory is copied into the Docker image

2. **`infra/Dockerfile`**
   - Added step to run `download-model.js` during build
   - Copies `models/` directory into final Docker image
   - Model files are now part of the container for Xray scanning

3. **`infra/server.js`**
   - Serves model files statically from `/models` endpoint
   - Allows browser to optionally load models from server (future enhancement)

4. **`app-ui/src/services/transformersService.ts`**
   - Updated comments to explain model packaging approach
   - Browser still downloads from HuggingFace CDN at runtime
   - Model files in Docker image enable JFrog detection

## Best Practices for Local AI Models

### When to Package Models in Docker Images

**✅ Package models in Docker images when:**
- You need JFrog Shadow AI detection to work
- You want reproducible builds with specific model versions
- You're deploying to environments with limited internet access
- You need consistent model versions across deployments
- You want faster startup times (no download delay)

**⚠️ Download on-the-fly when:**
- Model files are very large and would bloat the image significantly
- You need flexibility to update models without rebuilding images
- You're in development and models change frequently
- Image size is a critical constraint

### Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| **Package in Docker** | ✅ JFrog detection works<br>✅ Reproducible<br>✅ Faster startup<br>✅ Works offline | ❌ Larger image size<br>❌ Slower builds<br>❌ Model version locked |
| **Download on-the-fly** | ✅ Smaller images<br>✅ Flexible model updates<br>✅ Faster builds | ❌ JFrog can't detect<br>❌ Requires internet<br>❌ Slower first use |

## How JFrog Detection Works

1. **During CI/CD**: Docker image is built with model files included
2. **Xray Scan**: `jf docker scan` analyzes the container image
3. **Detection**: Xray identifies model files (e.g., `.bin`, `.onnx`, `.json` config files)
4. **Cataloging**: Model is added to JFrog AI Catalog for governance

## Model File Structure

The model files are stored in:
```
/app/models/cache/
└── (HuggingFace cache structure)
    └── models--Xenova--flan-t5-small/
        ├── config.json
        ├── tokenizer.json
        ├── model.onnx
        └── ... (other model artifacts)
```

## Testing Shadow AI Detection

After building the Docker image:

```bash
# Build the image
docker build -f infra/Dockerfile -t frogstatus:test .

# Scan with JFrog Xray
jf docker scan frogstatus:test

# Or use JFrog CLI to push and scan
jf docker push frogstatus:test
jf docker scan frogstatus:test
```

The scan should detect the AI model files in the container.

## Future Enhancements

1. **Serve models from server**: Configure transformers.js to load models from `/models` endpoint instead of HuggingFace CDN
2. **Model versioning**: Add model version tags to track which model version is in each image
3. **Multi-model support**: Support multiple models with build-time selection
4. **Model compression**: Optimize model file sizes for smaller images

## Notes

- The browser still downloads the model from HuggingFace CDN at runtime (this is normal for `@xenova/transformers`)
- Having the model files in the Docker image is what enables JFrog detection
- The model download script is non-fatal - if it fails, the build continues (model can still be downloaded at runtime)
