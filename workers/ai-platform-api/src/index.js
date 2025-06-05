export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Route handling
      if (path === '/api/summarize' && request.method === 'POST') {
        return await handleSummarize(request, env, corsHeaders);
      } else if (path === '/api/generate' && request.method === 'POST') {
        return await handleGenerate(request, env, corsHeaders);
      } else if (path === '/api/save' && request.method === 'POST') {
        return await handleSave(request, env, corsHeaders);
      } else if (path === '/api/retrieve' && request.method === 'GET') {
        return await handleRetrieve(request, env, corsHeaders);
      } else if (path === '/api/test' && request.method === 'GET') {
        return await handleTest(request, env, corsHeaders);
      } else if (path === '/') {
        return new Response('🤖 AI Content Platform API is running!', { headers: corsHeaders });
      }
      
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// Rate limiting helper using KV
async function checkRateLimit(env, identifier, limit = 10) {
  const key = `rate_limit:${identifier}`;
  const current = await env.KV.get(key);
  const count = current ? parseInt(current) : 0;
  
  if (count >= limit) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  await env.KV.put(key, (count + 1).toString(), { expirationTtl: 3600 });
  return true;
}

// Test endpoint to verify everything works
async function handleTest(request, env, corsHeaders) {
  return new Response(JSON.stringify({ 
    message: 'API is working!',
    endpoints: {
      summarize: 'POST /api/summarize',
      generate: 'POST /api/generate', 
      save: 'POST /api/save',
      retrieve: 'GET /api/retrieve'
    },
    bindings: {
      db: env.DB ? 'Connected' : 'Not connected',
      kv: env.KV ? 'Connected' : 'Not connected',
      ai: env.AI ? 'Connected' : 'Not connected'
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Summarization endpoint
// Summarization endpoint
async function handleSummarize(request, env, corsHeaders) {
  const { text } = await request.json();
  
  if (!text || text.trim().length === 0) {
    throw new Error('Text is required');
  }
  
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  await checkRateLimit(env, clientIP);
  
  try {
    const response = await env.AI.run('@cf/facebook/bart-large-cnn', {
      input_text: text,
      max_length: 150
    });
    
    // ADD THIS LINE:
    console.log('Raw AI Response for Summarize:', JSON.stringify(response, null, 2)); 
    
    const summary = response.summary || response.output || response.result || 'Summary not available';
    
    return new Response(JSON.stringify({ 
      summary: summary,
      original_length: text.length,
      summary_length: summary.length,
      raw_response: response 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('AI Summarization Error:', error); // This is the error we need to see
    return new Response(JSON.stringify({ 
      error: 'Summarization failed: ' + error.message,
      original_length: text.length
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Content generation endpoint
async function handleGenerate(request, env, corsHeaders) {
  const { prompt } = await request.json();
  
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt is required');
  }
  
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  await checkRateLimit(env, clientIP);
  
  // Call Workers AI for content generation
  const response = await env.AI.run('@cf/mistral/mistral-7b-instruct-v0.1', {
    messages: [
      { role: 'user', content: `Generate related content based on: ${prompt}` }
    ]
  });
  
  return new Response(JSON.stringify({ 
    generated: response.response 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Save content endpoint
async function handleSave(request, env, corsHeaders) {
  const { title, originalText, summary, generatedContent } = await request.json();
  
  if (!title || !originalText || !summary) {
    throw new Error('Title, original text, and summary are required');
  }
  
  // For now, we'll use a default user_id of 1
  const userId = 1;
  
  // Store in D1 database
  const result = await env.DB.prepare(
    'INSERT INTO summaries (user_id, title, original_text, summary_text, generated_content) VALUES (?, ?, ?, ?, ?)'
  ).bind(userId, title, originalText, summary, generatedContent || '').run();
  
  return new Response(JSON.stringify({ 
    id: result.meta.last_row_id,
    message: 'Content saved successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Retrieve content endpoint
async function handleRetrieve(request, env, corsHeaders) {
  const userId = 1;
  
  const result = await env.DB.prepare(
    'SELECT id, title, summary_text, created_at FROM summaries WHERE user_id = ? ORDER BY created_at DESC LIMIT 10'
  ).bind(userId).all();
  
  return new Response(JSON.stringify({ 
    summaries: result.results 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}