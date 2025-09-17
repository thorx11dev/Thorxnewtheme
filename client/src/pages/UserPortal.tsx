
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import TechnicalLabel from '@/components/ui/technical-label';
import { 
  User, 
  Briefcase, 
  HelpCircle, 
  LogOut,
  Send,
  Phone,
  Mail,
  MessageCircle
} from 'lucide-react';

function UserPortal() {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [helpTab, setHelpTab] = useState('guide');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { sender: 'support', message: 'Hello! How can we help you today?', time: '10:30 AM' },
    { sender: 'user', message: 'I need help with my account settings', time: '10:31 AM' },
    { sender: 'support', message: 'Sure! I\'d be happy to help you with your account settings. What specifically would you like to change?', time: '10:32 AM' }
  ]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      setChatHistory([...chatHistory, { 
        sender: 'user', 
        message: chatMessage, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setChatMessage('');
      
      // Simulate support response after 2 seconds
      setTimeout(() => {
        setChatHistory(prev => [...prev, {
          sender: 'support',
          message: 'Thank you for your message. Our team will get back to you shortly.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }, 2000);
    }
  };

  const renderHelpSection = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <TechnicalLabel text="THORX INDUSTRIAL" className="text-orange-400 text-sm mb-2" />
          <h1 className="text-4xl font-black tracking-tight">HELP CENTER</h1>
          <div className="h-1 w-24 bg-orange-400 mt-2"></div>
        </div>

        {/* Tabs */}
        <Tabs value={helpTab} onValueChange={setHelpTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border border-slate-700">
            <TabsTrigger 
              value="guide" 
              className="data-[state=active]:bg-orange-400 data-[state=active]:text-black font-semibold"
            >
              AREA GUIDE
            </TabsTrigger>
            <TabsTrigger 
              value="help" 
              className="data-[state=active]:bg-orange-400 data-[state=active]:text-black font-semibold"
            >
              AREA HELP
            </TabsTrigger>
            <TabsTrigger 
              value="contact" 
              className="data-[state=active]:bg-orange-400 data-[state=active]:text-black font-semibold"
            >
              AREA CONTACT
            </TabsTrigger>
          </TabsList>

          <TabsContent value="guide" className="mt-6">
            <Card className="bg-slate-800/30 border-slate-700">
              <CardContent className="p-8">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-bold text-orange-400 mb-3">Getting Started</h3>
                    <div className="space-y-3 text-slate-300">
                      <p><strong>Q: How do I navigate the THORX portal?</strong></p>
                      <p>A: Use the sidebar navigation to access different sections. Dashboard provides overview, Work shows tasks, and Profile manages your account.</p>
                      
                      <p><strong>Q: How do I update my profile information?</strong></p>
                      <p>A: Navigate to the Profile section and click on the information you want to update. Changes are saved automatically.</p>
                      
                      <p><strong>Q: Where can I view my work assignments?</strong></p>
                      <p>A: All work assignments are available in the Work section with detailed task information and deadlines.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-orange-400 mb-3">Account Management</h3>
                    <div className="space-y-3 text-slate-300">
                      <p><strong>Q: How do I change my password?</strong></p>
                      <p>A: Go to Profile → Security Settings and follow the password change process.</p>
                      
                      <p><strong>Q: What if I forget my password?</strong></p>
                      <p>A: Use the "Forgot Password" link on the login page to reset your credentials.</p>
                      
                      <p><strong>Q: How do I enable two-factor authentication?</strong></p>
                      <p>A: Navigate to Profile → Security and enable 2FA for enhanced account protection.</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-orange-400 mb-3">Technical Support</h3>
                    <div className="space-y-3 text-slate-300">
                      <p><strong>Q: The portal is running slowly, what should I do?</strong></p>
                      <p>A: Clear your browser cache, ensure stable internet connection, and try refreshing the page.</p>
                      
                      <p><strong>Q: I'm experiencing login issues, how can I resolve this?</strong></p>
                      <p>A: Check your credentials, ensure caps lock is off, and contact support if issues persist.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="help" className="mt-6">
            <Card className="bg-slate-800/30 border-slate-700">
              <CardContent className="p-0">
                <div className="h-[500px] flex flex-col">
                  {/* Chat Header */}
                  <div className="bg-slate-800 p-4 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">THORX Support</h3>
                        <p className="text-sm text-slate-400">Online • Usually replies instantly</p>
                      </div>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    {chatHistory.map((chat, index) => (
                      <div key={index} className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                          chat.sender === 'user' 
                            ? 'bg-orange-400 text-black' 
                            : 'bg-slate-700 text-white'
                        }`}>
                          <p className="text-sm">{chat.message}</p>
                          <p className={`text-xs mt-1 ${
                            chat.sender === 'user' ? 'text-black/70' : 'text-slate-400'
                          }`}>
                            {chat.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chat Input */}
                  <div className="border-t border-slate-700 p-4">
                    <div className="flex gap-2">
                      <Input
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <Button 
                        onClick={handleSendMessage}
                        className="bg-orange-400 hover:bg-orange-500 text-black"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="mt-6">
            <Card className="bg-slate-800/30 border-slate-700">
              <CardContent className="p-8">
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-slate-300">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="Enter your first name"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-slate-300">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Enter your last name"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-slate-300">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-slate-300">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="What can we help you with?"
                      className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-slate-300">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Please describe your inquiry in detail..."
                      rows={4}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 resize-none"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-orange-400 hover:bg-orange-500 text-black font-semibold"
                  >
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen bg-slate-900/50 border-r border-slate-700 p-6">
          <div className="mb-8">
            <TechnicalLabel text="THORX INDUSTRIAL" className="text-orange-400 text-xs mb-2" />
            <h2 className="text-xl font-black">USER PORTAL</h2>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveSection('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeSection === 'dashboard' 
                  ? 'bg-orange-400 text-black' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <User className="w-5 h-5" />
              Dashboard
            </button>
            
            <button
              onClick={() => setActiveSection('work')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeSection === 'work' 
                  ? 'bg-orange-400 text-black' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Briefcase className="w-5 h-5" />
              Work
            </button>
            
            <button
              onClick={() => setActiveSection('help')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeSection === 'help' 
                  ? 'bg-orange-400 text-black' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <HelpCircle className="w-5 h-5" />
              Help
            </button>
          </nav>

          <div className="mt-auto pt-8">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-slate-300 hover:bg-slate-800"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {activeSection === 'help' ? (
            renderHelpSection()
          ) : (
            <div className="p-8">
              <div className="max-w-4xl mx-auto">
                <TechnicalLabel text="THORX INDUSTRIAL" className="text-orange-400 text-sm mb-2" />
                <h1 className="text-4xl font-black tracking-tight mb-8">
                  {activeSection === 'dashboard' && 'DASHBOARD'}
                  {activeSection === 'work' && 'WORK CENTER'}
                </h1>
                
                <Card className="bg-slate-800/30 border-slate-700">
                  <CardContent className="p-8">
                    {activeSection === 'dashboard' && (
                      <div>
                        <h2 className="text-2xl font-bold mb-4">Welcome back, {user?.username}!</h2>
                        <p className="text-slate-300">Your dashboard content will appear here.</p>
                      </div>
                    )}
                    
                    {activeSection === 'work' && (
                      <div>
                        <h2 className="text-2xl font-bold mb-4">Work Assignments</h2>
                        <p className="text-slate-300">Your work tasks and assignments will appear here.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserPortal;
