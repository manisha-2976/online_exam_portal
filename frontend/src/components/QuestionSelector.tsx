import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { questionApi } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2Icon } from 'lucide-react';
import './QuestionSelector.css';

interface Question {
  _id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  isUsed?: boolean;
}

interface QuestionSelectorProps {
  selectedQuestions: string[];
  onQuestionsChange: (questions: string[]) => void;
  criteria: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export default function QuestionSelector({ selectedQuestions, onQuestionsChange, criteria }: QuestionSelectorProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const data = await questionApi.getAll();
      setQuestions(data.filter((q: Question) => !q.isUsed));
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError('Failed to load questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionToggle = (questionId: string) => {
    const newSelection = selectedQuestions.includes(questionId)
      ? selectedQuestions.filter(id => id !== questionId)
      : [...selectedQuestions, questionId];
    onQuestionsChange(newSelection);
  };

  const getDifficultyCount = (difficulty: 'easy' | 'medium' | 'hard') => {
    return selectedQuestions.filter(id => 
      questions.find(q => q._id === id)?.difficulty === difficulty
    ).length;
  };

  const isQuestionSelectable = (question: Question) => {
    if (selectedQuestions.includes(question._id)) return true;
    const currentCount = getDifficultyCount(question.difficulty);
    const maxCount = criteria[question.difficulty];
    return currentCount < maxCount;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Loader2Icon className="loading-icon" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="header-content">
            <span>Select Questions</span>
            <div className="badge-group">
              <Badge variant="outline">
                Easy: {getDifficultyCount('easy')}/{criteria.easy}
              </Badge>
              <Badge variant="outline">
                Medium: {getDifficultyCount('medium')}/{criteria.medium}
              </Badge>
              <Badge variant="outline">
                Hard: {getDifficultyCount('hard')}/{criteria.hard}
              </Badge>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : questions.length === 0 ? (
          <div className="empty-message">
            No questions available. Please create some questions first.
          </div>
        ) : (
          <ScrollArea className="question-list">
            <div className="question-items">
              {questions.map((question) => (
                <div
                  key={question._id}
                  className={`question-item ${
                    !isQuestionSelectable(question) && !selectedQuestions.includes(question._id)
                      ? 'disabled'
                      : ''
                  }`}
                >
                  <Checkbox
                    checked={selectedQuestions.includes(question._id)}
                    onCheckedChange={() => {
                      if (isQuestionSelectable(question)) {
                        handleQuestionToggle(question._id);
                      }
                    }}
                    disabled={!isQuestionSelectable(question) && !selectedQuestions.includes(question._id)}
                  />
                  <div className="question-content">
                    <div className="question-title">{question.title}</div>
                    <div className="question-details">
                      <span className="capitalize">{question.difficulty}</span> • {question.marks} marks
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
} 