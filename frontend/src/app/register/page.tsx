"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authApi } from '@/lib/api';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }
    return errors;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setFormData(prev => ({ ...prev, password: newPassword }));
    setPasswordErrors(validatePassword(newPassword));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate password before submission
    const errors = validatePassword(formData.password);
    if (errors.length > 0) {
      setError(errors.join('\n'));
      return;
    }
    
    setLoading(true);

    try {
      const data = await authApi.register(formData);

      // Show OTP if it's included in the response (development only)
      if (data.otp) {
        toast({
          title: 'Development OTP',
          description: `Your OTP is: ${data.otp}`,
          duration: 10000,
        });
      }

      toast({
        title: 'Success',
        description: 'Registration successful! Please check your email for OTP.',
      });
      
      // Redirect to OTP verification page
      router.push(`/verify-otp?email=${encodeURIComponent(formData.email)}`);
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Display the specific error message from the backend
      if (error.message === 'Email already registered') {
        setError('This email is already registered. Please login instead.');
      } else if (error.message.includes('Password must')) {
        setError(error.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-300 via-cyan-200 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-black transition-colors duration-700">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="shadow-2xl rounded-3xl hover:scale-105 hover:shadow-xl transition-all duration-300 relative"
        onMouseEnter={() => setIsHovered(true)} 
        onMouseLeave={() => setIsHovered(false)}
      >
        {isHovered && (
          <div className="absolute top-0 left-0 right-0 z-10 bg-teal-500 text-white p-2 rounded-t-3xl text-center">
            <span>Welcome! Hovering over the card</span>
          </div>
        )}
        
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
            <CardTitle className="text-3xl font-bold">Create Account</CardTitle>
            <CardDescription className="text-base mt-1 text-cyan-100">
              Enter your details to get started
            </CardDescription>
          </motion.div>
  
          {/* Content */}
          <CardContent className="p-8 space-y-6">
            {error && (
              <Alert variant="destructive" className="mb-4 rounded-xl">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {error}
                  {error.includes('already registered') && (
                    <div className="mt-2">
                      <Link href="/login" className="text-primary hover:underline">
                        Click here to login
                      </Link>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
  
            <form onSubmit={handleSubmit} className="space-y-4">
              {['name', 'email', 'password', 'role'].map((field, i) => (
                <motion.div
                  key={field}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.3 }}
                >
                  {field === 'name' && (
                    <Input
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="rounded-xl w-full"
                    />
                  )}
                  {field === 'email' && (
                    <Input
                      type="email"
                      placeholder="Email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                      className="rounded-xl w-full"
                    />
                  )}
                  {field === 'password' && (
                    <>
                      <Input
                        type="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handlePasswordChange}
                        required
                        className={`rounded-xl w-full ${passwordErrors.length > 0 ? 'border-red-500' : ''}`}
                      />
                      {formData.password && (
                        <div className="text-sm space-y-1 mt-2">
                          {passwordErrors.length > 0 ? (
                            passwordErrors.map((err, idx) => (
                              <p key={idx} className="text-red-500">{err}</p>
                            ))
                          ) : (
                            <p className="text-green-500">Password meets all requirements</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {field === 'role' && (
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger className="rounded-xl w-full">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="faculty">Faculty</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </motion.div>
              ))}
  
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
              >
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Button
                    type="submit"
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all duration-300 rounded-xl"
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </motion.div>
              </motion.div>
            </form>
          </CardContent>
  
          {/* Footer */}
          <CardFooter className="flex justify-center rounded-b-3xl bg-gray-100 dark:bg-gray-800 py-4">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-teal-600 hover:underline dark:text-teal-400">
                Login
              </Link>
            </p>
          </CardFooter>
        </motion.div>
      </motion.div>
    </div>
  );
}
