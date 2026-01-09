// Lazy import to avoid breaking the app if transformers.js has issues
let transformersModule: any = null;
let model: any = null;
let isLoading = false;

async function loadTransformers() {
  if (!transformersModule) {
    try {
      transformersModule = await import('@xenova/transformers');
      // Configure transformers.js
      // Note: allowLocalModels enables loading from local file system (Node.js only)
      // In browser, models are downloaded from HuggingFace CDN
      transformersModule.env.allowLocalModels = false;
      transformersModule.env.useBrowserCache = true;
      
      // Note: The model files are pre-downloaded during Docker build and included
      // in the container image at /app/models/cache/. This allows JFrog Shadow AI
      // detection (via Xray) to scan and identify the AI model in the container.
      // The browser will still download the model from HuggingFace CDN at runtime,
      // but having the files in the Docker image is what enables JFrog detection.
    } catch (error) {
      console.error('Failed to load transformers module:', error);
      throw new Error('Transformers.js is not available. Please use a cloud provider instead.');
    }
  }
  return transformersModule;
}

export async function initializeLocalModel(
  onProgress?: (progress: number) => void
): Promise<void> {
  if (model || isLoading) return;

  isLoading = true;

  try {
    const { pipeline } = await loadTransformers();

    // Use a smaller, more reliable model for chat
    // flan-t5-small is ~242MB instead of 783MB
    model = await pipeline(
      'text2text-generation',
      'Xenova/flan-t5-small',
      {
        progress_callback: (progress: any) => {
          if (onProgress && progress.progress !== undefined) {
            onProgress(progress.progress);
          }
        },
      }
    );
  } catch (error) {
    console.error('Failed to load local model:', error);
    throw error;
  } finally {
    isLoading = false;
  }
}

export async function chatWithLocalModel(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  if (!model) {
    await initializeLocalModel();
  }

  if (!model) {
    throw new Error('Failed to initialize local model');
  }

  // Format messages as a prompt
  const prompt = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n') + '\nAssistant:';

  const result = await model(prompt, {
    max_new_tokens: 256,
    temperature: 0.7,
    do_sample: true,
  });

  return (result as any)[0]?.generated_text || '';
}

export function isModelLoaded(): boolean {
  return model !== null;
}
