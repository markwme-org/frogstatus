import { Router } from 'express';
import { orchestrateChat } from '../services/chatOrchestrator.js';
import { getLLMConfig } from '../config/llm.js';

const router = Router();

// Get available providers
router.get('/chat/providers', (req, res) => {
  const config = getLLMConfig();

  res.json({
    providers: [
      {
        id: 'openai',
        name: 'OpenAI GPT-4',
        enabled: config.openai.enabled,
        model: config.openai.model,
      },
      {
        id: 'anthropic',
        name: 'Anthropic Claude',
        enabled: config.anthropic.enabled,
        model: config.anthropic.model,
      },
      {
        id: 'gemini',
        name: 'Google Gemini',
        enabled: config.gemini.enabled,
        model: config.gemini.model,
      },
      {
        id: 'local',
        name: 'Local Model (Transformers.js)',
        enabled: true, // Always available
        model: 'Xenova/flan-t5-small',
      },
    ],
    mcpEnabled: config.mcp.enabled,
  });
});

// Chat endpoint (non-streaming)
router.post('/chat', async (req, res) => {
  try {
    const { provider, messages, useJFrogContext } = req.body;

    if (!provider || !messages) {
      return res.status(400).json({
        error: 'Missing required fields: provider, messages'
      });
    }

    const response = await orchestrateChat({
      provider,
      messages,
      stream: false,
      useJFrogContext: useJFrogContext || false,
    });

    res.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Chat failed'
    });
  }
});

// Streaming chat endpoint
router.post('/chat/stream', async (req, res) => {
  try {
    const { provider, messages, useJFrogContext } = req.body;

    if (!provider || !messages) {
      return res.status(400).json({
        error: 'Missing required fields: provider, messages'
      });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await orchestrateChat({
      provider,
      messages,
      stream: true,
      useJFrogContext: useJFrogContext || false,
    });

    if (typeof stream === 'string') {
      // Non-streaming response
      res.write(`data: ${JSON.stringify({ content: stream, done: true })}\n\n`);
      res.end();
      return;
    }

    // Stream the response
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Streaming chat error:', error);
    res.write(`data: ${JSON.stringify({
      error: error instanceof Error ? error.message : 'Chat failed'
    })}\n\n`);
    res.end();
  }
});

export default router;
