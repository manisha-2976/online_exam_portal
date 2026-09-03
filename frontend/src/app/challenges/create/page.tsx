

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import BackToDashboard from '@/components/BackToDashboard';
import { challengeApi, questionApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { Code2, Terminal } from 'lucide-react';

const CODING_LANGUAGES = ['javascript', 'python', 'java',] as const;

const DEFAULT_STARTER: Record<string, string> = {
  javascript: `// Write your solution here\n\nfunction solve(input) {\n    // Your code here\n}\n`,
  python: `# Write your solution here\nimport sys\n\ndef solve(input_data):\n    # Your code here\n    pass\n\nif __name__ == "__main__":\n    data = sys.stdin.read().strip()\n    print(solve(data))\n`,
  java: `import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n`,
  bash: `#!/bin/bash\n# Write your solution here\n\n`,
};

const DEFAULT_SOLUTION: Record<string, string> = {
  javascript: `// Reference solution\nfunction solve(input) {\n    // TODO\n}\n`,
  python: `# Reference solution\ndef solve(input_data):\n    # TODO\n    pass\n`,
  java: `public class Solution {\n    public static void main(String[] args) {\n        // TODO\n    }\n}\n`,
  c: `#include <stdio.h>\n\nint main() {\n    // TODO\n    return 0;\n}\n`,
  bash: `#!/bin/bash\n# Reference solution\n\n`,
};

type ChallengeType = 'coding' | 'bash';

interface CodingQuestion {
  _id: string;
  text: string;
  subject: string;
  difficulty: string;
  type: string;
}

interface ChallengeFormData {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  startDate: string;
  endDate: string;
  questionId: string;
  allowedLanguages: string[];
  starterCode: Record<string, string>;
  solution: Record<string, string>;
  testCases: { input: string; output: string }[];
  timeLimit: number;
  memoryLimit: number;
  proctoring: {
    webcamEnabled: boolean;
    tabSwitchingEnabled: boolean;
    voiceDetectionEnabled: boolean;
  };
}

export default function CreateChallengePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [challengeType, setChallengeType] = useState<ChallengeType>('coding');
  const [codingQuestions, setCodingQuestions] = useState<CodingQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [activeLangTab, setActiveLangTab] = useState<string>('javascript');

  const [formData, setFormData] = useState<ChallengeFormData>({
    title: '',
    description: '',
    difficulty: 'medium',
    category: '',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    questionId: '',
    allowedLanguages: [...CODING_LANGUAGES],
    starterCode: { ...DEFAULT_STARTER },
    solution: { ...DEFAULT_SOLUTION },
    testCases: [{ input: '', output: '' }],
    timeLimit: 1000,
    memoryLimit: 256,
    proctoring: {
      webcamEnabled: true,
      tabSwitchingEnabled: true,
      voiceDetectionEnabled: true,
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const type = challengeType === 'bash' ? 'bash' : 'coding';
        const data = await questionApi.getAll({ type: type as any });
        setCodingQuestions(data);
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load questions', variant: 'destructive' });
      } finally {
        setLoadingQuestions(false);
      }
    })();
    setFormData((prev) => ({ ...prev, questionId: '' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeType]);

  const toggleLanguage = (lang: string) => {
    setFormData((prev) => {
      const isActive = prev.allowedLanguages.includes(lang);
      if (isActive && prev.allowedLanguages.length === 1) return prev; // keep at least one
      const next = isActive
        ? prev.allowedLanguages.filter((l) => l !== lang)
        : [...prev.allowedLanguages, lang];
      return { ...prev, allowedLanguages: next };
    });
  };

  const updateStarterCode = (lang: string, value: string) => {
    setFormData((prev) => ({ ...prev, starterCode: { ...prev.starterCode, [lang]: value } }));
  };

  const updateSolution = (lang: string, value: string) => {
    setFormData((prev) => ({ ...prev, solution: { ...prev.solution, [lang]: value } }));
  };

  const updateProctoring = (key: keyof ChallengeFormData['proctoring'], value: boolean) => {
    setFormData((prev) => ({ ...prev, proctoring: { ...prev.proctoring, [key]: value } }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.title.trim()) throw new Error('Title is required');
      if (!formData.description.trim()) throw new Error('Description is required');
      if (!formData.category.trim()) throw new Error('Category is required');
      if (!formData.questionId) throw new Error('Please select a question');
      if (challengeType === 'coding' && formData.allowedLanguages.length === 0) {
        throw new Error('Select at least one language');
      }
      if (formData.testCases.length === 0) throw new Error('At least one test case is required');

      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (isNaN(startDate.getTime())) throw new Error('Invalid start date');
      if (isNaN(endDate.getTime())) throw new Error('Invalid end date');
      if (startDate >= endDate) throw new Error('End date must be after start date');

      if (challengeType === 'coding') {
        for (const lang of formData.allowedLanguages) {
          if (!formData.solution[lang]?.trim()) {
            throw new Error(`Reference solution is required for ${lang}`);
          }
        }
      } else if (!formData.solution.bash?.trim()) {
        throw new Error('Reference solution is required for the bash script');
      }

      const payload: any = {
        title: formData.title,
        description: formData.description,
        difficulty: formData.difficulty,
        category: formData.category,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        questions: [formData.questionId],
        challengeType,
        testCases: formData.testCases,
        // solution:formData.solution,
        timeLimit: Math.max(100, Math.min(5000, formData.timeLimit)),
        memoryLimit: Math.max(16, Math.min(512, formData.memoryLimit)),
        proctoring: formData.proctoring,
      };

      if (challengeType === 'bash') {
        payload.allowedLanguages = ['bash'];
        payload.starterCode = { bash: formData.starterCode.bash || DEFAULT_STARTER.bash };
        payload.solution = { bash: formData.solution.bash };
      } else {
        payload.allowedLanguages = formData.allowedLanguages;
        payload.starterCode = Object.fromEntries(
          formData.allowedLanguages.map((lang) => [lang, formData.starterCode[lang] || DEFAULT_STARTER[lang]])
        );
        payload.solution = Object.fromEntries(
          formData.allowedLanguages.map((lang) => [lang, formData.solution[lang]])
        );
      }

      await challengeApi.create(payload);

      toast({ title: 'Success', description: 'Challenge created successfully!' });
      router.push('/challenges');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create challenge. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addTestCase = () => {
    setFormData((prev) => ({ ...prev, testCases: [...prev.testCases, { input: '', output: '' }] }));
  };

  const updateTestCase = (index: number, field: 'input' | 'output', value: string) => {
    setFormData((prev) => ({
      ...prev,
      testCases: prev.testCases.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc)),
    }));
  };

  return (
    <motion.div
      className="container mx-auto px-4 py-12 bg-gradient-to-tr from-slate-50 via-blue-50 to-purple-100 min-h-screen rounded-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <BackToDashboard />
      <Card className="shadow-2xl rounded-3xl bg-white/80 backdrop-blur border border-purple-200">
        <CardHeader>
          <CardTitle className="text-4xl font-extrabold text-purple-800 tracking-tight">Create New Challenge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setChallengeType('coding')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 font-medium transition ${
                challengeType === 'coding'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white/80 border-purple-200 text-slate-600 hover:bg-white'
              }`}
            >
              <Code2 className="h-4 w-4" />
              Coding Challenge
            </button>
            <button
              type="button"
              onClick={() => setChallengeType('bash')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 font-medium transition ${
                challengeType === 'bash'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white/80 border-purple-200 text-slate-600 hover:bg-white'
              }`}
            >
              <Terminal className="h-4 w-4" />
              Bash / Shell Challenge
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  className="rounded-2xl bg-white/90 shadow-md focus:ring-purple-500"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  required
                  className="rounded-2xl bg-white/90 shadow-md focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                required
                className="min-h-[120px] rounded-2xl bg-white/90 shadow-md focus:ring-purple-500"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="question">
                {challengeType === 'bash' ? 'Bash/Shell Question (Problem Statement)' : 'Coding Question (Problem Statement)'}
              </Label>
              {loadingQuestions ? (
                <p className="text-sm text-muted-foreground">Loading questions...</p>
              ) : codingQuestions.length === 0 ? (
                <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl p-3">
                  No {challengeType === 'bash' ? 'bash/shell' : 'coding'} questions found. Create one first on the{' '}
                  <a href="/questions/create" className="underline">Create Question</a> page, then come back here.
                </p>
              ) : (
                <Select
                  value={formData.questionId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, questionId: value }))}
                >
                  <SelectTrigger className="rounded-2xl bg-white/90 shadow-md focus:ring-purple-500">
                    <SelectValue placeholder="Select a question" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {codingQuestions.map((q) => (
                      <SelectItem key={q._id} value={q._id}>
                        {q.subject} — {q.text.slice(0, 60)}{q.text.length > 60 ? '...' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                  required
                  className="rounded-2xl bg-white/90 shadow-md focus:ring-purple-500"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                  required
                  className="rounded-2xl bg-white/90 shadow-md focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value: 'easy' | 'medium' | 'hard') =>
                    setFormData((prev) => ({ ...prev, difficulty: value }))
                  }
                >
                  <SelectTrigger className="rounded-2xl bg-white/90 shadow-md focus:ring-purple-500">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="timeLimit">Time Limit (ms)</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, timeLimit: parseInt(e.target.value) }))}
                    required
                    min={100}
                    max={5000}
                    className="rounded-2xl bg-white/90 shadow-md focus:ring-purple-500"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="memoryLimit">Memory Limit (MB)</Label>
                  <Input
                    id="memoryLimit"
                    type="number"
                    value={formData.memoryLimit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, memoryLimit: parseInt(e.target.value) }))}
                    required
                    min={16}
                    max={512}
                    className="rounded-2xl bg-white/90 shadow-md focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {challengeType === 'coding' ? (
              <>
                <div className="space-y-3">
                  <Label>Supported Languages</Label>
                  <div className="flex gap-3 flex-wrap">
                    {CODING_LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLanguage(lang)}
                        className={`px-4 py-2 rounded-xl border font-medium capitalize transition ${
                          formData.allowedLanguages.includes(lang)
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white/90 text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All four are selected by default. Click one to turn it off for this challenge.
                  </p>
                </div>

                {/* Tab bar drives both Starter Code and Reference Solution below */}
                <div className="flex gap-2 flex-wrap">
                  {formData.allowedLanguages.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setActiveLangTab(lang)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize border transition ${
                        activeLangTab === lang
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white/80 border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <Label>Starter Code ({activeLangTab})</Label>
                  <Textarea
                    value={formData.starterCode[activeLangTab] ?? DEFAULT_STARTER[activeLangTab] ?? ''}
                    onChange={(e) => updateStarterCode(activeLangTab, e.target.value)}
                    className="font-mono min-h-[160px] rounded-2xl bg-white/90 shadow-md focus:ring-purple-500"
                  />
                </div>

                {/* <div className="space-y-3">
                  <Label>Reference Solution ({activeLangTab})</Label>
                  <Textarea
                    value={formData.solution[activeLangTab] ?? DEFAULT_SOLUTION[activeLangTab] ?? ''}
                    onChange={(e) => updateSolution(activeLangTab, e.target.value)}
                    className="font-mono min-h-[160px] rounded-2xl bg-white/90 shadow-md focus:ring-purple-500"
                  />
                </div> */}
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <Label htmlFor="bashStarter">Bash Starter Script</Label>
                  <Textarea
                    id="bashStarter"
                    value={formData.starterCode.bash ?? DEFAULT_STARTER.bash}
                    onChange={(e) => updateStarterCode('bash', e.target.value)}
                    className="font-mono min-h-[160px] rounded-2xl bg-white/90 shadow-md focus:ring-purple-500"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="bashSolution">Reference Solution (Bash)</Label>
                  <Textarea
                    id="bashSolution"
                    value={formData.solution.bash ?? DEFAULT_SOLUTION.bash}
                    onChange={(e) => updateSolution('bash', e.target.value)}
                    className="font-mono min-h-[160px] rounded-2xl bg-white/90 shadow-md focus:ring-purple-500"
                  />
                </div>
              </>
            )}

            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold text-purple-700">Test Cases</Label>
                <Button type="button" onClick={addTestCase} variant="outline" className="rounded-xl text-purple-700 border-purple-300 shadow-sm">
                  + Add Test Case
                </Button>
              </div>
              {formData.testCases.map((testCase, index) => (
                <motion.div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-purple-200 rounded-2xl bg-white/90 shadow-md"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="space-y-3">
                    <Label htmlFor={`input-${index}`}>Input</Label>
                    <Textarea
                      id={`input-${index}`}
                      value={testCase.input}
                      onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                      required
                      className="rounded-2xl bg-muted/10 shadow-sm focus:ring-purple-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor={`output-${index}`}>Expected Output</Label>
                    <Textarea
                      id={`output-${index}`}
                      value={testCase.output}
                      onChange={(e) => updateTestCase(index, 'output', e.target.value)}
                      required
                      className="rounded-2xl bg-muted/10 shadow-sm focus:ring-purple-500"
                    />
                  </div>
                </motion.div>
              ))}
              <p className="text-xs text-muted-foreground">
                Test cases are input/expected-output pairs — they run against the candidate's code in
                whichever language they submitted in.
              </p>
            </div>

            {/* Proctoring */}
            <div className="space-y-4 border border-purple-200 rounded-2xl bg-white/90 shadow-md p-6">
              <Label className="text-lg font-semibold text-purple-700">Proctoring</Label>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Webcam Monitoring</p>
                  <p className="text-xs text-muted-foreground">Capture periodic images to detect cheating</p>
                </div>
                <Switch
                  checked={formData.proctoring.webcamEnabled}
                  onCheckedChange={(checked) => updateProctoring('webcamEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Tab Switching Detection</p>
                  <p className="text-xs text-muted-foreground">Warn if the student switches tabs mid-challenge</p>
                </div>
                <Switch
                  checked={formData.proctoring.tabSwitchingEnabled}
                  onCheckedChange={(checked) => updateProctoring('tabSwitchingEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Voice Detection</p>
                  <p className="text-xs text-muted-foreground">Flag if multiple voices are detected</p>
                </div>
                <Switch
                  checked={formData.proctoring.voiceDetectionEnabled}
                  onCheckedChange={(checked) => updateProctoring('voiceDetectionEnabled', checked)}
                />
              </div>

              <p className="text-xs text-muted-foreground pt-2">
                All three are on by default — turn off anything you don't want enforced for this challenge.
              </p>
            </div>

            <div className="flex justify-end gap-4 pt-8">
              <Button type="button" onClick={() => router.push('/challenges')} variant="ghost" className="rounded-xl text-purple-600 hover:bg-purple-50">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg">
                {loading ? 'Creating...' : 'Create Challenge'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}