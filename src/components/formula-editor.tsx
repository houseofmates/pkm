import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Terminal, Send, Play, Sparkles, X, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface FormulaEditorProps {
    value: string;
    record: any;
    onSave: (code: string) => void;
    onCancel: () => void;
    client: any; // NocoBase client
}

// Mock AI Service until WebSocket is fully confirmed
const fetchAIResponse = async (prompt: string, context: any) => {
    try {
        const res = await fetch('https://ollama.houseofmates.space/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'qwen2.5:14b', // Or whatever is available
                prompt: `Context: ${JSON.stringify(context)}\n\nUser: ${prompt}\n\nProvide a concise JavaScript code snippet to solve the user's request using the valid context variables (record, api). Wrap code in \`\`\`javascript ... \`\`\`.`,
                stream: false
            })
        });
        const data = await res.json();
        return data.response;
    } catch (e) {
        console.error("AI Error", e);
        return "Error connecting to AI Assistant.";
    }
};

export function FormulaEditor({ value, record, onSave, onCancel, client }: FormulaEditorProps) {
    const [code, setCode] = useState(value || '// Access "record" or "api" objects here\nreturn record.title;');
    const [output, setOutput] = useState<string>('');
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
        { role: 'assistant', content: "Hello! I'm your Formula Assistant. I can help you write scripts to manipulate this record. Try asking: 'Calculate field X plus field Y'" }
    ]);
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Run Code
    const handleRun = async () => {
        setOutput('Running...');
        try {
            // Safe(ish) execution wrapper
            const func = new Function('record', 'api', 'console', `
                try {
                    ${code}
                } catch(e) {
                    throw e;
                }
            `);

            // Capture console.log
            const logs: string[] = [];
            const mockConsole = {
                log: (...args: any[]) => logs.push(args.map(a => JSON.stringify(a)).join(' ')),
                error: (...args: any[]) => logs.push('ERROR: ' + args.map(a => JSON.stringify(a)).join(' ')),
                warn: (...args: any[]) => logs.push('WARN: ' + args.map(a => JSON.stringify(a)).join(' ')),
            };

            const result = func(record, client, mockConsole);

            let outStr = '';
            if (logs.length > 0) outStr += '--- Console ---\n' + logs.join('\n') + '\n\n';
            outStr += '--- Result ---\n' + JSON.stringify(result, null, 2);

            setOutput(outStr);
        } catch (e: any) {
            setOutput('Error using Function constructor: ' + e.toString());
        }
    };

    // Send to AI
    const handleSendChat = async () => {
        if (!chatInput.trim()) return;
        const userMsg = chatInput;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatInput('');
        setIsAiLoading(true);

        // Context for AI
        const context = {
            recordKeys: Object.keys(record || {}),
            currentCode: code
        };

        const aiResponse = await fetchAIResponse(userMsg, context);
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
        setIsAiLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-7xl h-[85vh] bg-card border rounded-lg shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Terminal className="h-5 w-5 text-primary" />
                        <span className="font-bold">Formula Editor</span>
                        <span className="text-xs text-muted-foreground ml-2">Record ID: {record?.id || 'New'}</span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={handleRun} title="Test Run">
                            <Play className="h-4 w-4 mr-1 text-green-500" /> Run
                        </Button>
                        <Button variant="default" size="sm" onClick={() => onSave(code)}>
                            <Save className="h-4 w-4 mr-1" /> Save
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onCancel}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Main Content Split */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: AI Chat */}
                    <div className="w-1/3 border-r flex flex-col bg-muted/10">
                        <div className="p-2 border-b text-xs font-semibold text-muted-foreground flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-yellow-500" />
                            AI Assistant (Qwen 2.5)
                        </div>
                        <ScrollArea className="flex-1 p-4">
                            <div className="flex flex-col gap-4">
                                {messages.map((m, i) => (
                                    <div key={i} className={cn("flex flex-col gap-1 max-w-[90%]", m.role === 'user' ? "self-end items-end" : "self-start")}>
                                        <div className={cn("p-2 rounded-lg text-sm", m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                            <ReactMarkdown
                                                className="prose prose-sm dark:prose-invert max-w-none"
                                                components={{
                                                    code({ node, inline, className, children, ...props }: any) {
                                                        const match = /language-(\w+)/.exec(className || '')
                                                        return !inline && match ? (
                                                            <div className="relative group">
                                                                <code className={className} {...props}>
                                                                    {children}
                                                                </code>
                                                                <Button
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    className="absolute top-0 right-0 h-5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    onClick={() => setCode(String(children).replace(/\n$/, ''))}
                                                                >
                                                                    Apply
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        )
                                                    }
                                                }}
                                            >
                                                {m.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                ))}
                                {isAiLoading && <div className="text-xs text-muted-foreground animate-pulse">Thinking...</div>}
                            </div>
                        </ScrollArea>
                        <div className="p-2 border-t flex gap-2">
                            <Input
                                placeholder="Ask AI to generate code..."
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                                className="flex-1"
                            />
                            <Button size="icon" onClick={handleSendChat} disabled={isAiLoading}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Right: Code Editor & Output */}
                    <div className="flex-1 flex flex-col">
                        <div className="flex-1 relative">
                            <Editor
                                height="100%"
                                defaultLanguage="javascript"
                                theme="vs-dark"
                                value={code}
                                onChange={(val) => setCode(val || '')}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    lineNumbers: 'on',
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                }}
                            />
                        </div>
                        {/* Output Console */}
                        <div className="h-48 border-t bg-black text-green-400 font-mono text-xs p-2 overflow-auto">
                            <div className="text-muted-foreground mb-1 select-none">Console Output:</div>
                            <pre className="whitespace-pre-wrap">{output || 'Ready to run.'}</pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FormulaEditor;
