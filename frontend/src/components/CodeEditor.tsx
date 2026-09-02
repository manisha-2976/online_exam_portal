'use client';

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import './CodeEditor.css';

interface CodeEditorProps {
  challengeId: string;
  sampleTestCases: Array<{ input: string; output: string }>;
}

const languageTemplates = {
  python: '# Write your solution here\n\ndef solve(input_data):\n    # Your code here\n    pass\n\n# Example usage:\n# input_data = input()\n# result = solve(input_data)\n# print(result)',
  javascript: '// Write your solution here\n\nfunction solve(input) {\n    // Your code here\n}\n\n// Example usage:\n// const input = readline();\n// const result = solve(input);\n// console.log(result);',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}',
  java: 'public class Solution {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}'
};

export default function CodeEditor({ challengeId, sampleTestCases }: CodeEditorProps) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCode(languageTemplates[language]);
  }, [language]);

  const runCode = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/code/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          input: sampleTestCases[0].input,
          challengeId
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run code');
      }

      setOutput(data.output);
      
      if (data.success) {
        toast.success('Code ran successfully!');
      } else {
        toast.error(`Execution failed: ${data.status}`);
      }
    } catch (error) {
      console.error('Error running code:', error);
      toast.error('Failed to run code');
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/challenges/${challengeId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit code');
      }

      if (data.status === 'Accepted') {
        toast.success('All test cases passed!');
      } else {
        toast.error(`${data.testCasesPassed}/${data.totalTestCases} test cases passed`);
      }
    } catch (error) {
      console.error('Error submitting code:', error);
      toast.error('Failed to submit code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="editor-container">
      <div className="editor-controls">
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="language-select">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="python">Python</SelectItem>
            <SelectItem value="javascript">JavaScript</SelectItem>
            <SelectItem value="cpp">C++</SelectItem>
            <SelectItem value="java">Java</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={runCode} disabled={loading}>
          {loading ? 'Running...' : 'Run Code'}
        </Button>

        <Button onClick={submitCode} disabled={loading} variant="default">
          {loading ? 'Submitting...' : 'Submit'}
        </Button>
      </div>

      <div className="editor-wrapper">
        <Editor
          height="100%"
          defaultLanguage={language}
          value={code}
          onChange={(value) => setCode(value || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            automaticLayout: true,
          }}
        />
      </div>

      {output && (
        <div className="output-section">
          <h3 className="output-title">Output:</h3>
          <pre className="output-content">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
} 