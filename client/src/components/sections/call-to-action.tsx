import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TechnicalLabel from "@/components/ui/technical-label";
import Barcode from "@/components/ui/barcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface CallToActionProps {
  isActive: boolean;
}

const formSchema = z.object({
  phone: z.string().min(11, "Phone number must be at least 11 digits").max(15, "Phone number too long"),
  email: z.string().email("Invalid email address"),
});

type FormData = z.infer<typeof formSchema>;

export default function CallToAction({ isActive }: CallToActionProps) {
  const [referralCode, setReferralCode] = useState<string>("THORX-XXXX");
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: "",
      email: "",
    },
  });

  const registrationMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest('POST', '/api/register', data);
      return response.json();
    },
    onSuccess: (data) => {
      setReferralCode(data.referralCode);
      toast({
        title: "Registration Successful!",
        description: `Your referral code is ${data.referralCode}`,
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    registrationMutation.mutate(data);
  };

  return (
    <section 
      className={`cinematic-section ${isActive ? 'active' : ''}`}
      data-testid="call-to-action-section"
    >
      <div className="max-w-4xl mx-auto px-4 text-center pt-8">
        {/* Technical Header */}
        <div className="mb-12">
          <div className="mb-2">
            <TechnicalLabel text="MEMBER REGISTRATION" />
          </div>
          <h2 className="text-5xl md:text-6xl font-black tracking-tight text-black mb-4">
            START EARNING TODAY
          </h2>
          <Barcode className="w-48 h-10 mx-auto" />
        </div>

        {/* Registration Form */}
        <div className="split-card bg-black text-white p-12 mb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Phone Number Input */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="text-left">
                    <FormLabel>
                      <TechnicalLabel text="PHONE-NUMBER" className="text-white/70" />
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder="+92 300 1234567"
                        className="w-full p-4 bg-white text-black text-xl font-bold border-2 border-primary focus:outline-none focus:ring-4 focus:ring-primary/50"
                        data-testid="input-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email Input */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="text-left">
                    <FormLabel>
                      <TechnicalLabel text="EMAIL-ADDRESS" className="text-white/70" />
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        type="email"
                        placeholder="your.email@domain.com"
                        className="w-full p-4 bg-white text-black text-xl font-bold border-2 border-primary focus:outline-none focus:ring-4 focus:ring-primary/50"
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Referral Code Display */}
              <div className="bg-primary p-6 text-center">
                <TechnicalLabel text="YOUR-REFERRAL-CODE" className="text-white/70 mb-2" />
                <div 
                  className="text-3xl font-black tracking-wider"
                  data-testid="text-referral-code"
                >
                  {referralCode}
                </div>
                <Barcode className="w-32 h-10 bg-white mx-auto mt-4" />
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={registrationMutation.isPending}
                className="w-full bg-primary text-white py-6 text-2xl font-black tracking-wider hover:bg-white hover:text-black transition-colors pulse-glow"
                data-testid="button-join-thorx"
              >
                {registrationMutation.isPending ? "JOINING..." : "JOIN THORX →"}
              </Button>
            </form>
          </Form>
        </div>

        {/* Legal Notice */}
        <div className="text-center">
          <TechnicalLabel text="BY JOINING, YOU AGREE TO THORX TERMS & CONDITIONS" />
          <Barcode className="w-24 h-10 mx-auto mt-4" />
        </div>
      </div>
    </section>
  );
}
