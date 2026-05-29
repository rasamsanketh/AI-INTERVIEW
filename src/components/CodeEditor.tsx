import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, AlertTriangle, Terminal, Code } from 'lucide-react';

interface CodeEditorProps {
  initialCode: string;
  language: string;
  onChange: (code: string) => void;
  onBackspacePressed: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  initialCode,
  language,
  onChange,
  onBackspacePressed
}) => {
  const [code, setCode] = useState(initialCode);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [consoleError, setConsoleError] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lineCounterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCode(initialCode);
    setConsoleOutput([]);
    setConsoleError(null);
  }, [initialCode]);

  // Sync scroll between textarea and line-number sidebar
  const handleScroll = () => {
    if (textareaRef.current && lineCounterRef.current) {
      lineCounterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 1. Capture Backspaces for confidence metric
    if (e.key === 'Backspace') {
      onBackspacePressed();
    }

    // 2. Enable TAB indentation (inserts 2 spaces)
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      const newCode = val.substring(0, start) + '  ' + val.substring(end);
      setCode(newCode);
      onChange(newCode);

      // Reset selection cursor
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCode(val);
    onChange(val);
  };

  // Safe Browser JS Code execution
  const runCode = () => {
    setConsoleOutput([]);
    setConsoleError(null);

    const originalLog = console.log;
    const logs: string[] = [];

    // Temporarily hijack console.log to capture stdout
    console.log = (...args) => {
      logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    };

    try {
      // Evaluate JavaScript in an isolated scope
      // We wrap it in a function block
      const result = new Function(code)();
      
      console.log = originalLog; // Restore console

      if (logs.length === 0) {
        if (result !== undefined) {
          setConsoleOutput([`Returned: ${typeof result === 'object' ? JSON.stringify(result) : String(result)}`]);
        } else {
          setConsoleOutput(['Code ran successfully (no output returned).']);
        }
      } else {
        setConsoleOutput(logs);
      }
    } catch (err: any) {
      console.log = originalLog; // Restore console
      setConsoleError(err.message || 'Execution error');
    }
  };

  const resetCode = () => {
    setCode(initialCode);
    onChange(initialCode);
    setConsoleOutput([]);
    setConsoleError(null);
  };

  // Generate line numbers based on code line breaks
  const lineNumbers = code.split('\n').map((_, index) => index + 1);

  return (
    <div className="editor-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Editor Header */}
      <div className="editor-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Code size={16} className="text-cyan-glow" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            SANDBOX ({language.toUpperCase()})
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={resetCode} 
            className="btn-cyber purple"
            style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '4px' }}
            title="Reset code template"
          >
            <RotateCcw size={12} /> Reset
          </button>
          <button 
            onClick={runCode} 
            className="btn-cyber"
            style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '4px' }}
            title="Execute JavaScript"
          >
            <Play size={12} /> Run Code
          </button>
        </div>
      </div>

      {/* Editor Workspace */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Line Numbers Sidebar */}
        <div 
          ref={lineCounterRef}
          style={{
            width: '40px',
            padding: '16px 0',
            background: '#060a12',
            borderRight: '1px solid rgba(255, 255, 255, 0.05)',
            textAlign: 'right',
            paddingRight: '8px',
            color: 'rgba(255, 255, 255, 0.25)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '13px',
            userSelect: 'none',
            overflowY: 'hidden',
            lineHeight: '1.6'
          }}
        >
          {lineNumbers.map((num) => (
            <div key={num}>{num}</div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: '#c9d1d9',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '13.5px',
            padding: '16px',
            resize: 'none',
            outline: 'none',
            lineHeight: '1.6',
            overflowY: 'auto',
            whiteSpace: 'pre',
            tabSize: 2
          }}
          placeholder="// Type your code solution here..."
          spellCheck="false"
        />
      </div>

      {/* Console Panel */}
      <div 
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          background: '#05070e',
          display: 'flex',
          flexDirection: 'column',
          height: '140px'
        }}
      >
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: '#090c15',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.03)'
          }}
        >
          <Terminal size={12} />
          <span>CONSOLE OUTPUT</span>
        </div>
        
        <div 
          style={{
            flex: 1,
            padding: '10px 14px',
            overflowY: 'auto',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
            lineHeight: '1.4'
          }}
        >
          {consoleError && (
            <div style={{ color: 'var(--stress-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={12} />
              <span>{consoleError}</span>
            </div>
          )}
          
          {!consoleError && consoleOutput.map((log, index) => (
            <div key={index} style={{ color: '#a3e635', marginBottom: '3px' }}>
              &gt; {log}
            </div>
          ))}
          
          {!consoleError && consoleOutput.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Run code to view output...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
