'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { User } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const examData = [
  { name: 'Week 1', exams: 4 },
  { name: 'Week 2', exams: 3 },
  { name: 'Week 3', exams: 6 },
  { name: 'Week 4', exams: 2 },
];

const resultData = [
  { name: 'Passed', value: 75 },
  { name: 'Failed', value: 25 },
];

const COLORS = ['#10b981', '#ef4444'];

export default function Dashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading, logout } = useAuth();
  const [showProfileCard, setShowProfileCard] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: 'Success', description: 'Logged out successfully' });
      router.push('/login');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to logout', variant: 'destructive' });
    }
  };

  const startLiveExam = () => {
    const hasLiveExam = true;
    if (hasLiveExam) {
      router.push('/exams/live');
    } else {
      toast({ title: 'No Exam', description: 'No live exam available currently', variant: 'destructive' });
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-8 space-y-12 bg-gradient-to-tr from-[#dbeafe] via-[#f0f9ff] to-[#e0f2fe] rounded-xl min-h-screen"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <motion.h1
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-extrabold text-slate-800"
        >
          Welcome, {user.name}!
        </motion.h1>

        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative flex gap-4"
        >
          <Button variant="outline" onClick={() => router.push('/profile')} className="hover:scale-105 transition shadow">
            Edit Profile
          </Button>
          <Button variant="destructive" onClick={handleLogout} className="hover:scale-105 transition shadow">
            Logout
          </Button>
          <button
            onClick={() => setShowProfileCard(!showProfileCard)}
            className="p-2 rounded-full hover:bg-slate-200 transition border border-slate-300 bg-white"
          >
            <User className="w-5 h-5 text-slate-700" />
          </button>

          {showProfileCard && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-14 z-10 bg-white border border-slate-200 rounded-lg shadow-md p-4 w-64 space-y-1 text-sm text-gray-700"
            >
              <p><strong>Name:</strong> {user.name}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> {user.role}</p>
              <p><strong>Status:</strong> {user.isEmailVerified ? 'Verified' : 'Not Verified'}</p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Updated Card Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mt-8">
        <AnimatedCard delay={0.35} className="min-h-[280px]">
          <CardHeader><CardTitle>Challenges</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(user.role === 'faculty' || user.role === 'admin') && (
              <SoftButton onClick={() => router.push('/challenges/create')}>Create Challenge</SoftButton>
            )}
            <SoftButton outline onClick={() => router.push('/challenges')}>Explore Challenges</SoftButton>
            <SoftButton outline onClick={() => router.push('/challenges/submissions')}>View Submissions</SoftButton>
          </CardContent>
        </AnimatedCard>

        {(user.role === 'faculty' || user.role === 'admin') && (
          <AnimatedCard delay={0.4} className="min-h-[280px]">
            <CardHeader><CardTitle>Questions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SoftButton onClick={() => router.push('/questions/create')}>Create Questions</SoftButton>
              <SoftButton outline onClick={() => router.push('/questions')}>Manage Questions</SoftButton>
            </CardContent>
          </AnimatedCard>
        )}

        {(user.role === 'faculty' || user.role === 'admin') && (
          <AnimatedCard delay={0.5} className="min-h-[280px]">
            <CardHeader><CardTitle>Exams</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SoftButton onClick={() => router.push('/exams/create')}>Create Exam</SoftButton>
              <SoftButton outline onClick={() => router.push('/exams')}>View Exams</SoftButton>
              <SoftButton outline onClick={() => router.push('/results')}>View Results</SoftButton>
            </CardContent>
          </AnimatedCard>
        )}

        {user.role === 'student' && (
          <AnimatedCard delay={0.4} className="min-h-[240px]">
            <CardHeader><CardTitle>Exams</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SoftButton onClick={() => router.push('/exams')}>Available Exams</SoftButton>
              <SoftButton outline onClick={() => router.push('/results')}>View Results</SoftButton>
              <SoftButton onClick={startLiveExam} outline>Start Live Exam</SoftButton>
            </CardContent>
          </AnimatedCard>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <AnimatedCard delay={0.6}>
          <CardHeader><CardTitle>Exam Stats</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={examData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="exams" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard delay={0.7}>
          <CardHeader><CardTitle>Pass/Fail Rate</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={resultData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {resultData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </AnimatedCard>
      </div>
    </motion.div>
  );
}

// Reusable Animated Card
const AnimatedCard = ({ children, delay = 0.3, className = '' }) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    whileHover={{ scale: 1.02 }}
    className={`transition-all duration-300 ${className}`}
  >
    <Card className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-200 hover:shadow-xl transition-all duration-300 ease-in-out">
      {children}
    </Card>
  </motion.div>
);

// Reusable Soft Gradient Button
const SoftButton = ({ children, onClick, outline = false }) => (
  <Button
    onClick={onClick}
    className={`w-full rounded-xl px-4 py-2 font-semibold transition-transform hover:scale-105 hover:shadow-md ${
      outline
        ? 'border border-slate-400 text-slate-700 bg-white hover:bg-slate-100'
        : 'bg-gradient-to-r from-blue-500 to-sky-400 text-white hover:from-sky-500 hover:to-blue-600'
    }`}
  >
    {children}
  </Button>
);
