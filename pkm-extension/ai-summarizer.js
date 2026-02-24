// ai-summarizer.js - conversation extraction and summarization for ai chat platforms
// runs on: gemini, jules, perplexity, lumo, chatgpt, deepseek, claude, duck.ai, copilot, ai.houseofmates.space, aistudio, grok

(function() {
    'use strict';
    
    // prevent multiple injections
    if (window.hasPKMAISummarizer) return;
    window.hasPKMAISummarizer = true;
    
    // configuration
    const CONFIG = {
        ollamaEndpoint: 'http://localhost:11434/api/generate',
        model: 'qwen2.5:7b',
        nocobaseApi: 'https://db.houseofmates.space/api/ai-convos',
        collectionName: 'ai-convos',
        buttonId: 'pkm-summarize-btn',
        maxRetries: 3,
        timeout: 120000 // 2 minutes for long conversations
    };
    
    // detect current platform
    function detectPlatform() {
        const host = window.location.hostname;
        const path = window.location.pathname;
        
        if (host === 'gemini.google.com') return 'gemini';
        if (host === 'jules.google.com') return 'jules';
        if (host === 'www.perplexity.ai' || host === 'perplexity.ai') return 'perplexity';
        if (host === 'lumo.proton.me') return 'lumo';
        if (host === 'chatgpt.com') return 'chatgpt';
        if (host === 'chat.deepseek.com') return 'deepseek';
        if (host === 'claude.ai') return 'claude';
        if (host === 'duck.ai') return 'duckai';
        if (host === 'copilot.microsoft.com') return 'copilot';
        if (host === 'ai.houseofmates.space') return 'houseofmates';
        if (host === 'aistudio.google.com') return 'aistudio';
        if (host === 'grok.com') return 'grok';
        
        return null;
    }
    
    // extraction strategies for each platform
    const extractors = {
        // gemini: message pairs in role-based containers
        gemini: () => {
            const messages = [];
            const turns = document.querySelectorAll('div[role="listitem"], .conversation-turn, [data-test-id="conversation-turn"]');
            
            turns.forEach(turn => {
                // user message
                const userMsg = turn.querySelector('[data-test-id="user-message"], .user-message, [role="textbox"]');
                // model message  
                const modelMsg = turn.querySelector('[data-test-id="model-message"], .model-message, .response-content');
                
                if (userMsg) {
                    messages.push({ role: 'user', content: cleanText(userMsg.textContent) });
                }
                if (modelMsg) {
                    messages.push({ role: 'assistant', content: cleanText(modelMsg.textContent) });
                }
            });
            
            // fallback: look for alternating message patterns
            if (messages.length === 0) {
                const allMessages = document.querySelectorAll('message-content, .message-content, [data-message-author-role]');
                allMessages.forEach(msg => {
                    const role = msg.getAttribute('data-message-author-role') || 
                                 (msg.closest('[data-test-id*="user"]') ? 'user' : 'assistant');
                    messages.push({ role, content: cleanText(msg.textContent) });
                });
            }
            
            return messages;
        },
        
        // jules: similar to gemini but different selectors
        jules: () => {
            const messages = [];
            const turns = document.querySelectorAll('.chat-turn, [data-testid="chat-turn"], .message-pair');
            
            turns.forEach(turn => {
                const userEl = turn.querySelector('.user-input, [data-testid="user-input"], .prompt-text');
                const assistantEl = turn.querySelector('.assistant-output, [data-testid="assistant-output"], .response-text');
                
                if (userEl) messages.push({ role: 'user', content: cleanText(userEl.textContent) });
                if (assistantEl) messages.push({ role: 'assistant', content: cleanText(assistantEl.textContent) });
            });
            
            return messages;
        },
        
        // perplexity: prose and copilot-message classes
        perplexity: () => {
            const messages = [];
            
            // try prose containers first
            const proseBlocks = document.querySelectorAll('.prose, [data-testid="prose"]');
            let isUser = true; // perplexity alternates user/assistant
            
            proseBlocks.forEach(block => {
                // check if it contains a user query indicator
                const isQuery = block.closest('[data-testid="query"], .query-container');
                
                if (isQuery) {
                    messages.push({ role: 'user', content: cleanText(block.textContent) });
                } else {
                    messages.push({ role: 'assistant', content: cleanText(block.textContent) });
                }
            });
            
            // fallback: copilot-message pattern
            if (messages.length === 0) {
                const copilotMsgs = document.querySelectorAll('.copilot-message, [data-testid="copilot-message"]');
                copilotMsgs.forEach((msg, idx) => {
                    const role = msg.classList.contains('user') || msg.getAttribute('data-role') === 'user' 
                        ? 'user' : 'assistant';
                    messages.push({ role, content: cleanText(msg.textContent) });
                });
            }
            
            return messages;
        },
        
        // lumo: proton's ai interface
        lumo: () => {
            const messages = [];
            const bubbles = document.querySelectorAll('.message-bubble, .chat-bubble, [data-testid="message"]');
            
            bubbles.forEach(bubble => {
                const isUser = bubble.classList.contains('user') || 
                              bubble.classList.contains('outgoing') ||
                              bubble.closest('.user-message, .outgoing-message');
                const role = isUser ? 'user' : 'assistant';
                messages.push({ role, content: cleanText(bubble.textContent) });
            });
            
            return messages;
        },
        
        // chatgpt: message groups with role attributes
        chatgpt: () => {
            const messages = [];
            
            // primary: data-message-author-role attribute
            const msgElements = document.querySelectorAll('[data-message-author-role]');
            msgElements.forEach(el => {
                const role = el.getAttribute('data-message-author-role');
                const contentEl = el.querySelector('.markdown, .message-content, [data-testid="message-content"]');
                const content = contentEl ? cleanText(contentEl.textContent) : cleanText(el.textContent);
                messages.push({ role, content });
            });
            
            // fallback: article-based structure
            if (messages.length === 0) {
                const articles = document.querySelectorAll('article, [data-testid^="conversation-turn"]');
                articles.forEach((article, idx) => {
                    const isUser = article.querySelector('[data-testid="user-message"], .user-message') !== null;
                    const role = isUser ? 'user' : 'assistant';
                    const contentEl = article.querySelector('.markdown, .text-message, [data-testid="text-message"]');
                    if (contentEl) {
                        messages.push({ role, content: cleanText(contentEl.textContent) });
                    }
                });
            }
            
            return messages;
        },
        
        // deepseek: message pairs with alternating classes
        deepseek: () => {
            const messages = [];
            const turns = document.querySelectorAll('.chat-item, .message-item, [data-testid="chat-item"]');
            
            turns.forEach(turn => {
                const isUser = turn.classList.contains('user') || 
                              turn.classList.contains('human') ||
                              turn.getAttribute('data-role') === 'user';
                const role = isUser ? 'user' : 'assistant';
                const contentEl = turn.querySelector('.message-content, .content, .markdown-body');
                if (contentEl) {
                    messages.push({ role, content: cleanText(contentEl.textContent) });
                }
            });
            
            return messages;
        },
        
        // claude: message containers with font-claude-message
        claude: () => {
            const messages = [];
            
            // claude uses specific font class and data-testid
            const msgElements = document.querySelectorAll('.font-claude-message, [data-testid="user-message"], [data-testid="assistant-message"]');
            
            msgElements.forEach(el => {
                const testId = el.getAttribute('data-testid') || '';
                const role = testId.includes('user') ? 'user' : 'assistant';
                const contentEl = el.querySelector('.prose, .message-content') || el;
                messages.push({ role, content: cleanText(contentEl.textContent) });
            });
            
            // fallback: conversation turn structure
            if (messages.length === 0) {
                const turns = document.querySelectorAll('[data-testid="conversation-turn"], .conversation-turn');
                turns.forEach(turn => {
                    const userMsg = turn.querySelector('[data-testid="user-message"]');
                    const assistantMsg = turn.querySelector('[data-testid="assistant-message"], .assistant-message');
                    
                    if (userMsg) messages.push({ role: 'user', content: cleanText(userMsg.textContent) });
                    if (assistantMsg) messages.push({ role: 'assistant', content: cleanText(assistantMsg.textContent) });
                });
            }
            
            return messages;
        },
        
        // duck.ai: simple alternating message structure
        duckai: () => {
            const messages = [];
            const msgs = document.querySelectorAll('.message, .chat-message, [data-testid="message"]');
            
            msgs.forEach((msg, idx) => {
                const isUser = msg.classList.contains('user') || 
                              msg.classList.contains('outgoing') ||
                              idx % 2 === 0; // duck alternates starting with user
                const role = isUser ? 'user' : 'assistant';
                messages.push({ role, content: cleanText(msg.textContent) });
            });
            
            return messages;
        },
        
        // copilot: message groups with specific attributes
        copilot: () => {
            const messages = [];
            
            const msgGroups = document.querySelectorAll('[data-testid="chat-turn"], .chat-turn, message-group');
            msgGroups.forEach(group => {
                const userMsg = group.querySelector('[data-testid="user-message"], .user-message');
                const botMsg = group.querySelector('[data-testid="bot-message"], .bot-message, .assistant-message');
                
                if (userMsg) messages.push({ role: 'user', content: cleanText(userMsg.textContent) });
                if (botMsg) messages.push({ role: 'assistant', content: cleanText(botMsg.textContent) });
            });
            
            return messages;
        },
        
        // houseofmates: custom interface
        houseofmates: () => {
            const messages = [];
            const chatHistory = document.querySelectorAll('.chat-message, .message, [data-testid="chat-message"]');
            
            chatHistory.forEach(msg => {
                const isUser = msg.classList.contains('user') || 
                              msg.getAttribute('data-role') === 'user' ||
                              msg.closest('.user-message');
                const role = isUser ? 'user' : 'assistant';
                messages.push({ role, content: cleanText(msg.textContent) });
            });
            
            return messages;
        },
        
        // aistudio: google's ai studio
        aistudio: () => {
            const messages = [];
            const turns = document.querySelectorAll('.chat-turn, .conversation-turn, [data-testid="turn"]');
            
            turns.forEach(turn => {
                const inputs = turn.querySelectorAll('.input-content, .user-content, [data-testid="input"]');
                const outputs = turn.querySelectorAll('.output-content, .model-content, [data-testid="output"]');
                
                inputs.forEach(el => messages.push({ role: 'user', content: cleanText(el.textContent) }));
                outputs.forEach(el => messages.push({ role: 'assistant', content: cleanText(el.textContent) }));
            });
            
            return messages;
        },
        
        // grok: x's ai interface
        grok: () => {
            const messages = [];
            const chatItems = document.querySelectorAll('.chat-item, .message-item, [data-testid="chat-item"]');
            
            chatItems.forEach(item => {
                const isUser = item.classList.contains('user') || 
                              item.getAttribute('data-message-role') === 'user';
                const role = isUser ? 'user' : 'assistant';
                const contentEl = item.querySelector('.message-content, .content, .prose') || item;
                messages.push({ role, content: cleanText(contentEl.textContent) });
            });
            
            return messages;
        }
    };
    
    // utility: clean extracted text
    function cleanText(text) {
        if (!text) return '';
        return text
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n')
            .trim();
    }
    
    // generic fallback extractor using structural heuristics
    function genericExtract() {
        const messages = [];
        
        // strategy 1: look for role attributes
        document.querySelectorAll('[role="log"], [role="list"], [role="region"]').forEach(container => {
            const items = container.querySelectorAll('[role="listitem"], > div, > article');
            items.forEach((item, idx) => {
                const text = cleanText(item.textContent);
                if (text.length < 10) return; // skip empty/short
                
                // heuristic: user messages often have input-like elements or are first in pair
                const hasInput = item.querySelector('input, textarea, [contenteditable]') !== null;
                const isShort = text.length < 200;
                const role = (hasInput || (isShort && idx % 2 === 0)) ? 'user' : 'assistant';
                
                messages.push({ role, content: text });
            });
        });
        
        // strategy 2: alternating paragraph blocks in main content
        if (messages.length === 0) {
            const mainContent = document.querySelector('main, [role="main"], .chat-container, .conversation-container');
            if (mainContent) {
                const blocks = mainContent.querySelectorAll('p, div > div, article');
                let lastRole = 'assistant';
                blocks.forEach(block => {
                    const text = cleanText(block.textContent);
                    if (text.length < 20) return;
                    
                    // alternate roles
                    lastRole = lastRole === 'user' ? 'assistant' : 'user';
                    messages.push({ role: lastRole, content: text });
                });
            }
        }
        
        return messages;
    }
    
    // extract conversation from current page
    function extractConversation() {
        const platform = detectPlatform();
        console.log('[pkm-ai] detected platform:', platform);
        
        if (!platform) {
            console.warn('[pkm-ai] unknown platform, using generic extraction');
            return genericExtract();
        }
        
        const extractor = extractors[platform];
        const messages = extractor();
        
        if (messages.length === 0) {
            console.warn('[pkm-ai] platform-specific extraction failed, trying generic');
            return genericExtract();
        }
        
        return messages;
    }
    
    // format conversation for the llm
    function formatConversation(messages) {
        let formatted = '=== conversation transcript ===\n\n';
        messages.forEach((msg, idx) => {
            const label = msg.role === 'user' ? 'user' : 'assistant';
            formatted += `[${label}]: ${msg.content}\n\n`;
        });
        return formatted;
    }
    
    // system prompt for summarization
    function getSystemPrompt() {
        return `you are a conversation analysis expert. your task is to create a comprehensive, detailed summary of the provided ai conversation.

requirements:
- extract all key information, insights, and decisions made
- preserve important technical details, code snippets, and data
- identify action items and next steps mentioned
- note any questions that were asked and how they were answered
- capture the full context so re-reading the original is unnecessary
- use structured bullet points and clear headings
- be thorough - include everything of value from the conversation

output format:
# conversation summary

## overview
brief description of what this conversation was about

## key points
- detailed point 1 with full context
- detailed point 2 with full context
- all significant information captured

## technical details
- code snippets, data, or technical explanations
- specific configurations or parameters discussed

## action items
- [ ] task 1 (if mentioned)
- [ ] task 2 (if mentioned)

## insights & takeaways
- important conclusions reached
- recommendations made by the ai

## follow-up questions
- any questions that arose from this conversation that need further exploration

remember: the user should be able to understand the entire conversation from this summary alone. be comprehensive.`;
    }
    
    // send to ollama for summarization
    async function summarizeWithOllama(transcript) {
        const prompt = `${getSystemPrompt()}\n\n${transcript}\n\nprovide a comprehensive summary:`;
        
        const response = await fetch(CONFIG.ollamaEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: CONFIG.model,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.3,
                    num_predict: 4000
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`ollama error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.response;
    }
    
    // get api token from storage
    async function getApiToken() {
        return new Promise((resolve) => {
            browser.storage.sync.get('apiToken', (result) => {
                resolve(result.apiToken || '');
            });
        });
    }
    
    // save summary to nocobase
    async function saveToNocoBase(summary, originalTranscript, platform) {
        const token = await getApiToken();
        
        if (!token) {
            throw new Error('no api token configured. please set token in extension popup.');
        }
        
        const payload = {
            title: `summary: ${platform} conversation - ${new Date().toLocaleString()}`,
            platform: platform,
            summary: summary,
            transcript: originalTranscript.substring(0, 10000), // truncate if too long
            url: window.location.href,
            captured_at: new Date().toISOString(),
            source: 'ai-summarizer-extension'
        };
        
        const response = await fetch(`${CONFIG.nocobaseApi}/${CONFIG.collectionName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`nocobase error: ${response.status} - ${errorText}`);
        }
        
        return await response.json();
    }
    
    // create and inject the summarize button
    function injectButton() {
        // remove existing button if present
        const existing = document.getElementById(CONFIG.buttonId);
        if (existing) existing.remove();
        
        const button = document.createElement('button');
        button.id = CONFIG.buttonId;
        button.textContent = 'summarize conversation';
        
        // styling - visible but unobtrusive
        button.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 2147483647;
            background: linear-gradient(135deg, #f6b012 0%, #e5a000 100%);
            color: #000;
            border: none;
            border-radius: 8px;
            padding: 10px 16px;
            font-family: "Varela Round", -apple-system, sans-serif;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(246, 176, 18, 0.3);
            transition: all 0.2s ease;
            text-transform: lowercase;
            letter-spacing: 0.3px;
        `;
        
        // hover effects
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 4px 12px rgba(246, 176, 18, 0.4)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 2px 8px rgba(246, 176, 18, 0.3)';
        });
        
        // click handler
        button.addEventListener('click', handleSummarize);
        
        document.body.appendChild(button);
        console.log('[pkm-ai] summarize button injected');
    }
    
    // handle summarize button click
    async function handleSummarize() {
        const button = document.getElementById(CONFIG.buttonId);
        if (!button) return;
        
        // set loading state
        button.disabled = true;
        button.textContent = 'extracting...';
        button.style.opacity = '0.7';
        
        try {
            // step 1: extract conversation
            console.log('[pkm-ai] extracting conversation...');
            const messages = extractConversation();
            
            if (messages.length === 0) {
                throw new Error('no conversation found on this page');
            }
            
            console.log(`[pkm-ai] extracted ${messages.length} messages`);
            const transcript = formatConversation(messages);
            
            // step 2: summarize with ollama
            button.textContent = 'summarizing...';
            console.log('[pkm-ai] sending to ollama...');
            const summary = await summarizeWithOllama(transcript);
            console.log('[pkm-ai] summary received');
            
            // step 3: save to nocobase
            button.textContent = 'saving...';
            const platform = detectPlatform() || 'unknown';
            const result = await saveToNocoBase(summary, transcript, platform);
            console.log('[pkm-ai] saved to nocobase:', result);
            
            // success state
            button.textContent = 'saved!';
            button.style.background = '#22c55e';
            
            // notify content script to show toast
            browser.runtime.sendMessage({
                action: 'show_toast',
                message: 'conversation summarized and saved',
                isError: false
            });
            
            // reset after 3 seconds
            setTimeout(() => {
                button.disabled = false;
                button.textContent = 'summarize conversation';
                button.style.opacity = '1';
                button.style.background = 'linear-gradient(135deg, #f6b012 0%, #e5a000 100%)';
            }, 3000);
            
        } catch (error) {
            console.error('[pkm-ai] error:', error);
            
            // error state
            button.textContent = 'error - retry?';
            button.style.background = '#ef4444';
            button.disabled = false;
            
            // notify content script to show error toast
            browser.runtime.sendMessage({
                action: 'show_toast',
                message: error.message || 'failed to summarize',
                isError: true
            });
            
            // reset after 5 seconds
            setTimeout(() => {
                button.textContent = 'summarize conversation';
                button.style.opacity = '1';
                button.style.background = 'linear-gradient(135deg, #f6b012 0%, #e5a000 100%)';
            }, 5000);
        }
    }
    
    // initialize when dom is ready
    function init() {
        const platform = detectPlatform();
        if (!platform) {
            console.log('[pkm-ai] not on a supported ai platform');
            return;
        }
        
        console.log('[pkm-ai] initializing on', platform);
        injectButton();
        
        // re-inject button if page changes (spa navigation)
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                setTimeout(injectButton, 1000);
            }
        }).observe(document, { subtree: true, childList: true });
    }
    
    // run initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
