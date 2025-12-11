import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Shield, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { LoginAPI } from '../../api';

export function LoginPage() {
  const { login, } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { mutate } = useMutation({
    mutationKey: ["Login-api"],
    mutationFn: LoginAPI,
    onSuccess: (res) => {
      login(res.data.user, res.data.token, res.data.refreshToken);
      setIsLoading(false);
      console.log(res.data, '>>>>>>>>>>>>>>>>');
      toast(res.data.message || "Login success!")
      toast.success('Login Successful', {
        description: res.data.message
      });
    },
    onError: (error: any) => {
      setIsLoading(false);
      toast.error('Login Failed', {
        description: error?.response?.data?.message
      });
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    mutate({ email, password })

    // try {
    //   const success = await login(email, password, showTwoFactor ? twoFactorCode : undefined);

    //   if (!success) {
    //     if (!showTwoFactor && (email === 'superadmin@example.com' || email === 'finance@example.com' || email === 'compliance@example.com')) {
    //       setShowTwoFactor(true);
    //       toast.info('2FA Required', {
    //         description: 'Please enter your 2FA code (use 123456 for demo)'
    //       });
    //     } else {
    //       toast.error('Login Failed', {
    //         description: 'Invalid credentials. Try: superadmin@example.com / admin123'
    //       });
    //     }
    //   } else {
    //     toast.success('Login Successful', {
    //       description: 'Welcome back to the admin panel'
    //     });
    //   }
    // } catch (error) {
    //   toast.error('Error', {
    //     description: 'An error occurred during login'
    //   });
    // } finally {
    //   setIsLoading(false);
    // }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3 rounded-xl">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {showTwoFactor && (
              <div className="space-y-2">
                <Label htmlFor="twoFactor">2FA Code</Label>
                <Input
                  id="twoFactor"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <label
                htmlFor="remember"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Remember me
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-2">Demo Credentials:</p>
            <div className="text-xs space-y-1">
              <div>
                <strong>SuperAdmin:</strong> superadmin@example.com / admin123
              </div>
              <div>
                <strong>Support:</strong> support@example.com / admin123
              </div>
              <div>
                <strong>Finance:</strong> finance@example.com / admin123
              </div>
              <div>
                <strong>Compliance:</strong> compliance@example.com / admin123
              </div>
              <div className="mt-2 text-gray-500">
                2FA code for enabled accounts: 123456
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
