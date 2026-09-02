'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import BackToDashboard from '@/components/BackToDashboard';
import { fetchApi } from '@/lib/api';
import { motion } from 'framer-motion';

interface ChallengeFormData {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  startDate: string;
  endDate: string;
  questions: string[];
  starterCode: string;
  solution: string;
  testCases: { input: string; output: string }[];
  timeLimit: number;
  memoryLimit: number;
}

export default function CreateChallengePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ChallengeFormData>({
    title: '',
    description: '',
    difficulty: 'medium',
    category: '',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    questions: [],
    starterCode: '// Write your code here\n\n',
    solution: '',
    testCases: [{ input: '', output: '' }],
    timeLimit: 1000,
    memoryLimit: 256,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      if (!formData.description.trim()) {
        throw new Error('Description is required');
      }
      if (!formData.category.trim()) {
        throw new Error('Category is required');
      }
      if (formData.timeLimit < 100 || formData.timeLimit > 5000) {
        throw new Error('Time limit must be between 100ms and 5000ms');
      }
      if (formData.memoryLimit < 16 || formData.memoryLimit > 512) {
        throw new Error('Memory limit must be between 16MB and 512MB');
      }
      if (!formData.solution.trim()) {
        throw new Error('Solution is required');
      }
      if (formData.testCases.length === 0) {
        throw new Error('At least one test case is required');
      }
      
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (isNaN(startDate.getTime())) {
        throw new Error('Invalid start date');
      }
      if (isNaN(endDate.getTime())) {
        throw new Error('Invalid end date');
      }
      if (startDate >= endDate) {
        throw new Error('End date must be after start date');
      }

      const challengePayload = {
        ...formData,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        timeLimit: Math.max(100, Math.min(5000, formData.timeLimit)),
        memoryLimit: Math.max(16, Math.min(512, formData.memoryLimit))
      };

      await fetchApi('/api/challenges', {
        method: 'POST',
        body: JSON.stringify(challengePayload),
      });

      toast({
        title: 'Success',
        description: 'Challenge created successfully!',
      });
      router.push('/challenges');
    } catch (error: any) {
      console.error('Error creating challenge:', error);
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
    setFormData(prev => ({
      ...prev,
      testCases: [...prev.testCases, { input: '', output: '' }],
    }));
  };

  const updateTestCase = (index: number, field: 'input' | 'output', value: string) => {
    setFormData(prev => ({
      ...prev,
      testCases: prev.testCases.map((tc, i) =>
        i === index ? { ...tc, [field]: value } : tc
      ),
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
          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="rounded-2xl bg-white/90 shadow-md focus:ring-purple-500"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                required
                className="min-h-[120px] rounded-2xl bg-white/90 shadow-md focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
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
                    setFormData(prev => ({ ...prev, difficulty: value }))
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
                    onChange={(e) => setFormData(prev => ({ ...prev, timeLimit: parseInt(e.target.value) }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, memoryLimit: parseInt(e.target.value) }))}
                    required
                    min={16}
                    max={512}
                    className="rounded-2xl bg-white/90 shadow-md focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="starterCode">Starter Code</Label>
              <Textarea
                id="starterCode"
                value={formData.starterCode}
                onChange={(e) => setFormData(prev => ({ ...prev, starterCode: e.target.value }))}
                required
                className="font-mono min-h-[150px] rounded-2xl bg-white/90 shadow-md focus:ring-purple-500"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="solution">Solution</Label>
              <Textarea
                id="solution"
                value={formData.solution}
                onChange={(e) => setFormData(prev => ({ ...prev, solution: e.target.value }))}
                required
                className="font-mono min-h-[150px] rounded-2xl bg-white/90 shadow-md focus:ring-purple-500"
              />
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold text-purple-700">Test Cases</Label>
                <Button
                  type="button"
                  onClick={addTestCase}
                  variant="outline"
                  className="rounded-xl text-purple-700 border-purple-300 shadow-sm"
                >
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
            </div>

            <div className="flex justify-end gap-4 pt-8">
              <Button
                type="button"
                onClick={() => router.push('/challenges')}
                variant="ghost"
                className="rounded-xl text-purple-600 hover:bg-purple-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
              >
                {loading ? 'Creating...' : 'Create Challenge'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
