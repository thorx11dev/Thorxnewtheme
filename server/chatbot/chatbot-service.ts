import knowledgeBase from './knowledge-base.json';

interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'support';
  timestamp: string;
  avatar: string;
}

interface ChatbotResponse {
  response: string;
  language: 'en' | 'ur';
  intent?: string;
}

export class ChatbotService {
  private knowledgeBase: typeof knowledgeBase;

  constructor() {
    this.knowledgeBase = knowledgeBase;
  }

  detectLanguage(message: string): 'en' | 'ur' {
    const urduPatterns = [
      /\b(kaise|kya|hai|hain|ka|ki|se|mein|aap|apka|apna|aapki|kaise|karna|karein|chahiye|chahie|hoon|ho|dekhen|dekhna|paise|kamai|zyada|jaldi|please|zaroor|bohot|bahut|ab|abhi|phir|yahan|wahan|kar|karo|kare)\b/i,
      /[\u0600-\u06FF]/
    ];

    for (const pattern of urduPatterns) {
      if (pattern.test(message)) {
        return 'ur';
      }
    }

    return 'en';
  }

  checkSecurityBoundary(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    for (const topic of this.knowledgeBase.security_blocked_topics) {
      if (lowerMessage.includes(topic.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }

  findIntent(message: string, language: 'en' | 'ur'): string | null {
    const lowerMessage = message.toLowerCase();

    for (const intent of this.knowledgeBase.intents) {
      const patterns = intent.patterns[language];
      
      for (const pattern of patterns) {
        if (lowerMessage.includes(pattern.toLowerCase())) {
          return intent.id;
        }
      }
    }

    return null;
  }

  generateResponse(intentId: string, language: 'en' | 'ur', userName: string = 'User'): string {
    const intent = this.knowledgeBase.intents.find(i => i.id === intentId);
    
    if (!intent) {
      const fallbackResponses = this.knowledgeBase.fallback[language];
      const randomFallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      return randomFallback.replace('{name}', userName);
    }

    const responses = intent.responses[language];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    return randomResponse.replace('{name}', userName);
  }

  processMessage(message: string, userName: string = 'User'): ChatbotResponse {
    if (this.checkSecurityBoundary(message)) {
      const language = this.detectLanguage(message);
      const securityResponse = language === 'en' 
        ? "I cannot provide information about internal systems or technical infrastructure. For other questions, I'm happy to help!"
        : "Main internal systems ya technical infrastructure ke baare mein information nahi de sakta. Dusre sawalon ke liye, main khushi se madad karunga!";
      
      return {
        response: securityResponse,
        language,
        intent: 'security_blocked'
      };
    }

    const language = this.detectLanguage(message);
    const intentId = this.findIntent(message, language);

    if (intentId) {
      return {
        response: this.generateResponse(intentId, language, userName),
        language,
        intent: intentId
      };
    }

    const fallbackResponses = this.knowledgeBase.fallback[language];
    const randomFallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    
    return {
      response: randomFallback.replace('{name}', userName),
      language,
      intent: 'fallback'
    };
  }

  getKnowledgeBaseVersion(): string {
    return this.knowledgeBase.metadata.version;
  }

  getLastUpdated(): string {
    return this.knowledgeBase.metadata.lastUpdated;
  }
}

export const chatbotService = new ChatbotService();
