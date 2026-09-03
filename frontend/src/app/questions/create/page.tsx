
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { questionApi } from '@/lib/api';
import BackToDashboard from '@/components/BackToDashboard';
import {
  BookText,
  ListOrdered,
  SlidersHorizontal,
  Target,
  Code2,
  ListChecks,
  Terminal,
} from 'lucide-react';

type QuestionType = 'mcq' | 'coding' | 'bash';

const CODING_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
] as const;

export default function CreateQuestion() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [questionType, setQuestionType] = useState<QuestionType>('mcq');
  const [formData, setFormData] = useState({
    text: '',
    subject: '',
    difficulty: 'easy',
    options: ['', '', '', ''],
    correctOption: 0,
  });
  // Default: all four languages supported, admin can uncheck.
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>(
    CODING_LANGUAGES.map((l) => l.value)
  );

  const toggleLanguage = (lang: string) => {
    setSupportedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (questionType === 'coding' && supportedLanguages.length === 0) {
      toast({ title: 'Error', description: 'Select at least one supported language', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      let payload: any;
      if (questionType === 'mcq') {
        payload = { type: 'mcq', ...formData };
      } else if (questionType === 'coding') {
        payload = {
          type: 'coding',
          text: formData.text,
          subject: formData.subject,
          difficulty: formData.difficulty,
          supportedLanguages,
        };
      } else {
        payload = {
          type: 'bash',
          text: formData.text,
          subject: formData.subject,
          difficulty: formData.difficulty,
        };
      }

      await questionApi.create(payload);
      toast({
        title: 'Success',
        description:
          questionType === 'mcq'
            ? 'Question created successfully'
            : questionType === 'coding'
              ? 'Coding problem created successfully'
              : 'Bash/shell problem created successfully',
      });
      router.push('/questions');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create question',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <motion.div
          className="absolute top-10 left-[-100px] w-[300px] h-[300px] bg-pink-200 rounded-full opacity-50 blur-3xl"
          animate={{ y: [0, 30, 0] }}
          transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 right-[-80px] w-[300px] h-[300px] bg-blue-200 rounded-full opacity-40 blur-3xl"
          animate={{ y: [0, -30, 0] }}
          transition={{ repeat: Infinity, duration: 12, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto p-6 max-w-3xl"
      >
        <BackToDashboard />

        <Card className="rounded-3xl shadow-xl border border-border/30 bg-white/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold text-primary">Create Question</CardTitle>
            <Button variant="ghost" onClick={() => router.push('/questions')}>
              Cancel
            </Button>
          </CardHeader>

          <CardContent>
            {/* Question Type Toggle */}
            <div className="flex gap-3 mb-8">
              <button
                type="button"
                onClick={() => setQuestionType('mcq')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 font-medium transition ${
                  questionType === 'mcq'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white/70 border-border/50 text-muted-foreground hover:bg-white'
                }`}
              >
                <ListChecks className="h-4 w-4" />
                Multiple Choice
              </button>
              <button
                type="button"
                onClick={() => setQuestionType('coding')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 font-medium transition ${
                  questionType === 'coding'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white/70 border-border/50 text-muted-foreground hover:bg-white'
                }`}
              >
                <Code2 className="h-4 w-4" />
                Coding Question
              </button>
              <button
                type="button"
                onClick={() => setQuestionType('bash')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 font-medium transition ${
                  questionType === 'bash'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white/70 border-border/50 text-muted-foreground hover:bg-white'
                }`}
              >
                <Terminal className="h-4 w-4" />
                Bash / Shell
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="text" className="flex items-center gap-2">
                  <BookText className="h-4 w-4 text-muted-foreground" />
                  {questionType === 'mcq' ? 'Question Text' : 'Problem Statement'}
                </Label>
                {questionType === 'mcq' ? (
                  <Input
                    id="text"
                    className="rounded-xl"
                    value={formData.text}
                    onChange={(e) => setFormData((prev) => ({ ...prev, text: e.target.value }))}
                    required
                  />
                ) : (
                  <Textarea
                    id="text"
                    className="rounded-xl min-h-[160px]"
                    placeholder={
                      questionType === 'coding'
                        ? 'Describe the coding problem — input format, output format, constraints, examples...'
                        : 'Describe the shell/bash task — what the script should read, do, and print...'
                    }
                    value={formData.text}
                    onChange={(e) => setFormData((prev) => ({ ...prev, text: e.target.value }))}
                    required
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="flex items-center gap-2">
                  <ListOrdered className="h-4 w-4 text-muted-foreground" />
                  Subject
                </Label>
                <Input
                  id="subject"
                  className="rounded-xl"
                  value={formData.subject}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  Difficulty
                </Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, difficulty: value }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {questionType === 'mcq' && (
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    Options
                  </Label>
                  {formData.options.map((option, index) => (
                    <motion.div key={index} className="flex items-center gap-4" whileHover={{ scale: 1.01 }}>
                      <Input
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="rounded-xl"
                        required
                      />
                      <Button
                        type="button"
                        variant={formData.correctOption === index ? 'default' : 'outline'}
                        className={`rounded-xl transition-transform ${
                          formData.correctOption === index ? 'bg-green-500 text-white hover:bg-green-600' : ''
                        }`}
                        onClick={() => setFormData((prev) => ({ ...prev, correctOption: index }))}
                      >
                        Correct
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}

              {questionType === 'coding' && (
                <div className="space-y-3">
                  <Label>Supported Languages</Label>
                  <div className="flex flex-wrap gap-3">
                    {CODING_LANGUAGES.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleLanguage(value)}
                        className={`px-4 py-2 rounded-xl border font-medium transition ${
                          supportedLanguages.includes(value)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-white/70 border-border/50 text-muted-foreground hover:bg-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {supportedLanguages.length === 0 && (
                    <p className="text-sm text-red-500">Select at least one language</p>
                  )}
                  <p className="text-sm text-muted-foreground bg-blue-50 border border-blue-100 rounded-xl p-4">
                    All four languages are selected by default. Starter code, reference solution, and test
                    cases are attached separately when this problem is added to a Challenge.
                  </p>
                </div>
              )}

              {questionType === 'bash' && (
                <p className="text-sm text-muted-foreground bg-blue-50 border border-blue-100 rounded-xl p-4">
                  This will be a shell-script-only problem. Starter script, reference solution, and test
                  cases are attached separately when this problem is added to a Bash Challenge.
                </p>
              )}

              <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="rounded-xl">
                  {loading ? 'Creating...' : 'Create Question'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}