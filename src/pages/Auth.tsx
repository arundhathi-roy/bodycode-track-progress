import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mail, Lock, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';

const Auth = () => {
  const { signIn, signUp, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });

  // Redirect authenticated users
  useEffect(() => {
    if (user) {
      window.location.href = '/';
    }
  }, [user]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await signIn(loginForm.email, loginForm.password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link.');
        } else {
          setError(error.message);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (signupForm.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await signUp(signupForm.email, signupForm.password);
      if (error) {
        if (error.message.includes('User already registered')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          setError(error.message);
        }
      } else {
        setSuccess('Account created successfully! Please check your email for a confirmation link.');
        setSignupForm({ email: '', password: '', confirmPassword: '' });
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-gradient-primary opacity-5 animate-pulse-glow"></div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo and Header */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="relative">
            <img 
              src="/lovable-uploads/photo-output.PNG" 
              alt="BodyCode Logo" 
              className="h-28 mx-auto mb-6 drop-shadow-lg transition-transform hover:scale-105 duration-300"
            />
            <div className="absolute inset-0 bg-gradient-primary opacity-20 rounded-full blur-2xl"></div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3 tracking-tight">Welcome to BodyCode</h1>
          <p className="text-muted-foreground text-lg">Crack the Code to a Better Body</p>
        </div>

        <Card className="p-8 bg-gradient-card shadow-strong border-0 backdrop-blur-sm animate-slide-up">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1 rounded-lg">
              <TabsTrigger 
                value="signin" 
                className="data-[state=active]:bg-background data-[state=active]:shadow-soft transition-all duration-300"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="data-[state=active]:bg-background data-[state=active]:shadow-soft transition-all duration-300"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Sign Up
              </TabsTrigger>
            </TabsList>

            {/* Enhanced Error/Success Alerts */}
            {error && (
              <Alert className="mb-6 border-destructive/30 bg-destructive/10 animate-slide-down">
                <AlertDescription className="text-destructive font-medium">{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="mb-6 border-success/30 bg-success/10 animate-slide-down">
                <AlertDescription className="text-success font-medium">{success}</AlertDescription>
              </Alert>
            )}

            {/* Enhanced Sign In Tab */}
            <TabsContent value="signin" className="space-y-0">
              <form onSubmit={handleSignIn} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-semibold">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email address"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                      disabled={isLoading}
                      className="pl-10 h-12 bg-background/50 border-input/50 focus:border-primary focus:bg-background transition-all duration-300"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-semibold">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="signin-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                      disabled={isLoading}
                      className="pl-10 pr-10 h-12 bg-background/50 border-input/50 focus:border-primary focus:bg-background transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-primary hover:shadow-medium transition-all duration-300 text-primary-foreground font-semibold text-base" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing you in...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-5 w-5" />
                      Sign In to Your Account
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Enhanced Sign Up Tab */}
            <TabsContent value="signup" className="space-y-0">
              <form onSubmit={handleSignUp} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-semibold">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email address"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      required
                      disabled={isLoading}
                      className="pl-10 h-12 bg-background/50 border-input/50 focus:border-primary focus:bg-background transition-all duration-300"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-semibold">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="signup-password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="Create a secure password"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      required
                      disabled={isLoading}
                      className="pl-10 pr-10 h-12 bg-background/50 border-input/50 focus:border-primary focus:bg-background transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">At least 6 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm" className="text-sm font-semibold">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="signup-confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                      required
                      disabled={isLoading}
                      className="pl-10 pr-10 h-12 bg-background/50 border-input/50 focus:border-primary focus:bg-background transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-primary hover:shadow-medium transition-all duration-300 text-primary-foreground font-semibold text-base" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating your account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-5 w-5" />
                      Create Your Account
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="text-center mt-8 space-y-2">
          <p className="text-sm text-muted-foreground">
            By creating an account, you agree to our{' '}
            <span className="text-primary hover:underline cursor-pointer">terms of service</span>{' '}
            and{' '}
            <span className="text-primary hover:underline cursor-pointer">privacy policy</span>.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Secure • Fast • Private
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;