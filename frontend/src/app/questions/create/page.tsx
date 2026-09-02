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
} from 'lucide-react';

export default function CreateQuestion() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    text: '',
    subject: '',
    difficulty: 'easy',
    options: ['', '', '', ''],
    correctOption: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await questionApi.create(formData);
      toast({
        title: 'Success',
        description: 'Question created successfully',
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
      {/* Background SVGs */}
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
            <CardTitle className="text-xl font-bold text-primary">
              Create Question
            </CardTitle>
            <Button variant="ghost" onClick={() => router.push('/questions')}>
              Cancel
            </Button>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Question Text */}
              <div className="space-y-2">
                <Label htmlFor="text" className="flex items-center gap-2">
                  <BookText className="h-4 w-4 text-muted-foreground" />
                  Question Text
                </Label>
                <Input
                  id="text"
                  className="rounded-xl"
                  value={formData.text}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, text: e.target.value }))
                  }
                  required
                />
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject" className="flex items-center gap-2">
                  <ListOrdered className="h-4 w-4 text-muted-foreground" />
                  Subject
                </Label>
                <Input
                  id="subject"
                  className="rounded-xl"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  Difficulty
                </Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, difficulty: value }))
                  }
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

              {/* Options */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  Options
                </Label>
                {formData.options.map((option, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center gap-4"
                    whileHover={{ scale: 1.01 }}
                  >
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="rounded-xl"
                      required
                    />
                    <Button
                      type="button"
                      variant={
                        formData.correctOption === index ? 'default' : 'outline'
                      }
                      className={`rounded-xl transition-transform ${
                        formData.correctOption === index
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : ''
                      }`}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          correctOption: index,
                        }))
                      }
                    >
                      Correct
                    </Button>
                  </motion.div>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl"
                >
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
