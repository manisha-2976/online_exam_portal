
// 'use client';

// import { useEffect, useState } from 'react';
// import Editor from '@monaco-editor/react';

// import { Button } from '@/components/ui/button';

// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';

// import './CodeEditor.css';

// interface CodeEditorProps {
//   initialCode?: string;
//   allowedLanguages?: string[];

//   onSubmit?: (
//     code: string,
//     language: string
//   ) => void;

//   onRun?: (
//     code: string,
//     language: string
//   ) => void;

//   submitting?: boolean;
//   running?: boolean;
// }

// const languageTemplates: Record<string, string> = {
//   javascript: `// Write your solution here

// function solve(input) {
//     // Your code here
// }

// // Example:
// // const input = require('fs').readFileSync(0, 'utf8').trim();
// // console.log(solve(input));
// `,

//   java: `import java.util.*;

// public class Solution {

//     public static void main(String[] args) {

//         // Write your solution here

//     }
// }
// `,

//   c: `#include <stdio.h>

// int main() {

//     // Write your solution here

//     return 0;
// }
// `,
// };

// const monacoLanguages: Record<string, string> = {
//   javascript: 'javascript',
//   java: 'java',
//   c: 'c',
// };

// const getLanguageName = (language: string) => {
//   switch (language) {
//     case 'javascript':
//       return 'JavaScript';

//     case 'java':
//       return 'Java';

//     case 'c':
//       return 'C';

//     default:
//       return language;
//   }
// };

// export default function CodeEditor({
//   initialCode = '',
//   allowedLanguages = ['javascript'],
//   onSubmit,
//   onRun,
//   submitting = false,
//   running = false,
// }: CodeEditorProps) {

//   const firstLanguage =
//     allowedLanguages.includes('javascript')
//       ? 'javascript'
//       : allowedLanguages[0] || 'javascript';

//   const [language, setLanguage] =
//     useState<string>(firstLanguage);

//   const [code, setCode] =
//     useState<string>(
//       initialCode || languageTemplates[firstLanguage] || ''
//     );

//   useEffect(() => {
//     if (initialCode) {
//       setCode(initialCode);
//     }
//   }, [initialCode]);

//   useEffect(() => {
//     if (!allowedLanguages.includes(language)) {

//       const newLanguage =
//         allowedLanguages[0] || 'javascript';

//       setLanguage(newLanguage);

//       setCode(
//         newLanguage === 'javascript' && initialCode
//           ? initialCode
//           : languageTemplates[newLanguage] || ''
//       );
//     }
//   }, [
//     allowedLanguages,
//     language,
//     initialCode,
//   ]);

//   const handleLanguageChange = (
//     value: string
//   ) => {

//     setLanguage(value);

//     if (
//       value === 'javascript' &&
//       initialCode
//     ) {
//       setCode(initialCode);
//     } else {
//       setCode(
//         languageTemplates[value] || ''
//       );
//     }
//   };

//   const handleRun = () => {

//     if (!code.trim()) {
//       return;
//     }

//     onRun?.(
//       code,
//       language
//     );
//   };

//   const handleSubmit = () => {

//     if (!code.trim()) {
//       return;
//     }

//     onSubmit?.(
//       code,
//       language
//     );
//   };

//   const handleReset = () => {

//     if (
//       language === 'javascript' &&
//       initialCode
//     ) {
//       setCode(initialCode);
//       return;
//     }

//     setCode(
//       languageTemplates[language] || ''
//     );
//   };

//   return (
//     <div className="editor-container">

//       {/* Controls */}
//       <div className="editor-controls">

//         {/* Language */}
//         <Select
//           value={language}
//           onValueChange={
//             handleLanguageChange
//           }
//           disabled={
//             submitting || running
//           }
//         >
//           <SelectTrigger className="language-select">
//             <SelectValue placeholder="Select language" />
//           </SelectTrigger>

//           <SelectContent>

//             {allowedLanguages.map(
//               (lang) => (
//                 <SelectItem
//                   key={lang}
//                   value={lang}
//                 >
//                   {getLanguageName(lang)}
//                 </SelectItem>
//               )
//             )}

//           </SelectContent>
//         </Select>

//         {/* Reset */}
//         <Button
//           type="button"
//           variant="outline"
//           onClick={handleReset}
//           disabled={
//             submitting || running
//           }
//         >
//           Reset Code
//         </Button>

//         {/* Run */}
//         <Button
//           type="button"
//           variant="secondary"
//           onClick={handleRun}
//           disabled={
//             submitting ||
//             running ||
//             !code.trim()
//           }
//         >
//           {running
//             ? 'Running...'
//             : 'Run Code'}
//         </Button>

//         {/* Submit */}
//         <Button
//           type="button"
//           onClick={handleSubmit}
//           disabled={
//             submitting ||
//             running ||
//             !code.trim()
//           }
//         >
//           {submitting
//             ? 'Submitting...'
//             : 'Submit Solution'}
//         </Button>

//       </div>

//       {/* Monaco */}
//       <div className="editor-wrapper">

//         <Editor
//           height="500px"
//           language={
//             monacoLanguages[language] ||
//             'javascript'
//           }
//           value={code}
//           onChange={(value) =>
//             setCode(value || '')
//           }
//           theme="vs-dark"

//           options={{
//             minimap: {
//               enabled: false,
//             },

//             fontSize: 14,

//             lineNumbers: 'on',

//             automaticLayout: true,

//             tabSize: 2,

//             scrollBeyondLastLine: false,

//             wordWrap: 'on',

//             padding: {
//               top: 10,
//             },
//           }}
//         />

//       </div>

//     </div>
//   );
// }

'use client';

import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import './CodeEditor.css';

interface CodeEditorProps {
  // Fallback single starter code (used when no per-language map is supplied, e.g. bash challenges)
  initialCode?: string;
  // Per-language starter code coming from the challenge, e.g. { javascript: '...', python: '...' }
  starterCodeMap?: Record<string, string>;
  allowedLanguages?: string[];

  onSubmit?: (code: string, language: string) => void;
  onRun?: (code: string, language: string) => void;

  submitting?: boolean;
  running?: boolean;
}

const languageTemplates: Record<string, string> = {
  javascript: `// Write your solution here

function solve(input) {
    // Your code here
}

// Example:
// const input = require('fs').readFileSync(0, 'utf8').trim();
// console.log(solve(input));
`,

  python: `# Write your solution here
import sys

def solve(input_data):
    # Your code here
    pass

if __name__ == "__main__":
    data = sys.stdin.read().strip()
    print(solve(data))
`,

  java: `import java.util.*;

public class Solution {

    public static void main(String[] args) {

        // Write your solution here

    }
}
`,

  c: `#include <stdio.h>

int main() {

    // Write your solution here

    return 0;
}
`,

  bash: `#!/bin/bash
# Write your solution here

`,
};

const monacoLanguages: Record<string, string> = {
  javascript: 'javascript',
  python: 'python',
  java: 'java',
  c: 'c',
  bash: 'shell',
};

const getLanguageName = (language: string) => {
  switch (language) {
    case 'javascript': return 'JavaScript';
    case 'python': return 'Python';
    case 'java': return 'Java';
    case 'c': return 'C';
    case 'bash': return 'Bash / Shell';
    default: return language;
  }
};

export default function CodeEditor({
  initialCode = '',
  starterCodeMap,
  allowedLanguages = ['javascript'],
  onSubmit,
  onRun,
  submitting = false,
  running = false,
}: CodeEditorProps) {

  const getStarterFor = (lang: string) =>
    starterCodeMap?.[lang] || initialCode || languageTemplates[lang] || '';

  const firstLanguage =
    allowedLanguages.includes('javascript')
      ? 'javascript'
      : allowedLanguages[0] || 'javascript';

  const [language, setLanguage] = useState<string>(firstLanguage);
  const [code, setCode] = useState<string>(getStarterFor(firstLanguage));

  // If the challenge data arrives after mount, sync once available.
  useEffect(() => {
    setCode(getStarterFor(language));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode, starterCodeMap]);

  useEffect(() => {
    if (!allowedLanguages.includes(language)) {
      const newLanguage = allowedLanguages[0] || 'javascript';
      setLanguage(newLanguage);
      setCode(getStarterFor(newLanguage));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedLanguages]);

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    setCode(getStarterFor(value));
  };

  const handleRun = () => {
    if (!code.trim()) return;
    onRun?.(code, language);
  };

  const handleSubmit = () => {
    if (!code.trim()) return;
    onSubmit?.(code, language);
  };

  const handleReset = () => {
    setCode(getStarterFor(language));
  };

  return (
    <div className="editor-container">
      <div className="editor-controls">
        <Select
          value={language}
          onValueChange={handleLanguageChange}
          disabled={submitting || running || allowedLanguages.length <= 1}
        >
          <SelectTrigger className="language-select">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {allowedLanguages.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {getLanguageName(lang)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="button" variant="outline" onClick={handleReset} disabled={submitting || running}>
          Reset Code
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={handleRun}
          disabled={submitting || running || !code.trim()}
        >
          {running ? 'Running...' : 'Run Code'}
        </Button>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || running || !code.trim()}
        >
          {submitting ? 'Submitting...' : 'Submit Solution'}
        </Button>
      </div>

      <div className="editor-wrapper">
        <Editor
          height="500px"
          language={monacoLanguages[language] || 'javascript'}
          value={code}
          onChange={(value) => setCode(value || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            automaticLayout: true,
            tabSize: 2,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            padding: { top: 10 },
          }}
        />
      </div>
    </div>
  );
}