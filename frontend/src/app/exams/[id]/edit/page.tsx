'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { examApi } from '@/lib/api';
import BackToDashboard from '@/components/BackToDashboard';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import QuestionSelector from '@/components/QuestionSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import './page.css';

interface ExamFormData {
  title: string;
  description: string;
  subject: string;
  duration: number;
  startTime: string;
  endTime: string;
  totalMarks: number;
  passingPercentage: number;
  questionCriteria: {
    easy: number;
    medium: number;
    hard: number;
  };
  selectedQuestions: string[];
  proctoring: {
    webcamEnabled: boolean;
    tabSwitchingEnabled: boolean;
    voiceDetectionEnabled: boolean;
  };
}

const subjects = [
  'JavaScript',
  'Aptitude',
  'DSA',
  'Java',
  'React',
  'MongoDB',
  'SQL',
  'Other'
];

export default function EditExamPage() {
  const params = useParams();
  const id = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : 'new';
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<ExamFormData>({
    title: '',
    description: '',
    subject: '',
    duration: 60,
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    totalMarks: 100,
    passingPercentage: 35,
    questionCriteria: {
      easy: 0,
      medium: 0,
      hard: 0
    },
    selectedQuestions: [],
    proctoring: {
      webcamEnabled: false,
      tabSwitchingEnabled: false,
      voiceDetectionEnabled: false
    }
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (id === 'new') {
      setLoading(false);
      return;
    }
    fetchExam();
  }, [id, isAuthenticated]);

  const fetchExam = async () => {
    if (!id) return;
    
    try {
      console.log('Fetching exam with ID:', id);
      const examData = await examApi.getById(id);
      console.log('Exam data received:', examData);
      
      if (!examData) {
        throw new Error('No exam data received');
      }

      setFormData({
        title: examData.title || '',
        description: examData.description || '',
        subject: examData.subject || '',
        duration: examData.duration || 60,
        startTime: examData.startTime ? new Date(examData.startTime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        endTime: examData.endTime ? new Date(examData.endTime).toISOString().slice(0, 16) : new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        totalMarks: examData.totalMarks || 100,
        passingPercentage: examData.passingPercentage || 35,
        questionCriteria: {
          easy: examData.questionCriteria?.easy || 0,
          medium: examData.questionCriteria?.medium || 0,
          hard: examData.questionCriteria?.hard || 0
        },
        selectedQuestions: examData.selectedQuestions || [],
        proctoring: {
          webcamEnabled: examData.proctoring?.webcamEnabled || false,
          tabSwitchingEnabled: examData.proctoring?.tabSwitchingEnabled || false,
          voiceDetectionEnabled: examData.proctoring?.voiceDetectionEnabled || false
        }
      });
    } catch (error) {
      console.error('Error fetching exam:', error);
      let errorMessage = 'Failed to fetch exam details';
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      setError(errorMessage);
      // Redirect to exams list if exam not found
      if (error instanceof Error && error.message.includes('not found')) {
        router.push('/exams');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      validateForm();

      const examPayload = {
        ...formData,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        duration: Math.max(1, Number(formData.duration)),
        totalMarks: Math.max(1, Number(formData.totalMarks)),
        passingPercentage: Math.min(100, Math.max(0, Number(formData.passingPercentage))),
        questions: formData.selectedQuestions,
        questionCriteria: {
          easy: Math.max(0, Number(formData.questionCriteria.easy)),
          medium: Math.max(0, Number(formData.questionCriteria.medium)),
          hard: Math.max(0, Number(formData.questionCriteria.hard))
        }
      };

      if (id === 'new') {
        await examApi.create(examPayload);
      } else {
        await examApi.update(id, examPayload);
      }

      toast({
        title: "Success",
        description: id === 'new' ? "Exam created successfully" : "Exam updated successfully"
      });
      router.push('/exams');
    } catch (error: any) {
      console.error('Error saving exam:', error);
      setError(error.message || 'Failed to save exam');
      toast({
        title: "Error",
        description: error.message || 'Failed to save exam',
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof ExamFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQuestionCriteriaChange = (difficulty: 'easy' | 'medium' | 'hard', value: string | number) => {
    // Convert empty string to 0, otherwise parse as number
    const numericValue = value === '' ? 0 : Number(value);
    
    // Ensure the value is not negative
    const validValue = Math.max(0, numericValue);
    
    setFormData(prev => ({
      ...prev,
      questionCriteria: {
        ...prev.questionCriteria,
        [difficulty]: validValue
      }
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      throw new Error('Title is required');
    }
    if (!formData.description.trim()) {
      throw new Error('Description is required');
    }
    if (!formData.subject) {
      throw new Error('Subject is required');
    }
    if (formData.duration < 1) {
      throw new Error('Duration must be at least 1 minute');
    }
    if (formData.totalMarks < 1) {
      throw new Error('Total marks must be at least 1');
    }
    if (formData.passingPercentage < 0 || formData.passingPercentage > 100) {
      throw new Error('Passing percentage must be between 0 and 100');
    }

    const startDate = new Date(formData.startTime);
    const endDate = new Date(formData.endTime);
    
    if (isNaN(startDate.getTime())) {
      throw new Error('Invalid start time');
    }
    if (isNaN(endDate.getTime())) {
      throw new Error('Invalid end time');
    }
    if (startDate >= endDate) {
      throw new Error('End time must be after start time');
    }

    // Validate question distribution matches selected questions
    const selectedQuestionsByDifficulty = {
      easy: 0,
      medium: 0,
      hard: 0
    };

    if (formData.selectedQuestions.length === 0) {
      throw new Error('Please select at least one question');
    }

    // This validation will be handled by the QuestionSelector component
    const totalQuestionsNeeded = 
      formData.questionCriteria.easy + 
      formData.questionCriteria.medium + 
      formData.questionCriteria.hard;

    if (formData.selectedQuestions.length !== totalQuestionsNeeded) {
      throw new Error('Number of selected questions must match the question distribution');
    }
  };

  const handleQuestionsChange = (questions: string[]) => {
    setFormData(prev => ({
      ...prev,
      selectedQuestions: questions
    }));
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container">
      <BackToDashboard />
      
      <div className="form-container">
        <Card>
          <CardHeader>
            <CardTitle>{id === 'new' ? 'Create New Exam' : 'Edit Exam'}</CardTitle>
            <CardDescription>
              Fill in the exam details below. All fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="basic">Basic Details</TabsTrigger>
                <TabsTrigger value="questions">Questions</TabsTrigger>
                <TabsTrigger value="proctoring">Proctoring</TabsTrigger>
              </TabsList>

              <TabsContent value="basic">
                <form className="space-y-6">
                  <div className="form-grid">
                    <div className="form-field">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="Enter exam title"
                        required
                      />
                    </div>

                    <div className="form-field">
                      <Label htmlFor="subject">Subject *</Label>
                      <Select
                        value={formData.subject}
                        onValueChange={(value) => handleInputChange('subject', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject} value={subject}>
                              {subject}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="form-field">
                      <Label htmlFor="duration">Duration (minutes) *</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        value={formData.duration}
                        onChange={(e) => handleInputChange('duration', Number(e.target.value))}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <Label htmlFor="totalMarks">Total Marks *</Label>
                      <Input
                        id="totalMarks"
                        type="number"
                        min="1"
                        value={formData.totalMarks}
                        onChange={(e) => handleInputChange('totalMarks', Number(e.target.value))}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <Label htmlFor="passingPercentage">Passing Percentage *</Label>
                      <Input
                        id="passingPercentage"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.passingPercentage}
                        onChange={(e) => handleInputChange('passingPercentage', Number(e.target.value))}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <Label htmlFor="startTime">Start Time *</Label>
                      <Input
                        id="startTime"
                        type="datetime-local"
                        value={formData.startTime}
                        onChange={(e) => handleInputChange('startTime', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <Label htmlFor="endTime">End Time *</Label>
                      <Input
                        id="endTime"
                        type="datetime-local"
                        value={formData.endTime}
                        onChange={(e) => handleInputChange('endTime', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="questions">
                <div className="space-y-6">
                  <div className="question-distribution">
                    <div className="form-field">
                      <Label htmlFor="easyQuestions">Easy Questions</Label>
                      <Input
                        id="easyQuestions"
                        type="number"
                        min="0"
                        value={formData.questionCriteria.easy}
                        onChange={(e) => handleQuestionCriteriaChange('easy', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <Label htmlFor="mediumQuestions">Medium Questions</Label>
                      <Input
                        id="mediumQuestions"
                        type="number"
                        min="0"
                        value={formData.questionCriteria.medium}
                        onChange={(e) => handleQuestionCriteriaChange('medium', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <Label htmlFor="hardQuestions">Hard Questions</Label>
                      <Input
                        id="hardQuestions"
                        type="number"
                        min="0"
                        value={formData.questionCriteria.hard}
                        onChange={(e) => handleQuestionCriteriaChange('hard', e.target.value)}
                      />
                    </div>
                  </div>

                  <QuestionSelector
                    selectedQuestions={formData.selectedQuestions}
                    onQuestionsChange={handleQuestionsChange}
                    criteria={formData.questionCriteria}
                  />
                </div>
              </TabsContent>

              <TabsContent value="proctoring">
                <div className="space-y-6">
                  <div className="proctoring-option">
                    <div className="proctoring-text">
                      <Label>Webcam Monitoring</Label>
                      <p className="text-sm text-muted-foreground">
                        Capture periodic images to detect cheating
                      </p>
                    </div>
                    <Switch
                      checked={formData.proctoring.webcamEnabled}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        proctoring: { ...prev.proctoring, webcamEnabled: checked }
                      }))}
                    />
                  </div>

                  <div className="proctoring-option">
                    <div className="proctoring-text">
                      <Label>Tab Switching Detection</Label>
                      <p className="text-sm text-muted-foreground">
                        Show warning if student switches tabs during exam
                      </p>
                    </div>
                    <Switch
                      checked={formData.proctoring.tabSwitchingEnabled}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        proctoring: { ...prev.proctoring, tabSwitchingEnabled: checked }
                      }))}
                    />
                  </div>

                  <div className="proctoring-option">
                    <div className="proctoring-text">
                      <Label>Voice Detection</Label>
                      <p className="text-sm text-muted-foreground">
                        Flag if multiple voices are detected
                      </p>
                    </div>
                    <Switch
                      checked={formData.proctoring.voiceDetectionEnabled}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        proctoring: { ...prev.proctoring, voiceDetectionEnabled: checked }
                      }))}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="button-group">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/exams')}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} onClick={handleSubmit}>
                {saving ? (
                  <div className="save-loading">
                    <div className="save-spinner"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Exam'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}