'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/contexts/SocketContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CheatingData {
  studentId: string;
  examId: string;
  type: string;
  details: string;
  timestamp: Date;
}

interface StudentData {
  id: string;
  name: string;
  incidents: number;
  status: 'safe' | 'warning' | 'high-risk';
}

// Sample data for charts
const cheatingData = [
  { name: 'Jan', incidents: 5 },
  { name: 'Feb', incidents: 8 },
  { name: 'Mar', incidents: 3 },
  { name: 'Apr', incidents: 12 },
  { name: 'May', incidents: 7 },
  { name: 'Jun', incidents: 4 },
];

const studentData = [
  { name: 'Safe', value: 75 },
  { name: 'Warning', value: 15 },
  { name: 'High Risk', value: 10 },
];

const COLORS = ['#4CAF50', '#FFC107', '#F44336'];

export default function AdminPanel() {
  const router = useRouter();
  const { toast } = useToast();
  const { socket } = useSocket();
  const [activeStudents, setActiveStudents] = useState(0);
  const [totalIncidents, setTotalIncidents] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState<CheatingData[]>([]);
  const [studentStatus, setStudentStatus] = useState<StudentData[]>([]);

  useEffect(() => {
    // Check if user is logged in and is admin
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || user.role !== 'admin') {
      router.push('/login');
      return;
    }

    // Listen for cheating alerts
    if (socket) {
      socket.on('cheating_alert', (data: CheatingData) => {
        setRecentAlerts(prev => [data, ...prev].slice(0, 10));
        setTotalIncidents(prev => prev + 1);
        
        // Update student status
        setStudentStatus(prev => {
          const existingStudent = prev.find(s => s.id === data.studentId);
          if (existingStudent) {
            return prev.map(s => 
              s.id === data.studentId 
                ? { ...s, incidents: s.incidents + 1, status: s.incidents >= 2 ? 'high-risk' : 'warning' }
                : s
            );
          }
          return [...prev, { id: data.studentId, name: 'Student ' + data.studentId.slice(0, 4), incidents: 1, status: 'warning' }];
        });

        toast({
          title: 'Cheating Alert',
          description: `${data.type}: ${data.details}`,
          variant: 'destructive',
        });
      });

      socket.on('exam_status', (data) => {
        if (data.status === 'started') {
          setActiveStudents(prev => prev + 1);
        } else if (data.status === 'completed') {
          setActiveStudents(prev => Math.max(0, prev - 1));
        }
      });
    }
  }, [socket, router, toast]);

  const handleAction = (studentId: string, action: 'warn' | 'disqualify') => {
    const student = studentStatus.find(s => s.id === studentId);
    if (!student) return;

    if (action === 'disqualify') {
      setStudentStatus(prev => prev.filter(s => s.id !== studentId));
      toast({
        title: 'Student Disqualified',
        description: `Student ${student.name} has been disqualified from the exam.`,
      });
    } else {
      toast({
        title: 'Warning Sent',
        description: `Warning sent to student ${student.name}.`,
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={() => router.push('/login')} variant="outline">
          Logout
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Question Management Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Question Bank</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                className="w-full" 
                onClick={() => router.push('/admin/questions')}
              >
                Manage Questions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Exam Management Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Exam Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                className="w-full" 
                onClick={() => router.push('/admin/exams')}
              >
                Manage Exams
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalIncidents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>High Risk Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">
              {studentStatus.filter(s => s.status === 'high-risk').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Safe Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {studentStatus.filter(s => s.status === 'safe').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Cheating Incidents Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cheatingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="incidents" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={studentData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {studentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <AnimatePresence>
              {recentAlerts.map((alert, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex items-center justify-between p-4 bg-red-50 rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-red-700">{alert.type}</p>
                    <p className="text-sm text-gray-600">{alert.details}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(alert.studentId, 'warn')}
                    >
                      Warn
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleAction(alert.studentId, 'disqualify')}
                    >
                      Disqualify
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 