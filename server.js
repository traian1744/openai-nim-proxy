// Añade después de las constantes, antes del middleware
console.log('🔧 Iniciando servidor...');
console.log('🔧 NIM_API_KEY configurada:', !!NIM_API_KEY);
console.log('🔧 NIM_API_BASE:', NIM_API_BASE);

// Añade esto para debug de rutas
const originalListen = app.listen;
app.listen = function(...args) {
  console.log('✅ Rutas registradas:');
  console.log('   GET  /health');
  console.log('   GET  /v1/models');
  console.log('   POST /v1/chat/completions');
  console.log('   ALL  * (catch-all)');
  return originalListen.apply(this, args);
};

// Chat completions endpoint (main proxy) - VERSIÓN CORREGIDA
app.post('/v1/chat/completions', async (req, res) => {
  try {
    console.log('🔍 /v1/chat/completions llamado con body:', req.body);
    
    const { model, messages, temperature, max_tokens, stream } = req.body;
    
    // Verifica que tenemos API key
    if (!NIM_API_KEY) {
      throw new Error('NIM_API_KEY no configurada en variables de entorno');
    }
    
    // Smart model selection with fallback
    let nimModel = MODEL_MAPPING[model];
    if (!nimModel) {
      try {
        await axios.post(`${NIM_API_BASE}/chat/completions`, {
          model: model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        }, {
          headers: { 'Authorization': `Bearer ${NIM_API_KEY}`, 'Content-Type': 'application/json' },
          validateStatus: (status) => status < 500
        }).then(res => {
          if (res.status >= 200 && res.status < 300) {
            nimModel = model;
          }
        });
      } catch (e) {
        console.log('Fallback check failed:', e.message);
      }
      
      if (!nimModel) {
        const modelLower = model.toLowerCase();
        if (modelLower.includes('gpt-4') || modelLower.includes('claude-opus') || modelLower.includes('405b')) {
          nimModel = 'meta/llama-3.1-405b-instruct';
        } else if (modelLower.includes('claude') || modelLower.includes('gemini') || modelLower.includes('70b')) {
          nimModel = 'meta/llama-3.1-70b-instruct';
        } else {
          nimModel = 'meta/llama-3.1-8b-instruct';
        }
      }
    }
    
    console.log(`🔍 Modelo seleccionado: ${model} -> ${nimModel}`);
    
    // Transform OpenAI request to NIM format
    const nimRequest = {
      model: nimModel,
      messages: messages,
      temperature: temperature || 0.9,
      max_tokens: max_tokens || null,
      extra_body: ENABLE_THINKING_MODE ? { chat_template_kwargs: { thinking: true } } : undefined,
      stream: stream || false
    };
    
    console.log('🔍 Enviando a NVIDIA NIM:', JSON.stringify(nimRequest, null, 2));
    
    // Make request to NVIDIA NIM API
    const response = await axios.post(`${NIM_API_BASE}/chat/completions`, nimRequest, {
      headers: {
        'Authorization': `Bearer ${NIM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      responseType: stream ? 'stream' : 'json',
      timeout: 30000
    });
    
    if (stream) {
      // Handle streaming response with reasoning - VERSIÓN CORREGIDA
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      let buffer = '';
      let reasoningStarted = false;
      
      response.data.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');  // <-- CORREGIDO: solo \n
        buffer = lines.pop() || '';
        
        lines.forEach(line => {
          if (line.startsWith('data: ')) {
            if (line.includes('[DONE]')) {
              res.write(line + '\n');  // <-- CORREGIDO
              return;
            }
            
            try {
              const data = JSON.parse(line.slice(6));
              if (data.choices?.[0]?.delta) {
                const reasoning = data.choices[0].delta.reasoning_content;
                const content = data.choices[0].delta.content;
                
                if (SHOW_REASONING) {
                  let combinedContent = '';
                  
                  if (reasoning && !reasoningStarted) {
                    combinedContent = '<think>\n' + reasoning;  // <-- CORREGIDO
                    reasoningStarted = true;
                  } else if (reasoning) {
                    combinedContent = reasoning;
                  }
                  
                  if (content && reasoningStarted) {
                    combinedContent += '</think>\n\n' + content;  // <-- CORREGIDO
                    reasoningStarted = false;
                  } else if (content) {
                    combinedContent += content;
                  }
                  
                  if (combinedContent) {
                    data.choices[0].delta.content = combinedContent;
                    delete data.choices[0].delta.reasoning_content;
                  }
                } else {
                  if (content) {
                    data.choices[0].delta.content = content;
                  } else {
                    data.choices[0].delta.content = '';
                  }
                  delete data.choices[0].delta.reasoning_content;
                }
              }
              res.write(`data: ${JSON.stringify(data)}\n\n`);  // <-- CORREGIDO
            } catch (e) {
              console.log('Error parsing SSE:', e.message);
              res.write(line + '\n');  // <-- CORREGIDO
            }
          }
        });
      });
      
      response.data.on('end', () => {
        console.log('✅ Stream completado');
        res.end();
      });
      
      response.data.on('error', (err) => {
        console.error('❌ Stream error:', err.message);
        res.status(500).json({ error: 'Stream error' });
      });
    } else {
      // Transform NIM response to OpenAI format with reasoning
      console.log('✅ Respuesta no-stream recibida de NVIDIA');
      
      const openaiResponse = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: response.data.choices.map(choice => {
          let fullContent = choice.message?.content || '';
          
          if (SHOW_REASONING && choice.message?.reasoning_content) {
            fullContent = '<think>\n' + choice.message.reasoning_content + '\n</think>\n\n' + fullContent;  // <-- CORREGIDO
          }
          
          return {
            index: choice.index,
            message: {
              role: choice.message.role,
              content: fullContent
            },
            finish_reason: choice.finish_reason
          };
        }),
        usage: response.data.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };
      
      res.json(openaiResponse);
    }
    
  } catch (error) {
    console.error('❌ Proxy error completo:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(error.response?.status || 500).json({
      error: {
        message: error.message || 'Internal server error',
        type: 'invalid_request_error',
        code: error.response?.status || 500,
        details: error.response?.data || null
      }
    });
  }
});
