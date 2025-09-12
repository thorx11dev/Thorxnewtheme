import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TechnicalLabel from "@/components/ui/technical-label";
import Barcode from "@/components/ui/barcode";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Delete, Eye, EyeOff } from "lucide-react";

// Animated Placeholder Component
function AnimatedPlaceholder({ examples }: { examples: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const example = examples[currentIndex];
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      if (currentText.length < example.length) {
        timeout = setTimeout(() => {
          setCurrentText(example.slice(0, currentText.length + 1));
        }, 100);
      } else {
        timeout = setTimeout(() => setIsTyping(false), 1000);
      }
    } else {
      if (currentText.length > 0) {
        timeout = setTimeout(() => {
          setCurrentText(currentText.slice(0, -1));
        }, 50);
      } else {
        setCurrentIndex((prev) => (prev + 1) % examples.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [currentText, currentIndex, examples, isTyping]);

  return (
    <span className="text-muted-foreground">
      {currentText}<span className="animate-pulse">|</span>
    </span>
  );
}

const registerSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  identity: z.string().min(1, "Identity is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  confirmPassword: z.string(),
  referralCode: z.string().optional()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

type RegisterForm = z.infer<typeof registerSchema>;
type LoginForm = z.infer<typeof loginSchema>;

export default function Auth() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("register");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [generatedIdentity, setGeneratedIdentity] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Identity generation function
  const generateThorxIdentity = (firstName: string, lastName: string): string => {
    const thorxPrefixes = ['THORX', 'EARN', 'DIGI', 'CYBER', 'PRIME', 'ALPHA', 'CORE', 'ELITE'];
    const thorxSuffixes = ['MASTER', 'FORCE', 'AGENT', 'BUILDER', 'TRADER', 'GENIUS', 'COMMANDER', 'PIONEER'];
    const numbers = Math.floor(Math.random() * 9999) + 1000;
    
    if (firstName && lastName) {
      const prefix = thorxPrefixes[Math.floor(Math.random() * thorxPrefixes.length)];
      const suffix = thorxSuffixes[Math.floor(Math.random() * thorxSuffixes.length)];
      const initial = firstName.charAt(0).toUpperCase() + lastName.charAt(0).toUpperCase();
      return `${prefix}_${initial}_${suffix}_${numbers}`;
    }
    return '';
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' && e.target === document.body) {
        e.preventDefault();
        setLocation("/");
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setLocation]);

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      identity: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      referralCode: ""
    }
  });

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  // Watch first and last name for identity generation
  const firstName = registerForm.watch('firstName');
  const lastName = registerForm.watch('lastName');
  
  useEffect(() => {
    if (firstName && lastName) {
      const identity = generateThorxIdentity(firstName, lastName);
      setGeneratedIdentity(identity);
      registerForm.setValue('identity', identity);
    }
  }, [firstName, lastName, registerForm]);

  const registerMutation = useMutation({
    mutationFn: (data: RegisterForm) => apiRequest("POST", "/api/register", data),
    onSuccess: () => {
      // Invalidate auth queries to refresh user state
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      
      toast({
        title: "Registration Successful",
        description: "Welcome to THORX! Your earning journey begins now.",
      });
      
      // Add delay to ensure session is established before navigation
      setTimeout(() => {
        setLocation("/");
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    }
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginForm) => apiRequest("POST", "/api/login", data),
    onSuccess: () => {
      // Invalidate auth queries to refresh user state
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      
      toast({
        title: "Login Successful",
        description: "Welcome back to THORX!",
      });
      
      // Add delay to ensure session is established before navigation
      setTimeout(() => {
        setLocation("/");
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials.",
        variant: "destructive"
      });
    }
  });

  const onRegisterSubmit = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  const onLoginSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="auth-page">
      {/* Industrial Grid Overlay */}
      <div className="industrial-grid" />

      {/* Navigation Header */}
      <nav className="fixed top-0 w-full z-50 bg-background border-b-3 border-black" data-testid="auth-navigation">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Left Section */}
            <div className="flex items-center">
              <button
                onClick={() => setLocation("/")}
                className="bg-black text-white px-2 py-1 md:px-4 md:py-2 border-2 border-black hover:bg-primary transition-colors flex items-center gap-2"
                data-testid="button-back-home"
              >
                <Delete className="w-4 h-4" />
                <TechnicalLabel text="BACKSPACE" className="text-white text-xs md:text-sm" />
              </button>
            </div>
            
            {/* Right Section */}
            <div className="flex items-center">
              <div className="bg-white border-2 border-black px-2 py-1 md:px-4 md:py-2">
                <div className="text-xs md:text-sm">
                  <TechnicalLabel text="AUTH MODULE" />
                  <TechnicalLabel text="v 2.47" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Title Section */}
        <div className="bg-white border-b-3 border-black py-3 md:py-4">
          <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter" data-testid="auth-logo">
              THORX.
            </h1>
          </div>
        </div>
      </nav>

      {/* Auth Section */}
      <section className="cinematic-section active min-h-screen pb-8 overflow-y-auto">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col items-center justify-center">
          {/* Technical Header */}
          <div className="text-center mb-4 md:mb-6">
            <div className="mb-2">
              <TechnicalLabel text="ACCESS CONTROL SYSTEM" />
            </div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-black mb-4">
              ENTER THE SYSTEM
            </h2>
            <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto" />
          </div>

          {/* Auth Card */}
          <div className="w-full max-w-4xl mx-auto mb-8 px-0">
            <div className="split-card bg-white border-3 border-black p-4 md:p-6 lg:p-8 mx-auto">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted border-2 border-black">
                  <TabsTrigger 
                    value="register" 
                    className="data-[state=active]:bg-black data-[state=active]:text-white font-black"
                    data-testid="tab-register"
                  >
                    REGISTER
                  </TabsTrigger>
                  <TabsTrigger 
                    value="login" 
                    className="data-[state=active]:bg-black data-[state=active]:text-white font-black"
                    data-testid="tab-login"
                  >
                    LOGIN
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="register" className="space-y-4">
                  <div className="text-center mb-6">
                    <TechnicalLabel text="NEW USER REGISTRATION" className="mb-2" />
                    <h3 className="text-2xl md:text-3xl font-black text-black">JOIN THE EARNING NETWORK</h3>
                  </div>

                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      {/* Name Fields */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="technical-label">FIRST NAME</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    {...field}
                                    className="border-2 border-black text-lg py-3"
                                    data-testid="input-register-firstname"
                                  />
                                  {!field.value && (
                                    <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                      <AnimatedPlaceholder examples={['John', 'Ahmed', 'Ali', 'Hassan']} />
                                    </div>
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="technical-label">LAST NAME</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    {...field}
                                    className="border-2 border-black text-lg py-3"
                                    data-testid="input-register-lastname"
                                  />
                                  {!field.value && (
                                    <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                      <AnimatedPlaceholder examples={['Khan', 'Shah', 'Ahmed', 'Malik']} />
                                    </div>
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Identity Field - Auto Generated */}
                      <FormField
                        control={registerForm.control}
                        name="identity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="technical-label">THORX IDENTITY</FormLabel>
                            <div className="space-y-2">
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    {...field}
                                    readOnly
                                    className="border-2 border-black text-lg py-3 bg-muted cursor-not-allowed"
                                    data-testid="input-register-identity"
                                  />
                                  {!field.value && (
                                    <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                      <AnimatedPlaceholder examples={['THORX_JD_MASTER_4521', 'ALPHA_AK_BUILDER_7832', 'CORE_HS_GENIUS_2941']} />
                                    </div>
                                  )}
                                </div>
                              </FormControl>
                              <div className="text-xs text-muted-foreground mt-1">
                                <TechnicalLabel text="AUTO-GENERATED • UNIQUE • NON-EDITABLE" className="text-xs" />
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Contact Information */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="technical-label">PHONE NUMBER</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    {...field}
                                    className="border-2 border-black text-lg py-3"
                                    data-testid="input-register-phone"
                                  />
                                  {!field.value && (
                                    <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                      <AnimatedPlaceholder examples={['+92 300 1234567', '+92 321 9876543', '+92 333 5551234']} />
                                    </div>
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="technical-label">EMAIL ADDRESS</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    {...field}
                                    className="border-2 border-black text-lg py-3"
                                    data-testid="input-register-email"
                                  />
                                  {!field.value && (
                                    <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                      <AnimatedPlaceholder examples={['your.email@gmail.com', 'user@thorx.com', 'john.doe@outlook.com']} />
                                    </div>
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Password Fields */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="technical-label">PASSWORD</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showPassword ? "text" : "password"}
                                    {...field}
                                    className="border-2 border-black text-lg py-3 pr-10"
                                    data-testid="input-register-password"
                                  />
                                  {!field.value && (
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none pr-10">
                                      <AnimatedPlaceholder examples={['ThorX123!', 'SecurePass9$', 'MyStrong8#']} />
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10"
                                    data-testid="button-toggle-password"
                                  >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="technical-label">CONFIRM PASSWORD</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showConfirmPassword ? "text" : "password"}
                                    {...field}
                                    className="border-2 border-black text-lg py-3 pr-10"
                                    data-testid="input-register-confirm-password"
                                  />
                                  {!field.value && (
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none pr-10">
                                      <AnimatedPlaceholder examples={['Repeat your password', 'Same as above', 'Confirm password']} />
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10"
                                    data-testid="button-toggle-confirm-password"
                                  >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Referral Code */}
                      <FormField
                        control={registerForm.control}
                        name="referralCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="technical-label">REFERRAL CODE (OPTIONAL)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  {...field}
                                  className="border-2 border-black text-lg py-3"
                                  data-testid="input-register-referral"
                                />
                                {!field.value && (
                                  <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                    <AnimatedPlaceholder examples={['THORX-A1B2', 'THORX-X9Y8', 'THORX-K3M7']} />
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        disabled={registerMutation.isPending}
                        className="w-full bg-black text-white text-xl font-black py-4 hover:bg-primary transition-colors border-2 border-black"
                        data-testid="button-register-submit"
                      >
                        {registerMutation.isPending ? "PROCESSING..." : "REGISTER NOW →"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="login" className="space-y-6">
                  <div className="text-center mb-6">
                    <TechnicalLabel text="USER LOGIN" className="mb-2" />
                    <h3 className="text-2xl md:text-3xl font-black text-black">WELCOME BACK</h3>
                  </div>

                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="technical-label">EMAIL ADDRESS</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  {...field}
                                  type="email"
                                  className="border-2 border-black text-lg py-3"
                                  data-testid="input-login-email"
                                />
                                {!field.value && (
                                  <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                    <AnimatedPlaceholder examples={['john@gmail.com', 'user@thorx.com', 'earner@example.com']} />
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="technical-label">PASSWORD</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showPassword ? "text" : "password"}
                                  {...field}
                                  className="border-2 border-black text-lg py-3 pr-10"
                                  data-testid="input-login-password"
                                />
                                {!field.value && (
                                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none pr-10">
                                    <AnimatedPlaceholder examples={['Enter your password', 'Your secure password', 'Login password']} />
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10"
                                  data-testid="button-toggle-login-password"
                                >
                                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Forgot Password */}
                      <div className="text-right">
                        <button
                          type="button"
                          className="text-primary hover:text-black transition-colors font-semibold text-sm border-b border-primary hover:border-black"
                          onClick={() => {
                            toast({
                              title: "Password Reset",
                              description: "Password reset functionality will be available soon.",
                            });
                          }}
                          data-testid="button-forgot-password"
                        >
                          FORGOT PASSWORD?
                        </button>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={loginMutation.isPending}
                        className="w-full bg-primary text-white text-xl font-black py-4 hover:bg-black transition-colors border-2 border-black"
                        data-testid="button-login-submit"
                      >
                        {loginMutation.isPending ? "VERIFYING..." : "LOGIN →"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>

              {/* Security Badge */}
              <div className="mt-8 pt-6 border-t-2 border-black">
                <div className="flex items-center justify-center space-x-4">
                  <div className="bg-black text-white px-3 py-1">
                    <TechnicalLabel text="256-BIT ENCRYPTION" className="text-white text-xs" />
                  </div>
                  <Barcode className="w-16 h-4" />
                  <div className="bg-primary text-white px-3 py-1">
                    <TechnicalLabel text="SECURE SYSTEM" className="text-white text-xs" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}