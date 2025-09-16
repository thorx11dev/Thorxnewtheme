import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import TechnicalLabel from "@/components/ui/technical-label";
import Barcode from "@/components/ui/barcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import {
  LogOut,
  Users,
  DollarSign,
  Activity,
  Mail,
  Send,
  Database,
  Key,
  UserCheck,
  Shield,
  Eye,
  EyeOff,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Filter,
  Search,
  Settings
} from "lucide-react";

// Email form schema
const emailFormSchema = z.object({
  recipient: z.string().email("Please enter a valid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required")
});

type EmailFormData = z.infer<typeof emailFormSchema>;

// Team Portal Sections
const teamSections = [
  { id: "dashboard", name: "Dashboard", icon: Activity },
  { id: "inbox", name: "Inbox", icon: Mail },
  { id: "data", name: "Data", icon: Database },
  { id: "team-keys", name: "Team Keys", icon: Key },
];

export default function TeamPortal() {
  const { user, logout, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Current section state
  const [currentSection, setCurrentSection] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl font-black mb-2">THORX TEAM</div>
          <div className="text-sm">LOADING...</div>
        </div>
      </div>
    );
  }

  // Navigation function
  const navigateToSection = (sectionIndex: number) => {
    if (sectionIndex === currentSection || isTransitioning) return;
    
    setIsTransitioning(true);
    setCurrentSection(sectionIndex);
    
    // Clear transition state after animation
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  // Team metrics query
  const { data: teamMetrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['/api/team/metrics'],
    enabled: !!user && user.role === 'team',
  });

  // Team emails query (received messages)
  const { data: emailsData, isLoading: emailsLoading, error: emailsError } = useQuery({
    queryKey: ['/api/team/emails'],
    enabled: !!user && user.role === 'team',
  });

  // User credentials query (for data section)
  const { data: credentialsData, isLoading: credentialsLoading, error: credentialsError } = useQuery({
    queryKey: ['/api/team/credentials'],
    enabled: !!user && user.role === 'team',
  });

  // Search state for credentials
  const [searchTerm, setSearchTerm] = useState("");

  // Email form
  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      recipient: "",
      subject: "",
      message: ""
    }
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (data: EmailFormData) => {
      return await apiRequest('/api/team/emails', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "Your email has been sent successfully.",
      });
      emailForm.reset();
      // Invalidate emails query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/team/emails'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Email",
        description: error?.message || "There was an error sending your email.",
        variant: "destructive"
      });
    }
  });

  // Handle email form submission
  const handleSendEmail = (data: EmailFormData) => {
    sendEmailMutation.mutate(data);
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      toast({
        title: "Logout Failed",
        description: "There was an error logging you out.",
        variant: "destructive"
      });
    }
  };

  // Render current section
  const renderCurrentSection = () => {
    switch (currentSection) {
      case 0:
        return renderDashboardSection();
      case 1:
        return renderInboxSection();
      case 2:
        return renderDataSection();
      case 3:
        return renderTeamKeysSection();
      default:
        return renderDashboardSection();
    }
  };

  // Dashboard Section
  function renderDashboardSection() {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 border border-primary mb-4">
            <Activity className="w-4 h-4" />
            <TechnicalLabel text="TEAM DASHBOARD" className="text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-white mb-4 tracking-tighter">
            TEAM <span className="text-primary">CONTROL</span><br />
            SYSTEM METRICS
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Monitor team performance and user metrics in real-time
          </p>
          <Barcode className="w-48 h-10 mx-auto opacity-60" />
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="border-2 border-primary bg-black text-white overflow-hidden">
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-primary" />
              {metricsLoading ? (
                <div className="text-3xl font-black mb-2 text-primary animate-pulse">---</div>
              ) : metricsError ? (
                <div className="text-3xl font-black mb-2 text-red-500">ERR</div>
              ) : (
                <div className="text-3xl font-black mb-2 text-primary" data-testid="metric-total-users">
                  {teamMetrics?.totalUsers?.toLocaleString() || '0'}
                </div>
              )}
              <TechnicalLabel text="TOTAL USERS" className="text-muted-foreground" />
            </CardContent>
          </Card>

          <Card className="border-2 border-primary bg-black text-white overflow-hidden">
            <CardContent className="p-6 text-center">
              <UserCheck className="w-12 h-12 mx-auto mb-4 text-primary" />
              {metricsLoading ? (
                <div className="text-3xl font-black mb-2 text-primary animate-pulse">---</div>
              ) : metricsError ? (
                <div className="text-3xl font-black mb-2 text-red-500">ERR</div>
              ) : (
                <div className="text-3xl font-black mb-2 text-primary" data-testid="metric-active-users">
                  {teamMetrics?.activeUsers?.toLocaleString() || '0'}
                </div>
              )}
              <TechnicalLabel text="ACTIVE USERS" className="text-muted-foreground" />
            </CardContent>
          </Card>

          <Card className="border-2 border-primary bg-black text-white overflow-hidden">
            <CardContent className="p-6 text-center">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-primary" />
              {metricsLoading ? (
                <div className="text-3xl font-black mb-2 text-primary animate-pulse">---</div>
              ) : metricsError ? (
                <div className="text-3xl font-black mb-2 text-red-500">ERR</div>
              ) : (
                <div className="text-3xl font-black mb-2 text-primary" data-testid="metric-total-earnings">
                  ₨{parseFloat(teamMetrics?.totalEarnings || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              <TechnicalLabel text="TOTAL EARNINGS" className="text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="border-2 border-primary bg-black text-white overflow-hidden">
          <CardHeader className="text-center">
            <TechnicalLabel text="RECENT ACTIVITY" className="text-primary text-xl" />
          </CardHeader>
          <CardContent className="text-center p-12">
            <Activity className="w-16 h-16 mx-auto mb-4 text-primary" />
            <TechnicalLabel text="SYSTEM MONITORING ACTIVE" className="text-primary text-2xl" />
            <TechnicalLabel text="Real-time metrics being tracked" className="text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Inbox Section
  function renderInboxSection() {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 border border-primary mb-4">
            <Mail className="w-4 h-4" />
            <TechnicalLabel text="EMAIL MANAGEMENT" className="text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-white mb-4 tracking-tighter">
            TEAM <span className="text-primary">INBOX</span><br />
            EMAIL CONTROL
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Send emails and manage team communications
          </p>
          <Barcode className="w-48 h-10 mx-auto opacity-60" />
        </div>

        {/* Email Composition */}
        <Card className="border-2 border-primary bg-black text-white mb-8 overflow-hidden">
          <CardHeader className="text-center">
            <TechnicalLabel text="SEND EMAIL" className="text-primary text-xl" />
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={emailForm.handleSubmit(handleSendEmail)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <TechnicalLabel text="RECIPIENT" className="text-white mb-2" />
                  <input
                    type="email"
                    placeholder="user@email.com"
                    className={`w-full bg-black border-2 text-white px-4 py-3 text-lg focus:outline-none ${
                      emailForm.formState.errors.recipient
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-primary focus:border-primary'
                    }`}
                    data-testid="input-email-recipient"
                    {...emailForm.register("recipient")}
                  />
                  {emailForm.formState.errors.recipient && (
                    <TechnicalLabel 
                      text={emailForm.formState.errors.recipient.message || ""}
                      className="text-red-500 text-sm mt-1"
                    />
                  )}
                </div>
                <div>
                  <TechnicalLabel text="SUBJECT" className="text-white mb-2" />
                  <input
                    type="text"
                    placeholder="Email subject"
                    className={`w-full bg-black border-2 text-white px-4 py-3 text-lg focus:outline-none ${
                      emailForm.formState.errors.subject
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-primary focus:border-primary'
                    }`}
                    data-testid="input-email-subject"
                    {...emailForm.register("subject")}
                  />
                  {emailForm.formState.errors.subject && (
                    <TechnicalLabel 
                      text={emailForm.formState.errors.subject.message || ""}
                      className="text-red-500 text-sm mt-1"
                    />
                  )}
                </div>
              </div>

              <div>
                <TechnicalLabel text="MESSAGE" className="text-white mb-2" />
                <textarea
                  rows={6}
                  placeholder="Enter your message..."
                  className={`w-full bg-black border-2 text-white px-4 py-3 text-lg focus:outline-none ${
                    emailForm.formState.errors.message
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-primary focus:border-primary'
                  }`}
                  data-testid="textarea-email-message"
                  {...emailForm.register("message")}
                ></textarea>
                {emailForm.formState.errors.message && (
                  <TechnicalLabel 
                    text={emailForm.formState.errors.message.message || ""}
                    className="text-red-500 text-sm mt-1"
                  />
                )}
              </div>

              <div className="text-center">
                <Button
                  type="submit"
                  disabled={sendEmailMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-black px-12 py-4 text-lg font-black border-2 border-primary disabled:opacity-50"
                  data-testid="button-send-email"
                >
                  {sendEmailMutation.isPending ? (
                    <>
                      <div className="w-5 h-5 mr-3 animate-spin border-2 border-black border-t-transparent rounded-full"></div>
                      SENDING...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-3" />
                      SEND EMAIL
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Received Messages */}
        <Card className="border-2 border-primary bg-black text-white overflow-hidden">
          <CardHeader className="text-center">
            <TechnicalLabel text="RECEIVED MESSAGES" className="text-primary text-xl" />
          </CardHeader>
          <CardContent className="p-6">
            {emailsLoading ? (
              <div className="text-center p-12">
                <div className="w-16 h-16 mx-auto mb-4 animate-spin border-4 border-primary border-t-transparent rounded-full"></div>
                <TechnicalLabel text="LOADING MESSAGES..." className="text-primary text-xl" />
              </div>
            ) : emailsError ? (
              <div className="text-center p-12">
                <Mail className="w-16 h-16 mx-auto mb-4 text-red-500" />
                <TechnicalLabel text="ERROR LOADING MESSAGES" className="text-red-500 text-xl" />
                <TechnicalLabel text="Please try refreshing the page" className="text-muted-foreground" />
              </div>
            ) : !emailsData?.emails || emailsData.emails.length === 0 ? (
              <div className="text-center p-12">
                <Mail className="w-16 h-16 mx-auto mb-4 text-primary" />
                <TechnicalLabel text="NO MESSAGES" className="text-primary text-2xl" />
                <TechnicalLabel text="Received messages will appear here" className="text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4" data-testid="email-messages-list">
                {emailsData.emails.map((email: any, index: number) => (
                  <div 
                    key={email.id || index} 
                    className="border border-primary/30 bg-black/50 p-4 rounded"
                    data-testid={`email-message-${index}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <TechnicalLabel 
                            text={`FROM: ${email.type === 'inbound' ? email.senderId || 'EXTERNAL' : 'TEAM'}`} 
                            className="text-primary text-sm" 
                          />
                          <span className={`px-2 py-1 text-xs border ${
                            email.type === 'inbound' 
                              ? 'border-green-500 text-green-500' 
                              : 'border-blue-500 text-blue-500'
                          }`}>
                            {email.type?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </div>
                        <TechnicalLabel 
                          text={`TO: ${email.recipient || 'N/A'}`} 
                          className="text-gray-300 text-sm" 
                        />
                      </div>
                      <TechnicalLabel 
                        text={email.createdAt ? new Date(email.createdAt).toLocaleDateString() : 'N/A'} 
                        className="text-gray-400 text-xs" 
                      />
                    </div>
                    <div className="mb-2">
                      <TechnicalLabel 
                        text={`SUBJECT: ${email.subject || 'No Subject'}`} 
                        className="text-white font-semibold" 
                      />
                    </div>
                    <div className="text-gray-300 text-sm">
                      {email.message ? (
                        email.message.length > 200 
                          ? `${email.message.substring(0, 200)}...` 
                          : email.message
                      ) : 'No message content'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Data Section
  function renderDataSection() {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 border border-primary mb-4">
            <Database className="w-4 h-4" />
            <TechnicalLabel text="USER DATA ACCESS" className="text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-white mb-4 tracking-tighter">
            USER <span className="text-primary">DATA</span><br />
            CREDENTIALS VIEW
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Access and manage user credentials and account information
          </p>
          <Barcode className="w-48 h-10 mx-auto opacity-60" />
        </div>

        {/* Search and Filters */}
        <Card className="border-2 border-primary bg-black text-white mb-8 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="w-full bg-black border-2 border-primary text-white pl-12 pr-4 py-3 text-lg focus:outline-none focus:border-primary"
                    data-testid="input-search-users"
                  />
                </div>
              </div>
              <Button
                className="bg-primary hover:bg-primary/90 text-black px-6 py-3 text-lg font-black border-2 border-primary"
                data-testid="button-export-data"
              >
                <Download className="w-5 h-5 mr-2" />
                EXPORT
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Credentials List */}
        <Card className="border-2 border-primary bg-black text-white overflow-hidden">
          <CardHeader className="text-center">
            <TechnicalLabel text="USER CREDENTIALS" className="text-primary text-xl" />
          </CardHeader>
          <CardContent className="p-6">
            {credentialsLoading ? (
              <div className="text-center p-12">
                <div className="w-16 h-16 mx-auto mb-4 animate-spin border-4 border-primary border-t-transparent rounded-full"></div>
                <TechnicalLabel text="LOADING CREDENTIALS..." className="text-primary text-xl" />
              </div>
            ) : credentialsError ? (
              <div className="text-center p-12">
                <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
                <TechnicalLabel text="ERROR LOADING CREDENTIALS" className="text-red-500 text-xl" />
                <TechnicalLabel text="Please try refreshing the page" className="text-muted-foreground" />
              </div>
            ) : (() => {
              const credentials = credentialsData?.credentials || [];
              const filteredCredentials = credentials.filter((cred: any) => 
                !searchTerm || 
                cred.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                cred.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                cred.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                cred.platform?.toLowerCase().includes(searchTerm.toLowerCase())
              );

              return !credentials.length ? (
                <div className="text-center p-12">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <TechnicalLabel text="NO CREDENTIALS FOUND" className="text-primary text-2xl" />
                  <TechnicalLabel text="User credentials will appear here when available" className="text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4" data-testid="credentials-list">
                  {searchTerm && (
                    <div className="mb-4 text-center">
                      <TechnicalLabel 
                        text={`SHOWING ${filteredCredentials.length} OF ${credentials.length} CREDENTIALS`} 
                        className="text-primary" 
                      />
                    </div>
                  )}
                  {filteredCredentials.length === 0 && searchTerm ? (
                    <div className="text-center p-8">
                      <Search className="w-12 h-12 mx-auto mb-4 text-primary" />
                      <TechnicalLabel text="NO MATCHING CREDENTIALS" className="text-primary text-xl" />
                      <TechnicalLabel text={`No results found for "${searchTerm}"`} className="text-muted-foreground" />
                    </div>
                  ) : (
                    filteredCredentials.map((credential: any, index: number) => (
                      <div 
                        key={credential.id || index} 
                        className="border border-primary/30 bg-black/50 p-4 rounded"
                        data-testid={`credential-item-${index}`}
                      >
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="mb-2">
                              <TechnicalLabel 
                                text={`USER: ${credential.user?.firstName || 'N/A'} ${credential.user?.lastName || ''}`} 
                                className="text-primary font-semibold" 
                              />
                            </div>
                            <div className="mb-2">
                              <TechnicalLabel 
                                text={`EMAIL: ${credential.user?.email || 'N/A'}`} 
                                className="text-gray-300 text-sm" 
                              />
                            </div>
                            <div className="mb-2">
                              <TechnicalLabel 
                                text={`PLATFORM: ${credential.platform || 'N/A'}`} 
                                className="text-white" 
                              />
                            </div>
                          </div>
                          <div>
                            <div className="mb-2">
                              <TechnicalLabel 
                                text={`USERNAME: ${credential.username || 'N/A'}`} 
                                className="text-gray-300 text-sm" 
                              />
                            </div>
                            <div className="mb-2 flex items-center gap-2">
                              <TechnicalLabel 
                                text="PASSWORD:" 
                                className="text-gray-300 text-sm" 
                              />
                              <span className="font-mono text-sm bg-black border border-primary/30 px-2 py-1 rounded">
                                ••••••••
                              </span>
                              <Button
                                size="sm"
                                className="h-6 w-6 p-0 bg-transparent border border-primary/30 hover:bg-primary/10"
                                data-testid={`toggle-password-${index}`}
                              >
                                <Eye className="w-3 h-3 text-primary" />
                              </Button>
                            </div>
                            <div>
                              <TechnicalLabel 
                                text={`ADDED: ${credential.createdAt ? new Date(credential.createdAt).toLocaleDateString() : 'N/A'}`} 
                                className="text-gray-400 text-xs" 
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Team Keys Section
  function renderTeamKeysSection() {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 border border-primary mb-4">
            <Key className="w-4 h-4" />
            <TechnicalLabel text="ACCESS MANAGEMENT" className="text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-white mb-4 tracking-tighter">
            TEAM <span className="text-primary">KEYS</span><br />
            MEMBER ACCESS
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Manage team member access keys and permissions
          </p>
          <Barcode className="w-48 h-10 mx-auto opacity-60" />
        </div>

        {/* Add New Member */}
        <Card className="border-2 border-primary bg-black text-white mb-8 overflow-hidden">
          <CardHeader className="text-center">
            <TechnicalLabel text="ADD TEAM MEMBER" className="text-primary text-xl" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <TechnicalLabel text="MEMBER NAME" className="text-white mb-2" />
                <input
                  type="text"
                  placeholder="Team member name"
                  className="w-full bg-black border-2 border-primary text-white px-4 py-3 text-lg focus:outline-none focus:border-primary"
                  data-testid="input-member-name"
                />
              </div>
              <div>
                <TechnicalLabel text="ACCESS LEVEL" className="text-white mb-2" />
                <select className="w-full bg-black border-2 border-primary text-white px-4 py-3 text-lg focus:outline-none focus:border-primary">
                  <option value="">SELECT LEVEL</option>
                  <option value="admin">ADMIN</option>
                  <option value="moderator">MODERATOR</option>
                  <option value="viewer">VIEWER</option>
                </select>
              </div>
            </div>

            <div>
              <TechnicalLabel text="INITIAL PASSWORD" className="text-white mb-2" />
              <input
                type="password"
                placeholder="Set initial password"
                className="w-full bg-black border-2 border-primary text-white px-4 py-3 text-lg focus:outline-none focus:border-primary"
                data-testid="input-member-password"
              />
            </div>

            <div className="text-center">
              <Button
                className="bg-primary hover:bg-primary/90 text-black px-12 py-4 text-lg font-black border-2 border-primary"
                data-testid="button-add-member"
              >
                <Plus className="w-5 h-5 mr-3" />
                ADD MEMBER
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Team Members List */}
        <Card className="border-2 border-primary bg-black text-white overflow-hidden">
          <CardHeader className="text-center">
            <TechnicalLabel text="TEAM MEMBERS" className="text-primary text-xl" />
          </CardHeader>
          <CardContent className="text-center p-12">
            <Key className="w-16 h-16 mx-auto mb-4 text-primary" />
            <TechnicalLabel text="NO TEAM MEMBERS" className="text-primary text-2xl" />
            <TechnicalLabel text="Team member access keys will appear here" className="text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="team-portal">
      {/* Industrial Grid Overlay */}
      <div className="industrial-grid" />

      {/* Navigation Header */}
      <nav className="fixed top-0 w-full z-50 bg-background border-b-2 border-black" data-testid="team-portal-navigation">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <div className="flex items-center">
              <div className="bg-black text-white px-4 py-2 border-2 border-black">
                <TechnicalLabel text="THORX TEAM" className="text-white text-lg font-black" />
              </div>
            </div>

            {/* Desktop Tab Navigation */}
            <nav className="hidden md:flex items-center space-x-1" role="navigation" aria-label="Primary navigation">
              {teamSections.map((section, index) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => navigateToSection(index)}
                    className={`flex items-center space-x-2 px-4 py-2 border-2 border-black transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      currentSection === index
                        ? 'bg-primary text-black font-black'
                        : 'bg-background text-foreground hover:bg-primary hover:text-black'
                    }`}
                    data-testid={`nav-tab-${section.id}`}
                    aria-label={`Go to ${section.name}`}
                    aria-current={currentSection === index ? 'page' : undefined}
                  >
                    <Icon className="w-4 h-4" />
                    <TechnicalLabel text={section.name.toUpperCase()} className="text-sm" />
                  </button>
                );
              })}
            </nav>

            {/* Mobile Section Indicator */}
            <div className="flex md:hidden items-center space-x-2" aria-hidden="true">
              {teamSections.map((section, index) => (
                <div
                  key={section.id}
                  className={`w-2 h-2 border border-black transition-all duration-300 ${
                    currentSection === index
                      ? 'bg-primary'
                      : 'bg-transparent'
                  }`}
                  data-testid={`nav-indicator-${section.id}`}
                />
              ))}
            </div>

            {/* User Controls */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center text-foreground">
                <TechnicalLabel text={user?.firstName || "TEAM"} className="text-lg font-black" />
                <TechnicalLabel text="MEMBER" className="text-xs ml-2" />
              </div>

              <Button
                onClick={handleLogout}
                className="bg-black hover:bg-primary text-white hover:text-black px-4 py-2 border-2 border-black transition-colors"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline ml-2">
                  <TechnicalLabel text="LOGOUT" className="text-sm" />
                </span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t-2 border-black md:hidden z-40" data-testid="team-mobile-navigation">
        <div className="flex justify-around">
          {teamSections.map((section, index) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => navigateToSection(index)}
                className={`flex flex-col items-center justify-center py-3 px-4 transition-all duration-300 ${
                  currentSection === index
                    ? 'text-primary bg-primary/10'
                    : 'text-foreground hover:text-primary'
                }`}
                data-testid={`mobile-nav-${section.id}`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <TechnicalLabel
                  text={section.name.toUpperCase()}
                  className="text-sm leading-none text-center"
                />
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className={`min-h-screen pt-16 md:pt-20 ${isMobile ? 'pb-20' : ''} ${isTransitioning ? 'opacity-75' : 'opacity-100'} transition-opacity duration-300`}>
        {renderCurrentSection()}
      </main>
    </div>
  );
}