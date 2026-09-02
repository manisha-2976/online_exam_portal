'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { examApi } from '@/lib/api';
import BackToDashboard from '@/components/BackToDashboard';

export default function ExamResults() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-6"
    >
      <BackToDashboard />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Exam Results</CardTitle>
          <Button variant="outline" onClick={() => router.push('/exams')}>
            Back to Exams
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Exam results summary and score details.</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
