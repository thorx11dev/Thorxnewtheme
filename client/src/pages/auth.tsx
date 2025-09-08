import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TechnicalLabel from "@/components/ui/technical-label";
import Barcode from "@/components/ui/barcode";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  referralCode: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

type RegisterForm = z.infer<typeof registerSchema>;
type LoginForm = z.infer<typeof loginSchema>;

export default function Auth() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("register");
  const { toast } = useToast();

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      phone: "",
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

  const registerMutation = useMutation({
    mutationFn: (data: RegisterForm) => apiRequest("/api/register", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      toast({
        title: "Registration Successful",
        description: "Welcome to THORX! Your earning journey begins now.",
      });
      // Navigate to dashboard or home
      setLocation("/");
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
    mutationFn: (data: LoginForm) => apiRequest("/api/login", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      toast({
        title: "Login Successful",
        description: "Welcome back to THORX!",
      });
      setLocation("/");
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
    <>
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
                className="bg-black text-white px-2 py-1 md:px-4 md:py-2 border-2 border-black hover:bg-primary transition-colors"
                data-testid="button-back-home"
              >
                <TechnicalLabel text="← BACK TO SYSTEM" className="text-white text-xs md:text-sm" />
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
        <div className="bg-white border-b-3 border-black py-4 md:py-6">
          <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter" data-testid="auth-logo">
              THORX.
            </h1>
          </div>
        </div>
      </nav>

      {/* Auth Section */}
      <section className="cinematic-section active min-h-screen pt-32 md:pt-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Technical Header */}
          <div className="text-center mb-8 md:mb-12">
            <div className="mb-2">
              <TechnicalLabel text="ACCESS CONTROL SYSTEM" />
            </div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-black mb-4">
              ENTER THE SYSTEM
            </h2>
            <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto" />
          </div>

          {/* Auth Card */}
          <div className="max-w-2xl mx-auto">
            <div className="split-card bg-white border-3 border-black p-6 md:p-12">
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

                <TabsContent value="register" className="space-y-6">
                  <div className="text-center mb-6">
                    <TechnicalLabel text="NEW USER REGISTRATION" className="mb-2" />
                    <h3 className="text-2xl md:text-3xl font-black text-black">JOIN THE EARNING NETWORK</h3>
                  </div>

                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="technical-label">EMAIL ADDRESS</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="your.email@domain.com" 
                                {...field}
                                className="border-2 border-black text-lg py-3"
                                data-testid="input-register-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="technical-label">PHONE NUMBER</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="+92 300 1234567" 
                                {...field}
                                className="border-2 border-black text-lg py-3"
                                data-testid="input-register-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="referralCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="technical-label">REFERRAL CODE (OPTIONAL)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="THORX-XXXX" 
                                {...field}
                                className="border-2 border-black text-lg py-3"
                                data-testid="input-register-referral"
                              />
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
                              <Input 
                                placeholder="your.email@domain.com" 
                                {...field}
                                className="border-2 border-black text-lg py-3"
                                data-testid="input-login-email"
                              />
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
                              <Input 
                                type="password"
                                placeholder="Enter your password" 
                                {...field}
                                className="border-2 border-black text-lg py-3"
                                data-testid="input-login-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

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
    </>
  );
}