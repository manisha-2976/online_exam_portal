'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { authApi } from '@/lib/api';
import { motion } from 'framer-motion';

export default function VerifyOTP() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(true);
  const [countdown, setCountdown] = useState(60);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const email = searchParams.get('email');

  useEffect(() => {
    if (!email) {
      toast({
        title: 'Error',
        description: 'No email provided. Please register first.',
        variant: 'destructive',
      });
      router.push('/register');
    }
  }, [email, router, toast]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0 && resendDisabled) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setResendDisabled(false);
    }
    return () => clearInterval(timer);
  }, [countdown, resendDisabled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await authApi.verifyOTP({ email, otp });

      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(data.user));

      toast({
        title: 'Success',
        description: 'Email verified successfully!',
      });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      await authApi.resendOTP({ email });

      toast({
        title: 'Success',
        description: 'OTP sent successfully!',
      });
      setResendDisabled(true);
      setCountdown(60);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (!email) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-300 via-cyan-200 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-black transition-colors duration-700">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="shadow-2xl rounded-3xl hover:scale-105 hover:shadow-xl transition-all duration-300"
      >
        <motion.div
          className="w-[460px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-3xl overflow-hidden"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
        >
          {/* Header */}
          <motion.div
            className="p-8 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-t-3xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <CardTitle className="text-3xl font-bold">Verify Your Email</CardTitle>
            <CardDescription className="text-base mt-1 text-cyan-100">
              Enter the OTP sent to <span className="font-semibold">{email}</span>
            </CardDescription>
          </motion.div>

          {/* Content */}
          <CardContent className="p-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  className="rounded-xl w-full tracking-widest text-lg text-center"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Button
                    type="submit"
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all duration-300 rounded-xl"
                    disabled={loading}
                  >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </Button>
                </motion.div>
              </motion.div>

              <motion.div
                className="text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResendOTP}
                  disabled={resendDisabled}
                  className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
                >
                  {resendDisabled
                    ? `Resend OTP in ${countdown}s`
                    : 'Resend OTP'}
                </Button>
              </motion.div>
            </form>
          </CardContent>

          {/* Footer */}
          <CardFooter className="flex justify-center rounded-b-3xl bg-gray-100 dark:bg-gray-800 py-4">
            <p className="text-sm text-muted-foreground">
              Didn't receive OTP?{' '}
              <Button
                variant="link"
                className="text-teal-600 dark:text-teal-400 p-0"
                onClick={handleResendOTP}
                disabled={resendDisabled}
              >
                {resendDisabled ? `Try again in ${countdown}s` : 'Click here'}
              </Button>
            </p>
          </CardFooter>
        </motion.div>
      </motion.div>
    </div>
  );
}
