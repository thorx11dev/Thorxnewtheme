
import { useState, useEffect } from "react";
import { useSupabaseAuthWithQuery } from "@/hooks/useSupabaseAuthWithQuery";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import {
  LogOut,
  Users,
  DollarSign,
  Activity,
  Mail,
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
  Settings,
  Home,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Bell,
  Clock
} from "lucide-react";



// Team member form schema - aligned with backend
const teamMemberFormSchema = z.object({
  memberName: z.string().min(1, "Member name is required"),
  email: z.string().email("Valid email is required"),
  accessLevel: z.enum(["founder", "admin", "member"], {
    errorMap: () => ({ message: "Please select an access level" })
  }),
  password: z.string().min(6, "Password must be at least 6 characters"),
  permissions: z.array(z.string()).optional()
});

type TeamMemberFormData = z.infer<typeof teamMemberFormSchema>;

// Team member update schema  
const teamMemberUpdateSchema = z.object({
  memberName: z.string().min(1, "Member name is required").optional(),
  accessLevel: z.enum(["founder", "admin", "member"], {
    errorMap: () => ({ message: "Please select an access level" })
  }).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional()
});

type TeamMemberUpdateData = z.infer<typeof teamMemberUpdateSchema>;

// Team Portal Sections
const teamSections = [
  { id: "dashboard", name: "Dashboard", icon: Activity },
  { id: "inbox", name: "Inbox", icon: Mail },
  { id: "data", name: "Data", icon: Database },
  { id: "team-keys", name: "Team Keys", icon: Key },
];

export default function TeamPortal() {
  const { user, logout, isLoading } = useSupabaseAuthWithQuery();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // ALL STATE HOOKS MOVED TO TOP - FIXES REACT HOOKS ERROR
  const [currentSection, setCurrentSection] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMember, setEditingMember] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [messagePriorities, setMessagePriorities] = useState<{[key: string]: 'low' | 'medium' | 'high'}>({});

  // Mobile detection effect
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // FIXED: Team metrics query - Enable for both team and founder roles
  const { data: teamMetrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['/api/team/metrics'],
    enabled: !!user && (user.role === 'team' || user.role === 'founder'),
  });

  // FIXED: Team emails query - Enable for both team and founder roles
  const { data: emailsData, isLoading: emailsLoading, error: emailsError } = useQuery({
    queryKey: ['/api/team/emails'],
    enabled: !!user && (user.role === 'team' || user.role === 'founder'),
    refetchInterval: 10000, // Refresh every 10 seconds
    refetchIntervalInBackground: true,
  });

  // FIXED: User credentials query - Enable for both team and founder roles
  const { data: credentialsData, isLoading: credentialsLoading, error: credentialsError } = useQuery({
    queryKey: ['/api/team/credentials'],
    enabled: !!user && (user.role === 'team' || user.role === 'founder'),
  });

  // FIXED: Team members query - Enable for both team and founder roles
  const { data: teamMembersData, isLoading: membersLoading, error: membersError } = useQuery({
    queryKey: ['/api/team/members'],
    enabled: !!user && (user.role === 'team' || user.role === 'founder'),
  });

  // Team member form
  const teamMemberForm = useForm<TeamMemberFormData>({
    resolver: zodResolver(teamMemberFormSchema),
    defaultValues: {
      memberName: "",
      email: "",
      accessLevel: "member",
      password: "",
      permissions: []
    }
  });

  // Add team member mutation
  const addTeamMemberMutation = useMutation({
    mutationFn: async (data: TeamMemberFormData) => {
      return await apiRequest('POST', '/api/team/members', data);
    },
    onSuccess: () => {
      toast({
        title: "Team Member Added",
        description: "The team member has been added successfully.",
      });
      teamMemberForm.reset();
      // Invalidate team members query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Team Member",
        description: error?.message || "There was an error adding the team member.",
        variant: "destructive"
      });
    }
  });

  // Handle team member form submission
  const handleAddTeamMember = (data: TeamMemberFormData) => {
    addTeamMemberMutation.mutate(data);
  };

  // Form configurations moved after queries

  const editMemberForm = useForm<TeamMemberUpdateData>({
    resolver: zodResolver(teamMemberUpdateSchema),
    defaultValues: {
      memberName: "",
      accessLevel: "member",
      permissions: [],
      isActive: true
    }
  });

  // Update team member mutation
  const updateTeamMemberMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TeamMemberUpdateData }) => {
      return await apiRequest('PATCH', `/api/team/members/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Team Member Updated",
        description: "The team member has been updated successfully.",
      });
      setShowEditModal(false);
      setEditingMember(null);
      editMemberForm.reset();
      // Invalidate team members query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Team Member",
        description: error?.message || "There was an error updating the team member.",
        variant: "destructive"
      });
    }
  });

  // Delete team member mutation
  const deleteTeamMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/team/members/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Team Member Removed",
        description: "The team member's access has been revoked successfully.",
      });
      // Invalidate team members query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Remove Team Member",
        description: error?.message || "There was an error removing the team member.",
        variant: "destructive"
      });
    }
  });

  // Handle edit team member
  const handleEditTeamMember = (member: any) => {
    setEditingMember(member);
    editMemberForm.reset({
      memberName: member.name,
      accessLevel: member.accessLevel,
      permissions: member.permissions || [],
      isActive: member.isActive
    });
    setShowEditModal(true);
  };

  // Handle update team member form submission
  const handleUpdateTeamMember = (data: TeamMemberUpdateData) => {
    if (editingMember) {
      updateTeamMemberMutation.mutate({ id: editingMember.id, data });
    }
  };

  // Handle delete team member with confirmation
  const handleDeleteTeamMember = (member: any) => {
    if (window.confirm(`Are you sure you want to revoke access for ${member.name}? This action cannot be undone.`)) {
      deleteTeamMemberMutation.mutate(member.id);
    }
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

  // Navigation functions
  const nextSection = () => {
    navigateToSection((currentSection + 1) % teamSections.length);
  };

  const prevSection = () => {
    navigateToSection((currentSection - 1 + teamSections.length) % teamSections.length);
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
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative z-10">
        {/* Hero Section */}
        <div className="wireframe-border p-8 mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 border-2 border-black mb-4">
              <Activity className="w-5 h-5" />
              <TechnicalLabel text="TEAM DASHBOARD PROTOCOL v5.03" className="text-white" />
            </div>
            <h1 className="text-xl md:text-4xl lg:text-5xl font-black text-foreground mb-3 md:mb-4 tracking-tighter leading-tight px-1 md:px-2">
              TEAM <span className="text-primary">CONTROL</span><br />
              SYSTEM METRICS
            </h1>
            <p className="text-xs md:text-lg md:text-xl text-muted-foreground mb-4 md:mb-6 max-w-2xl mx-auto leading-relaxed px-1 md:px-2">
              Monitor team performance and user metrics in real-time
            </p>
            <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto opacity-60" />
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-12">
          <div className="group split-card bg-gradient-to-br from-card to-card/80 hover:from-primary/5 hover:to-primary/10 border-2 border-muted-foreground/20 hover:border-primary/30 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/10">
            <div className="flex items-start justify-between mb-3">
              <Users className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="TOTAL USERS" className="text-muted-foreground text-xs" />
            </div>
            {metricsLoading ? (
              <div className="text-2xl md:text-3xl font-black mb-2 text-primary animate-pulse">---</div>
            ) : metricsError ? (
              <div className="text-2xl md:text-3xl font-black mb-2 text-red-500">ERR</div>
            ) : (
              <div className="text-2xl md:text-3xl font-black mb-2 text-primary group-hover:text-primary/90 transition-colors" data-testid="metric-total-users">
                {teamMetrics?.totalUsers?.toLocaleString() || '0'}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-muted-foreground" />
              <TechnicalLabel text="REGISTERED ACCOUNTS" className="text-muted-foreground text-xs" />
            </div>
          </div>

          <div className="group split-card bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-2 border-primary/20 hover:border-primary/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/20">
            <div className="flex items-start justify-between mb-3">
              <UserCheck className="w-8 h-8 text-primary group-hover:text-primary/80 transition-colors" />
              <TechnicalLabel text="ACTIVE USERS" className="text-muted-foreground text-xs" />
            </div>
            {metricsLoading ? (
              <div className="text-2xl md:text-3xl font-black mb-2 text-primary animate-pulse">---</div>
            ) : metricsError ? (
              <div className="text-2xl md:text-3xl font-black mb-2 text-red-500">ERR</div>
            ) : (
              <div className="text-2xl md:text-3xl font-black mb-2 text-primary group-hover:text-primary/90 transition-colors" data-testid="metric-active-users">
                {teamMetrics?.activeUsers?.toLocaleString() || '0'}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-primary" />
              <TechnicalLabel text="LAST 30 DAYS" className="text-primary/70 text-xs" />
            </div>
          </div>

          <div className="group split-card bg-gradient-to-br from-muted to-muted/60 hover:from-muted/80 hover:to-muted/40 border-2 border-muted-foreground/20 hover:border-muted-foreground/40 p-6 text-left transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-muted-foreground/10">
            <div className="flex items-start justify-between mb-3">
              <DollarSign className="w-8 h-8 text-foreground/80 group-hover:text-foreground transition-colors" />
              <TechnicalLabel text="TOTAL EARNINGS" className="text-muted-foreground text-xs" />
            </div>
            {metricsLoading ? (
              <div className="text-2xl md:text-3xl font-black mb-2 text-foreground animate-pulse">---</div>
            ) : metricsError ? (
              <div className="text-2xl md:text-3xl font-black mb-2 text-red-500">ERR</div>
            ) : (
              <div className="text-2xl md:text-3xl font-black mb-2 text-foreground group-hover:text-foreground/90 transition-colors" data-testid="metric-total-earnings">
                ₨{parseFloat(teamMetrics?.totalEarnings || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-muted-foreground" />
              <TechnicalLabel text="PLATFORM REVENUE" className="text-muted-foreground text-xs" />
            </div>
          </div>
        </div>

        {/* Six Detailed Metrics Cards - Aligned with Main Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Total Users - New Registrations */}
          <Card className="group split-card bg-gradient-to-br from-card to-card/80 hover:from-primary/5 hover:to-primary/10 border-2 border-muted-foreground/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="border-b border-muted-foreground/20 group-hover:border-primary/30 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <TechnicalLabel text="NEW REGISTRATIONS" className="text-foreground group-hover:text-primary/90 transition-colors" />
                <div className="p-2 bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-all duration-300">
                  <Users className="w-4 h-4 text-primary" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-3xl font-black text-primary" data-testid="metric-new-registrations">
                  {metricsLoading ? '---' : metricsError ? 'ERR' : '1'}
                </div>
                <div className="text-xs text-green-500 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +33%
                </div>
              </div>
              <TechnicalLabel text="TODAY" className="text-primary/70 text-sm" />
              <TechnicalLabel text="New users joined the platform" className="text-muted-foreground text-xs mt-1" />
            </CardContent>
          </Card>

          {/* Total Users - Registration Trend */}
          <Card className="group split-card bg-gradient-to-br from-card to-card/80 hover:from-primary/5 hover:to-primary/10 border-2 border-muted-foreground/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="border-b border-muted-foreground/20 group-hover:border-primary/30 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <TechnicalLabel text="REGISTRATION TREND" className="text-foreground group-hover:text-primary/90 transition-colors" />
                <div className="p-2 bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-all duration-300">
                  <Users className="w-4 h-4 text-primary" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-3xl font-black text-primary" data-testid="metric-registration-trend">
                  {metricsLoading ? '---' : metricsError ? 'ERR' : (teamMetrics?.totalUsers?.toLocaleString() || '3')}
                </div>
                <div className="text-xs text-green-500 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  GROWTH
                </div>
              </div>
              <TechnicalLabel text="TOTAL ACCOUNTS" className="text-primary/70 text-sm" />
              <TechnicalLabel text="All registered accounts" className="text-muted-foreground text-xs mt-1" />
            </CardContent>
          </Card>

          {/* Active Users - Current Session */}
          <Card className="group split-card bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-2 border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
            <CardHeader className="border-b border-primary/20 group-hover:border-primary/30 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <TechnicalLabel text="CURRENT SESSIONS" className="text-foreground group-hover:text-primary/90 transition-colors" />
                <div className="p-2 bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-all duration-300">
                  <UserCheck className="w-4 h-4 text-primary" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-3xl font-black text-primary" data-testid="metric-current-sessions">
                  {metricsLoading ? '---' : metricsError ? 'ERR' : '2'}
                </div>
                <div className="text-xs text-green-500 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  LIVE
                </div>
              </div>
              <TechnicalLabel text="ONLINE NOW" className="text-primary/70 text-sm" />
              <TechnicalLabel text="Users currently active" className="text-muted-foreground text-xs mt-1" />
            </CardContent>
          </Card>

          {/* Active Users - Monthly Active */}
          <Card className="group split-card bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-2 border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
            <CardHeader className="border-b border-primary/20 group-hover:border-primary/30 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <TechnicalLabel text="MONTHLY ACTIVE" className="text-foreground group-hover:text-primary/90 transition-colors" />
                <div className="p-2 bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-all duration-300">
                  <UserCheck className="w-4 h-4 text-primary" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-3xl font-black text-primary" data-testid="metric-monthly-active">
                  {metricsLoading ? '---' : metricsError ? 'ERR' : (teamMetrics?.activeUsers?.toLocaleString() || '3')}
                </div>
                <div className="text-xs text-blue-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  30D
                </div>
              </div>
              <TechnicalLabel text="LAST 30 DAYS" className="text-primary/70 text-sm" />
              <TechnicalLabel text="Users active this month" className="text-muted-foreground text-xs mt-1" />
            </CardContent>
          </Card>

          {/* Total Earnings - Revenue */}
          <Card className="group split-card bg-gradient-to-br from-muted to-muted/60 hover:from-muted/80 hover:to-muted/40 border-2 border-muted-foreground/20 hover:border-muted-foreground/40 transition-all duration-300 hover:shadow-lg hover:shadow-muted-foreground/10">
            <CardHeader className="border-b border-muted-foreground/20 group-hover:border-muted-foreground/30 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <TechnicalLabel text="PLATFORM REVENUE" className="text-foreground group-hover:text-foreground/90 transition-colors" />
                <div className="p-2 bg-foreground/10 border border-muted-foreground/20 group-hover:bg-foreground/20 transition-all duration-300">
                  <DollarSign className="w-4 h-4 text-foreground/80" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-3xl font-black text-foreground" data-testid="metric-platform-revenue">
                  {metricsLoading ? '---' : metricsError ? 'ERR' : `₨${parseFloat(teamMetrics?.totalEarnings || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  TOTAL
                </div>
              </div>
              <TechnicalLabel text="ALL TIME" className="text-muted-foreground text-sm" />
              <TechnicalLabel text="Total platform earnings" className="text-muted-foreground text-xs mt-1" />
            </CardContent>
          </Card>

          {/* Total Earnings - Monthly Revenue */}
          <Card className="group split-card bg-gradient-to-br from-muted to-muted/60 hover:from-muted/80 hover:to-muted/40 border-2 border-muted-foreground/20 hover:border-muted-foreground/40 transition-all duration-300 hover:shadow-lg hover:shadow-muted-foreground/10">
            <CardHeader className="border-b border-muted-foreground/20 group-hover:border-muted-foreground/30 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <TechnicalLabel text="MONTHLY REVENUE" className="text-foreground group-hover:text-foreground/90 transition-colors" />
                <div className="p-2 bg-foreground/10 border border-muted-foreground/20 group-hover:bg-foreground/20 transition-all duration-300">
                  <DollarSign className="w-4 h-4 text-foreground/80" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-3xl font-black text-foreground" data-testid="metric-monthly-revenue">
                  ₨0.00
                </div>
                <div className="text-xs text-yellow-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  THIS MONTH
                </div>
              </div>
              <TechnicalLabel text="CURRENT MONTH" className="text-muted-foreground text-sm" />
              <TechnicalLabel text="Revenue generated this month" className="text-muted-foreground text-xs mt-1" />
            </CardContent>
          </Card>
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

  // CONDITIONAL RENDERING FOR LOADING STATE - FIXES REACT HOOKS ERROR
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="text-2xl font-black mb-2">THORX TEAM</div>
          <div className="text-sm">LOADING...</div>
        </div>
      </div>
    );
  }

  // Copy email to clipboard
  const copyEmailToClipboard = (email: string) => {
    navigator.clipboard.writeText(email).then(() => {
      toast({
        title: "Email Copied",
        description: `${email} has been copied to clipboard.`,
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: "Failed to copy email to clipboard.",
        variant: "destructive"
      });
    });
  };

  // Set message priority
  const setMessagePriority = (messageId: string, priority: 'low' | 'medium' | 'high') => {
    setMessagePriorities(prev => ({
      ...prev,
      [messageId]: priority
    }));
    toast({
      title: "Priority Updated",
      description: `Message priority set to ${priority.toUpperCase()}.`,
    });
  };

  // Inbox Section
  function renderInboxSection() {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative z-10">
        {/* Hero Section */}
        <div className="wireframe-border p-8 mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 border-2 border-black mb-4">
              <Mail className="w-5 h-5" />
              <TechnicalLabel text="INBOX PROTOCOL v3.01" className="text-white" />
            </div>
            <h1 className="text-xl md:text-4xl lg:text-5xl font-black text-foreground mb-3 md:mb-4 tracking-tighter leading-tight px-1 md:px-2">
              TEAM <span className="text-primary">INBOX</span><br />
              MESSAGE CENTER
            </h1>
            <p className="text-xs md:text-lg md:text-xl text-muted-foreground mb-4 md:mb-6 max-w-2xl mx-auto leading-relaxed px-1 md:px-2">
              View and manage user messages with priority controls
            </p>
            <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto opacity-60" />
          </div>
        </div>

        {/* Two Panel Layout */}
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Messages List Panel */}
          <div className="lg:col-span-2">
            <Card className="group split-card bg-gradient-to-br from-card to-card/90 border-2 border-muted-foreground/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
              <CardHeader className="border-b border-muted-foreground/20 group-hover:border-primary/30 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <TechnicalLabel text="MESSAGE LIST" className="text-foreground group-hover:text-primary/90 transition-colors" />
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-all duration-300">
                      <Mail className="w-4 h-4 text-primary" />
                    </div>
                    {emailsData?.emails && (
                      <div className="px-2 py-1 bg-primary/20 border border-primary/30">
                        <TechnicalLabel text={`${emailsData.emails.length}`} className="text-primary text-sm font-black" />
                      </div>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[600px] overflow-y-auto">
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
                    <TechnicalLabel text="User messages will appear here" className="text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-0" data-testid="email-messages-list">
                    {emailsData.emails.map((email: any, index: number) => {
                      const priority = messagePriorities[email.id] || 'medium';
                      const isSelected = selectedMessage?.id === email.id;
                      return (
                        <div 
                          key={email.id || index} 
                          onClick={() => setSelectedMessage(email)}
                          className={`border-b border-muted-foreground/20 p-4 transition-all cursor-pointer hover:bg-primary/5 ${
                            isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                          }`}
                          data-testid={`email-message-${index}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 border-2 ${
                                priority === 'high' ? 'bg-red-500 border-red-500' :
                                priority === 'low' ? 'bg-green-500 border-green-500' :
                                'bg-yellow-500 border-yellow-500'
                              }`} />
                              <TechnicalLabel 
                                text={email.fromEmail || 'Unknown Sender'} 
                                className="text-primary text-sm font-semibold" 
                              />
                            </div>
                            <TechnicalLabel 
                              text={email.createdAt ? new Date(email.createdAt).toLocaleDateString() : 'N/A'} 
                              className="text-muted-foreground text-xs" 
                            />
                          </div>
                          <div className="mb-2">
                            <TechnicalLabel 
                              text={email.subject || 'No Subject'} 
                              className="text-foreground font-semibold text-sm" 
                            />
                            {email.subject?.startsWith('Contact Message from') && (
                              <div className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 border border-blue-300 ml-2">
                                USER CONTACT
                              </div>
                            )}
                          </div>
                          <div className="text-muted-foreground text-xs line-clamp-2">
                            {email.content ? (
                              email.content.length > 80 
                                ? `${email.content.substring(0, 80)}...` 
                                : email.content
                            ) : 'No message content'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Message Details Panel */}
          <div className="lg:col-span-3">
            <Card className="group split-card bg-gradient-to-br from-card to-card/90 border-2 border-muted-foreground/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
              <CardHeader className="border-b border-muted-foreground/20 group-hover:border-primary/30 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <TechnicalLabel text="MESSAGE DETAILS" className="text-foreground group-hover:text-primary/90 transition-colors" />
                  <div className="p-2 bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-all duration-300">
                    <Eye className="w-4 h-4 text-primary" />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {!selectedMessage ? (
                  <div className="text-center p-12">
                    <Mail className="w-16 h-16 mx-auto mb-4 text-primary" />
                    <TechnicalLabel text="SELECT A MESSAGE" className="text-primary text-2xl" />
                    <TechnicalLabel text="Click on a message from the list to view details" className="text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Message Header */}
                    <div className="border-2 border-muted-foreground/20 bg-background p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <TechnicalLabel 
                            text="MESSAGE SUBJECT" 
                            className="text-muted-foreground text-sm mb-1" 
                          />
                          <TechnicalLabel 
                            text={selectedMessage.subject || 'No Subject'} 
                            className="text-foreground text-xl font-black" 
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <TechnicalLabel text="PRIORITY:" className="text-muted-foreground text-sm" />
                          <select
                            value={messagePriorities[selectedMessage.id] || 'medium'}
                            onChange={(e) => setMessagePriority(selectedMessage.id, e.target.value as 'low' | 'medium' | 'high')}
                            className="bg-background border-2 border-muted-foreground/30 text-foreground px-3 py-1 text-sm focus:outline-none focus:border-primary"
                            data-testid="priority-select"
                          >
                            <option value="low">LOW</option>
                            <option value="medium">MEDIUM</option>
                            <option value="high">HIGH</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <TechnicalLabel 
                            text="FROM EMAIL:" 
                            className="text-muted-foreground mb-1" 
                          />
                          <div className="flex items-center gap-2">
                            <TechnicalLabel 
                              text={selectedMessage.fromEmail || 'Unknown'} 
                              className="text-primary font-mono" 
                            />
                            <Button
                              size="sm"
                              onClick={() => copyEmailToClipboard(selectedMessage.fromEmail)}
                              className="h-6 w-6 p-0 bg-transparent border border-primary/30 hover:bg-primary/10"
                              data-testid="copy-email-button"
                            >
                              <Download className="w-3 h-3 text-primary" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <TechnicalLabel 
                            text="TO EMAIL:" 
                            className="text-muted-foreground mb-1" 
                          />
                          <TechnicalLabel 
                            text={selectedMessage.toEmail || 'N/A'} 
                            className="text-foreground font-mono" 
                          />
                        </div>
                        <div>
                          <TechnicalLabel 
                            text="MESSAGE TYPE:" 
                            className="text-muted-foreground mb-1" 
                          />
                          <span className={`px-2 py-1 text-xs border-2 inline-block ${
                            selectedMessage.type === 'inbound' 
                              ? 'border-green-500 text-green-500 bg-green-500/10' 
                              : 'border-blue-500 text-blue-500 bg-blue-500/10'
                          }`}>
                            {selectedMessage.type?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </div>
                        <div>
                          <TechnicalLabel 
                            text="RECEIVED:" 
                            className="text-muted-foreground mb-1" 
                          />
                          <TechnicalLabel 
                            text={selectedMessage.createdAt ? new Date(selectedMessage.createdAt).toLocaleString() : 'N/A'} 
                            className="text-foreground" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className="border-2 border-muted-foreground/20 bg-background p-4">
                      <TechnicalLabel 
                        text="MESSAGE CONTENT" 
                        className="text-muted-foreground text-sm mb-3" 
                      />
                      <div className="bg-muted/30 border border-muted-foreground/20 p-4 min-h-[200px]">
                        <div className="text-foreground whitespace-pre-wrap font-mono text-sm leading-relaxed">
                          {selectedMessage.content || 'No message content available'}
                        </div>
                      </div>
                    </div>

                    {/* Message Actions */}
                    <div className="flex items-center justify-between border-t border-muted-foreground/20 pt-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 border-2 ${
                          (messagePriorities[selectedMessage.id] || 'medium') === 'high' ? 'bg-red-500 border-red-500' :
                          (messagePriorities[selectedMessage.id] || 'medium') === 'low' ? 'bg-green-500 border-green-500' :
                          'bg-yellow-500 border-yellow-500'
                        }`} />
                        <TechnicalLabel 
                          text={`PRIORITY: ${(messagePriorities[selectedMessage.id] || 'medium').toUpperCase()}`} 
                          className="text-foreground text-sm" 
                        />
                      </div>
                      <TechnicalLabel 
                        text={`ID: ${selectedMessage.id || 'N/A'}`} 
                        className="text-muted-foreground text-xs font-mono" 
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Data Section
  function renderDataSection() {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative z-10">
        {/* Hero Section */}
        <div className="wireframe-border p-8 mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 border-2 border-black mb-4">
              <Database className="w-5 h-5" />
              <TechnicalLabel text="DATA ACCESS PROTOCOL v3.67" className="text-white" />
            </div>
            <h1 className="text-xl md:text-4xl lg:text-5xl font-black text-foreground mb-3 md:mb-4 tracking-tighter leading-tight px-1 md:px-2">
              USER <span className="text-primary">DATA</span><br />
              CREDENTIALS VIEW
            </h1>
            <p className="text-xs md:text-lg md:text-xl text-muted-foreground mb-4 md:mb-6 max-w-2xl mx-auto leading-relaxed px-1 md:px-2">
              Access and manage user credentials and account information
            </p>
            <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto opacity-60" />
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="group split-card bg-gradient-to-br from-card to-card/90 border-2 border-muted-foreground/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-background border-2 border-muted-foreground/30 text-foreground pl-12 pr-4 py-3 text-lg focus:outline-none focus:border-primary"
                    data-testid="input-search-users"
                  />
                </div>
              </div>
              <Button
                className="bg-primary hover:bg-primary/90 text-black px-6 py-3 text-lg font-black border-2 border-black"
                data-testid="button-export-data"
              >
                <Download className="w-5 h-5 mr-2" />
                EXPORT
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Credentials List */}
        <Card className="group split-card bg-gradient-to-br from-card to-card/90 border-2 border-muted-foreground/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
          <CardHeader className="border-b border-muted-foreground/20 group-hover:border-primary/30 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <TechnicalLabel text="USER CREDENTIALS" className="text-foreground group-hover:text-primary/90 transition-colors" />
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-all duration-300">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                {credentialsData?.credentials && (
                  <div className="px-2 py-1 bg-primary/20 border border-primary/30">
                    <TechnicalLabel text={`${credentialsData.credentials.length}`} className="text-primary text-sm font-black" />
                  </div>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Real-time Status Indicator */}
            <div className="flex items-center justify-between mb-4 p-3 bg-muted/30 border border-muted-foreground/20">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${credentialsLoading ? 'bg-yellow-500 animate-pulse' : credentialsError ? 'bg-red-500' : 'bg-green-500'}`}></div>
                <TechnicalLabel 
                  text={credentialsLoading ? 'SYNCING...' : credentialsError ? 'CONNECTION ERROR' : 'LIVE DATA'} 
                  className={`text-sm ${credentialsLoading ? 'text-yellow-600' : credentialsError ? 'text-red-600' : 'text-green-600'}`} 
                />
              </div>
              <div className="flex items-center gap-2">
                <TechnicalLabel text="LAST UPDATE:" className="text-muted-foreground text-xs" />
                <TechnicalLabel text={new Date().toLocaleTimeString()} className="text-foreground text-xs font-mono" />
              </div>
            </div>

            {credentialsLoading ? (
              <div className="text-center p-12">
                <div className="w-16 h-16 mx-auto mb-4 animate-spin border-4 border-primary border-t-transparent rounded-full"></div>
                <TechnicalLabel text="LOADING CREDENTIALS..." className="text-primary text-xl" />
                <TechnicalLabel text="Fetching real-time data..." className="text-muted-foreground text-sm mt-2" />
              </div>
            ) : credentialsError ? (
              <div className="text-center p-12">
                <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
                <TechnicalLabel text="ERROR LOADING CREDENTIALS" className="text-red-500 text-xl" />
                <TechnicalLabel text="Unable to fetch real-time data" className="text-muted-foreground" />
                <Button 
                  className="mt-4 bg-red-500/10 border border-red-500/30 text-red-600 hover:bg-red-500/20"
                  onClick={() => window.location.reload()}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  RETRY CONNECTION
                </Button>
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
                  <TechnicalLabel text="NO CREDENTIALS STORED" className="text-primary text-2xl" />
                  <TechnicalLabel text="Users haven't stored any platform credentials yet" className="text-muted-foreground mb-4" />
                  
                  {/* Live Statistics */}
                  <div className="grid grid-cols-3 gap-4 mt-6 p-4 bg-muted/20 border border-muted-foreground/20">
                    <div className="text-center">
                      <div className="text-2xl font-black text-primary" data-testid="total-users-with-credentials">
                        {teamMetrics?.totalUsers || '0'}
                      </div>
                      <TechnicalLabel text="TOTAL USERS" className="text-muted-foreground text-xs" />
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-orange-500">
                        0
                      </div>
                      <TechnicalLabel text="WITH CREDENTIALS" className="text-muted-foreground text-xs" />
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-green-500">
                        0%
                      </div>
                      <TechnicalLabel text="ADOPTION RATE" className="text-muted-foreground text-xs" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4" data-testid="credentials-list">
                  {/* Enhanced Statistics Header */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/20 border border-muted-foreground/20">
                    <div className="text-center">
                      <div className="text-xl font-black text-primary">
                        {credentials.length}
                      </div>
                      <TechnicalLabel text="TOTAL STORED" className="text-muted-foreground text-xs" />
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-black text-green-500">
                        {credentials.filter((c: any) => c.isActive).length}
                      </div>
                      <TechnicalLabel text="ACTIVE" className="text-muted-foreground text-xs" />
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-black text-blue-500">
                        {[...new Set(credentials.map((c: any) => c.platform))].length}
                      </div>
                      <TechnicalLabel text="PLATFORMS" className="text-muted-foreground text-xs" />
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-black text-orange-500">
                        {Math.round((credentials.length / (teamMetrics?.totalUsers || 1)) * 100)}%
                      </div>
                      <TechnicalLabel text="USER ADOPTION" className="text-muted-foreground text-xs" />
                    </div>
                  </div>

                  {searchTerm && (
                    <div className="mb-4 text-center p-2 bg-primary/10 border border-primary/20">
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
                        className="border-2 border-muted-foreground/20 bg-background hover:bg-primary/5 p-4 transition-colors"
                        data-testid={`credential-item-${index}`}
                      >
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="mb-2 flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${credential.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              <TechnicalLabel 
                                text={`USER: ${credential.user?.firstName || 'N/A'} ${credential.user?.lastName || ''}`} 
                                className="text-primary font-semibold" 
                              />
                            </div>
                            <div className="mb-2">
                              <TechnicalLabel 
                                text={`EMAIL: ${credential.user?.email || 'N/A'}`} 
                                className="text-muted-foreground text-sm" 
                              />
                            </div>
                            <div className="mb-2">
                              <TechnicalLabel 
                                text={`PLATFORM: ${credential.platform || 'N/A'}`} 
                                className="text-foreground" 
                              />
                            </div>
                            <div className="mb-2">
                              <span className={`px-2 py-1 text-xs border ${
                                credential.isActive 
                                  ? 'border-green-500 text-green-500 bg-green-500/10' 
                                  : 'border-red-500 text-red-500 bg-red-500/10'
                              }`}>
                                {credential.isActive ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="mb-2">
                              <TechnicalLabel 
                                text={`USERNAME: ${credential.username || 'N/A'}`} 
                                className="text-muted-foreground text-sm" 
                              />
                            </div>
                            <div className="mb-2">
                              <TechnicalLabel 
                                text={`CREDENTIAL EMAIL: ${credential.email || 'N/A'}`} 
                                className="text-muted-foreground text-sm" 
                              />
                            </div>
                            <div className="mb-2 flex items-center gap-2">
                              <TechnicalLabel 
                                text="PASSWORD:" 
                                className="text-muted-foreground text-sm" 
                              />
                              <span className="font-mono text-sm bg-muted border border-muted-foreground/30 px-2 py-1">
                                ••••••••
                              </span>
                              <Button
                                size="sm"
                                className="h-6 w-6 p-0 bg-transparent border border-muted-foreground/30 hover:bg-primary/10"
                                data-testid={`toggle-password-${index}`}
                              >
                                <Eye className="w-3 h-3 text-primary" />
                              </Button>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <TechnicalLabel 
                                text={`ADDED: ${credential.createdAt ? new Date(credential.createdAt).toLocaleDateString() : 'N/A'}`} 
                                className="text-muted-foreground text-xs block" 
                              />
                              <TechnicalLabel 
                                text={`UPDATED: ${credential.lastUpdated ? new Date(credential.lastUpdated).toLocaleDateString() : 'N/A'}`} 
                                className="text-muted-foreground text-xs block" 
                              />
                              {credential.notes && (
                                <TechnicalLabel 
                                  text={`NOTES: ${credential.notes}`} 
                                  className="text-blue-400 text-xs block mt-1" 
                                />
                              )}
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
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative z-10">
        {/* Hero Section */}
        <div className="wireframe-border p-8 mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 border-2 border-black mb-4">
              <Key className="w-5 h-5" />
              <TechnicalLabel text="ACCESS PROTOCOL v4.91" className="text-white" />
            </div>
            <h1 className="text-xl md:text-4xl lg:text-5xl font-black text-foreground mb-3 md:mb-4 tracking-tighter leading-tight px-1 md:px-2">
              TEAM <span className="text-primary">KEYS</span><br />
              MEMBER ACCESS
            </h1>
            <p className="text-xs md:text-lg md:text-xl text-muted-foreground mb-4 md:mb-6 max-w-2xl mx-auto leading-relaxed px-1 md:px-2">
              Manage team member access keys and permissions
            </p>
            <Barcode className="w-32 md:w-48 h-8 md:h-10 mx-auto opacity-60" />
          </div>
        </div>

        {/* Add New Member */}
        <Card className="group split-card bg-gradient-to-br from-card to-card/90 border-2 border-muted-foreground/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 mb-8">
          <CardHeader className="border-b border-muted-foreground/20 group-hover:border-primary/30 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <TechnicalLabel text="ADD TEAM MEMBER" className="text-foreground group-hover:text-primary/90 transition-colors" />
              <div className="p-2 bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-all duration-300">
                <Plus className="w-4 h-4 text-primary" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={teamMemberForm.handleSubmit(handleAddTeamMember)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <TechnicalLabel text="MEMBER NAME" className="text-foreground mb-2" />
                  <input
                    type="text"
                    placeholder="Team member name"
                    className="w-full bg-background border-2 border-muted-foreground/30 text-foreground px-4 py-3 text-lg focus:outline-none focus:border-primary"
                    data-testid="input-member-name"
                    {...teamMemberForm.register("memberName")}
                  />
                  {teamMemberForm.formState.errors.memberName && (
                    <p className="text-red-500 text-sm mt-1">{teamMemberForm.formState.errors.memberName.message}</p>
                  )}
                </div>
                <div>
                  <TechnicalLabel text="EMAIL ADDRESS" className="text-foreground mb-2" />
                  <input
                    type="email"
                    placeholder="member@company.com"
                    className="w-full bg-background border-2 border-muted-foreground/30 text-foreground px-4 py-3 text-lg focus:outline-none focus:border-primary"
                    data-testid="input-member-email"
                    {...teamMemberForm.register("email")}
                  />
                  {teamMemberForm.formState.errors.email && (
                    <p className="text-red-500 text-sm mt-1">{teamMemberForm.formState.errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <TechnicalLabel text="ACCESS LEVEL" className="text-foreground mb-2" />
                  <select 
                    className="w-full bg-background border-2 border-muted-foreground/30 text-foreground px-4 py-3 text-lg focus:outline-none focus:border-primary"
                    data-testid="select-access-level"
                    {...teamMemberForm.register("accessLevel")}
                  >
                    <option value="">SELECT LEVEL</option>
                    <option value="founder">FOUNDER</option>
                    <option value="admin">ADMIN</option>
                    <option value="member">MEMBER</option>
                  </select>
                  {teamMemberForm.formState.errors.accessLevel && (
                    <p className="text-red-500 text-sm mt-1">{teamMemberForm.formState.errors.accessLevel.message}</p>
                  )}
                </div>
                <div>
                  <TechnicalLabel text="INITIAL PASSWORD" className="text-foreground mb-2" />
                  <input
                    type="password"
                    placeholder="Set initial password"
                    className="w-full bg-background border-2 border-muted-foreground/30 text-foreground px-4 py-3 text-lg focus:outline-none focus:border-primary"
                    data-testid="input-member-password"
                    {...teamMemberForm.register("password")}
                  />
                  {teamMemberForm.formState.errors.password && (
                    <p className="text-red-500 text-sm mt-1">{teamMemberForm.formState.errors.password.message}</p>
                  )}
                </div>
              </div>

              <div className="text-center">
                <Button
                  type="submit"
                  disabled={addTeamMemberMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-black px-12 py-4 text-lg font-black border-2 border-black disabled:opacity-50"
                  data-testid="button-add-member"
                >
                  {addTeamMemberMutation.isPending ? (
                    <>
                      <div className="w-5 h-5 mr-3 animate-spin border-2 border-black border-t-transparent rounded-full"></div>
                      ADDING...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-3" />
                      ADD MEMBER
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Team Members List */}
        <Card className="group split-card bg-gradient-to-br from-card to-card/90 border-2 border-muted-foreground/20 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
          <CardHeader className="border-b border-muted-foreground/20 group-hover:border-primary/30 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <TechnicalLabel text="TEAM MEMBERS" className="text-foreground group-hover:text-primary/90 transition-colors" />
              <div className="p-2 bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-all duration-300">
                <Key className="w-4 h-4 text-primary" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {membersLoading ? (
              <div className="text-center p-12">
                <div className="w-16 h-16 mx-auto mb-4 animate-spin border-4 border-primary border-t-transparent rounded-full"></div>
                <TechnicalLabel text="LOADING TEAM MEMBERS..." className="text-primary text-xl" />
              </div>
            ) : membersError ? (
              <div className="text-center p-12">
                <Key className="w-16 h-16 mx-auto mb-4 text-red-500" />
                <TechnicalLabel text="ERROR LOADING MEMBERS" className="text-red-500 text-xl" />
                <TechnicalLabel text="Please try refreshing the page" className="text-muted-foreground" />
              </div>
            ) : !teamMembersData?.members || teamMembersData.members.length === 0 ? (
              <div className="text-center p-12">
                <Key className="w-16 h-16 mx-auto mb-4 text-primary" />
                <TechnicalLabel text="NO TEAM MEMBERS" className="text-primary text-2xl" />
                <TechnicalLabel text="Team member access keys will appear here" className="text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4" data-testid="team-members-list">
                {teamMembersData.members.map((member: any, index: number) => (
                  <div 
                    key={member.id || index} 
                    className="border-2 border-muted-foreground/20 bg-background hover:bg-primary/5 p-4 transition-colors"
                    data-testid={`team-member-${index}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <Key className="w-5 h-5 text-primary" />
                            <TechnicalLabel 
                              text={member.name || 'Unknown Member'} 
                              className="text-primary font-semibold text-lg" 
                            />
                          </div>
                          <span className={`px-3 py-1 text-xs border-2 ${
                            member.accessLevel === 'founder' 
                              ? 'border-purple-500 text-purple-500 bg-purple-500/10' 
                              : member.accessLevel === 'admin'
                              ? 'border-red-500 text-red-500 bg-red-500/10'
                              : 'border-green-500 text-green-500 bg-green-500/10'
                          }`}>
                            {member.accessLevel?.toUpperCase() || 'MEMBER'}
                          </span>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <TechnicalLabel 
                              text={`EMAIL: ${member.email || 'N/A'}`} 
                              className="text-muted-foreground" 
                            />
                          </div>
                          <div>
                            <TechnicalLabel 
                              text={`MEMBER ID: ${member.id || 'N/A'}`} 
                              className="text-muted-foreground" 
                            />
                          </div>
                          <div>
                            <TechnicalLabel 
                              text={`ADDED: ${member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}`} 
                              className="text-muted-foreground" 
                            />
                          </div>
                          <div>
                            <TechnicalLabel 
                              text={`STATUS: ${member.isActive ? 'ACTIVE' : 'INACTIVE'}`} 
                              className={`${member.isActive ? 'text-green-400' : 'text-red-400'}`} 
                            />
                          </div>
                          {member.permissions && member.permissions.length > 0 && (
                            <div className="md:col-span-2">
                              <TechnicalLabel 
                                text={`PERMISSIONS: ${member.permissions.join(', ')}`} 
                                className="text-blue-400" 
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => handleEditTeamMember(member)}
                          disabled={updateTeamMemberMutation.isPending}
                          className="h-8 w-8 p-0 bg-transparent border-2 border-yellow-500/30 hover:bg-yellow-500/10 disabled:opacity-50"
                          data-testid={`edit-member-${index}`}
                        >
                          {updateTeamMemberMutation.isPending && editingMember?.id === member.id ? (
                            <div className="w-4 h-4 animate-spin border border-yellow-500 border-t-transparent rounded-full" />
                          ) : (
                            <Edit className="w-4 h-4 text-yellow-500" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDeleteTeamMember(member)}
                          disabled={deleteTeamMemberMutation.isPending}
                          className="h-8 w-8 p-0 bg-transparent border-2 border-red-500/30 hover:bg-red-500/10 disabled:opacity-50"
                          data-testid={`delete-member-${index}`}
                        >
                          {deleteTeamMemberMutation.isPending ? (
                            <div className="w-4 h-4 animate-spin border border-red-500 border-t-transparent rounded-full" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Team Member Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-[600px] bg-background border-2 border-primary text-foreground">
            <DialogHeader>
              <DialogTitle className="text-center">
                <TechnicalLabel text="EDIT TEAM MEMBER" className="text-primary text-xl" />
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={editMemberForm.handleSubmit(handleUpdateTeamMember)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <TechnicalLabel text="MEMBER NAME" className="text-foreground mb-2" />
                  <input
                    type="text"
                    placeholder="Full name"
                    className="w-full bg-background border-2 border-muted-foreground/30 text-foreground px-4 py-3 text-lg focus:outline-none focus:border-primary"
                    data-testid="edit-input-member-name"
                    {...editMemberForm.register("memberName")}
                  />
                  {editMemberForm.formState.errors.memberName && (
                    <p className="text-red-500 text-sm mt-1">{editMemberForm.formState.errors.memberName.message}</p>
                  )}
                </div>
                <div>
                  <TechnicalLabel text="ACCESS LEVEL" className="text-foreground mb-2" />
                  <select
                    className="w-full bg-background border-2 border-muted-foreground/30 text-foreground px-4 py-3 text-lg focus:outline-none focus:border-primary"
                    data-testid="edit-select-access-level"
                    {...editMemberForm.register("accessLevel")}
                  >
                    <option value="">SELECT LEVEL</option>
                    <option value="founder">FOUNDER</option>
                    <option value="admin">ADMIN</option>
                    <option value="member">MEMBER</option>
                  </select>
                  {editMemberForm.formState.errors.accessLevel && (
                    <p className="text-red-500 text-sm mt-1">{editMemberForm.formState.errors.accessLevel.message}</p>
                  )}
                </div>
              </div>

              <div>
                <TechnicalLabel text="MEMBER STATUS" className="text-foreground mb-2" />
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-primary bg-background border-2 border-muted-foreground/30 focus:ring-primary focus:ring-2"
                    data-testid="edit-checkbox-active"
                    {...editMemberForm.register("isActive")}
                  />
                  <TechnicalLabel text="ACTIVE MEMBER" className="text-foreground" />
                </label>
                {editMemberForm.formState.errors.isActive && (
                  <p className="text-red-500 text-sm mt-1">{editMemberForm.formState.errors.isActive.message}</p>
                )}
              </div>

              <DialogFooter className="gap-4 sm:gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-transparent border-2 border-muted-foreground/30 text-muted-foreground hover:bg-muted-foreground/10"
                  data-testid="edit-button-cancel"
                >
                  <TechnicalLabel text="CANCEL" />
                </Button>
                <Button
                  type="submit"
                  disabled={updateTeamMemberMutation.isPending}
                  className="flex-1 bg-primary hover:bg-primary/90 text-black border-2 border-black disabled:opacity-50"
                  data-testid="edit-button-save"
                >
                  {updateTeamMemberMutation.isPending ? (
                    <>
                      <div className="w-5 h-5 mr-3 animate-spin border-2 border-black border-t-transparent rounded-full"></div>
                      UPDATING...
                    </>
                  ) : (
                    <TechnicalLabel text="UPDATE MEMBER" />
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Industrial Grid Overlay */}
      <div className="industrial-grid fixed inset-0 z-0" />

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

      {/* Desktop Navigation Controls - Landing Page Style */}
      <div className="arrow-keys-guide">
        <div className="flex items-center gap-3">
          <button
            onClick={prevSection}
            className="arrow-key"
            disabled={currentSection === 0}
            data-testid="button-prev-section"
          >
            ←
          </button>
          <button
            onClick={nextSection}
            className="arrow-key"
            disabled={currentSection === teamSections.length - 1}
            data-testid="button-next-section"
          >
            →
          </button>
        </div>
      </div>

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
