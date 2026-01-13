/**
 * Advanced AI Chatbot Service for Thorx
 * Production-grade chatbot with semantic understanding, conversation memory,
 * hybrid intent detection, and human-like response generation.
 * Fully self-contained - no external AI APIs required.
 */

import knowledgeBase from './knowledge-base.json';
import { 
  TextProcessor, 
  TFIDFEngine, 
  FuzzyMatcher, 
  NGramGenerator,
  SentimentAnalyzer,
  textProcessor,
  fuzzyMatcher,
  ngramGenerator,
  sentimentAnalyzer
} from './nlp-utils';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'support';
  timestamp: string;
  language: 'en' | 'ur';
  intent?: string;
  confidence?: number;
  sentiment?: string;
}

export interface ChatbotResponse {
  response: string;
  language: 'en' | 'ur';
  intent: string;
  confidence: number;
  sentiment?: string;
  suggestedActions?: string[];
  isEscalation?: boolean;
}

export interface ConversationContext {
  userId: string;
  sessionId: string;
  language: 'en' | 'ur';
  turns: Array<{ role: 'user' | 'bot'; message: string; intent?: string; timestamp: number }>;
  lastIntent?: string;
  userTraits: {
    preferredLanguage?: 'en' | 'ur';
    sentiment: number;
    topicsAsked: string[];
    questionsCount: number;
  };
  createdAt: number;
  updatedAt: number;
}

interface Intent {
  id: string;
  patterns: { en: string[]; ur: string[] };
  responses: { en: string[]; ur: string[] };
  priority?: number;
  followUp?: string[];
  keywords?: string[];
}

interface KnowledgeBaseType {
  metadata: { version: string; lastUpdated: string; language: string[] };
  intents: Intent[];
  fallback: { en: string[]; ur: string[] };
  security_blocked_topics: string[];
}

const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.75,
  MEDIUM: 0.5,
  LOW: 0.3,
  MINIMUM: 0.15
};

const MAX_CONTEXT_TURNS = 10;
const RESPONSE_PERSONALITY = {
  greetingPrefixes: {
    en: ['Hi', 'Hello', 'Hey there', 'Greetings'],
    ur: ['Assalam o Alaikum', 'Salam', 'Hello']
  },
  transitionPhrases: {
    en: ['Sure!', 'Absolutely!', 'Of course!', 'Great question!', 'I can help with that.', 'Let me explain.'],
    ur: ['Bilkul!', 'Zaroor!', 'Main aapki madad karta hoon.', 'Acha sawaal hai!', 'Main samjhata hoon.']
  },
  closingPhrases: {
    en: ['Is there anything else I can help you with?', 'Feel free to ask if you have more questions!', 'Let me know if you need anything else.'],
    ur: ['Kya aur kuch madad chahiye?', 'Agar koi aur sawaal ho to zaroor poochein!', 'Batayein agar aur kuch chahiye.']
  }
};

export class AdvancedChatbotService {
  private knowledgeBase: KnowledgeBaseType;
  private tfidfEngine: TFIDFEngine;
  private textProcessor: TextProcessor;
  private fuzzyMatcher: FuzzyMatcher;
  private ngramGenerator: NGramGenerator;
  private sentimentAnalyzer: SentimentAnalyzer;
  private conversationContexts: Map<string, ConversationContext> = new Map();
  private intentIndex: Map<string, Intent> = new Map();
  private allPatterns: { id: string; pattern: string; language: 'en' | 'ur' }[] = [];
  private initialized = false;

  constructor() {
    this.knowledgeBase = knowledgeBase as KnowledgeBaseType;
    this.tfidfEngine = new TFIDFEngine();
    this.textProcessor = new TextProcessor();
    this.fuzzyMatcher = new FuzzyMatcher();
    this.ngramGenerator = new NGramGenerator();
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.initializeEngine();
  }

  private initializeEngine(): void {
    if (this.initialized) return;

    for (const intent of this.knowledgeBase.intents) {
      this.intentIndex.set(intent.id, intent);

      for (const lang of ['en', 'ur'] as const) {
        const patterns = intent.patterns[lang];
        for (const pattern of patterns) {
          this.allPatterns.push({ id: intent.id, pattern: pattern.toLowerCase(), language: lang });
          
          this.tfidfEngine.addDocument(
            `${intent.id}_${lang}_${pattern}`,
            pattern,
            lang
          );
        }

        for (const response of intent.responses[lang]) {
          this.tfidfEngine.addDocument(
            `${intent.id}_${lang}_resp_${response.slice(0, 20)}`,
            response,
            lang
          );
        }
      }
    }

    this.initialized = true;
  }

  private getOrCreateContext(userId: string, sessionId: string): ConversationContext {
    const key = `${userId}_${sessionId}`;
    
    if (!this.conversationContexts.has(key)) {
      this.conversationContexts.set(key, {
        userId,
        sessionId,
        language: 'en',
        turns: [],
        userTraits: {
          sentiment: 0,
          topicsAsked: [],
          questionsCount: 0
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    return this.conversationContexts.get(key)!;
  }

  private updateContext(
    context: ConversationContext, 
    role: 'user' | 'bot', 
    message: string, 
    intent?: string
  ): void {
    context.turns.push({
      role,
      message,
      intent,
      timestamp: Date.now()
    });

    if (context.turns.length > MAX_CONTEXT_TURNS) {
      context.turns = context.turns.slice(-MAX_CONTEXT_TURNS);
    }

    if (intent && role === 'user') {
      context.lastIntent = intent;
      if (!context.userTraits.topicsAsked.includes(intent)) {
        context.userTraits.topicsAsked.push(intent);
      }
      context.userTraits.questionsCount++;
    }

    context.updatedAt = Date.now();
  }

  private checkSecurityBoundary(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    for (const topic of this.knowledgeBase.security_blocked_topics) {
      if (lowerMessage.includes(topic.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }

  private detectIntent(message: string, language: 'en' | 'ur', context: ConversationContext): {
    intentId: string | null;
    confidence: number;
    method: 'exact' | 'fuzzy' | 'semantic' | 'ngram' | 'context' | 'none';
  } {
    const lowerMessage = message.toLowerCase().trim();
    const langPatterns = this.allPatterns.filter(p => p.language === language);

    for (const { id, pattern } of langPatterns) {
      if (lowerMessage.includes(pattern) || pattern.includes(lowerMessage)) {
        return { intentId: id, confidence: 1.0, method: 'exact' };
      }
    }

    let bestFuzzyMatch: { intentId: string; score: number } | null = null;
    for (const { id, pattern } of langPatterns) {
      const score = this.fuzzyMatcher.similarity(lowerMessage, pattern);
      if (score >= 0.7 && (!bestFuzzyMatch || score > bestFuzzyMatch.score)) {
        bestFuzzyMatch = { intentId: id, score };
      }
    }
    if (bestFuzzyMatch) {
      return { intentId: bestFuzzyMatch.intentId, confidence: bestFuzzyMatch.score, method: 'fuzzy' };
    }

    let bestNgramMatch: { intentId: string; score: number } | null = null;
    for (const { id, pattern } of langPatterns) {
      const score = this.ngramGenerator.ngramSimilarity(lowerMessage, pattern, 3);
      if (score >= 0.5 && (!bestNgramMatch || score > bestNgramMatch.score)) {
        bestNgramMatch = { intentId: id, score };
      }
    }
    if (bestNgramMatch && bestNgramMatch.score >= 0.6) {
      return { intentId: bestNgramMatch.intentId, confidence: bestNgramMatch.score, method: 'ngram' };
    }

    const semanticMatch = this.tfidfEngine.getBestMatch(message, language);
    if (semanticMatch && semanticMatch.score >= CONFIDENCE_THRESHOLDS.LOW) {
      const intentId = semanticMatch.id.split('_')[0];
      if (this.intentIndex.has(intentId)) {
        return { intentId, confidence: Math.min(semanticMatch.score * 1.2, 0.95), method: 'semantic' };
      }
    }

    if (context.lastIntent && context.turns.length > 0) {
      const lastIntent = this.intentIndex.get(context.lastIntent);
      if (lastIntent?.followUp) {
        for (const followUpIntentId of lastIntent.followUp) {
          const followUpIntent = this.intentIndex.get(followUpIntentId);
          if (followUpIntent) {
            const patterns = followUpIntent.patterns[language];
            for (const pattern of patterns) {
              if (this.fuzzyMatcher.similarity(lowerMessage, pattern.toLowerCase()) >= 0.5) {
                return { intentId: followUpIntentId, confidence: 0.7, method: 'context' };
              }
            }
          }
        }
      }
    }

    return { intentId: null, confidence: 0, method: 'none' };
  }

  private generateResponse(
    intentId: string, 
    language: 'en' | 'ur', 
    userName: string, 
    context: ConversationContext,
    confidence: number
  ): string {
    const intent = this.intentIndex.get(intentId);
    if (!intent) {
      return this.generateFallbackResponse(language, userName, context);
    }

    const responses = intent.responses[language];
    const randomIndex = Math.floor(Math.random() * responses.length);
    let response = responses[randomIndex];

    response = response.replace(/{name}/g, userName);

    if (context.userTraits.questionsCount === 0 && confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
      const greetings = RESPONSE_PERSONALITY.greetingPrefixes[language];
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      if (!response.toLowerCase().startsWith('hi') && 
          !response.toLowerCase().startsWith('hello') &&
          !response.toLowerCase().includes('salam')) {
        response = `${greeting} ${userName}! ${response}`;
      }
    }

    if (confidence >= CONFIDENCE_THRESHOLDS.HIGH && Math.random() > 0.6) {
      const transitions = RESPONSE_PERSONALITY.transitionPhrases[language];
      const transition = transitions[Math.floor(Math.random() * transitions.length)];
      if (!response.startsWith(transition)) {
        response = `${transition} ${response}`;
      }
    }

    if (context.userTraits.questionsCount <= 2 && Math.random() > 0.7) {
      const closings = RESPONSE_PERSONALITY.closingPhrases[language];
      const closing = closings[Math.floor(Math.random() * closings.length)];
      response = `${response} ${closing}`;
    }

    return response;
  }

  private generateFallbackResponse(
    language: 'en' | 'ur', 
    userName: string, 
    context: ConversationContext
  ): string {
    const fallbacks = this.knowledgeBase.fallback[language];
    const randomIndex = Math.floor(Math.random() * fallbacks.length);
    let response = fallbacks[randomIndex];

    response = response.replace(/{name}/g, userName);

    if (context.userTraits.topicsAsked.length > 0) {
      const lastTopic = context.userTraits.topicsAsked[context.userTraits.topicsAsked.length - 1];
      const relatedSuggestion = this.findRelatedTopic(lastTopic, language);
      if (relatedSuggestion) {
        const suggestion = language === 'en' 
          ? ` Maybe you'd like to know about ${relatedSuggestion}?`
          : ` Shayad aap ${relatedSuggestion} ke baare mein jaanna chahein?`;
        response = response + suggestion;
      }
    }

    return response;
  }

  private findRelatedTopic(currentIntentId: string, language: 'en' | 'ur'): string | null {
    const relatedTopics: Record<string, string[]> = {
      'how_to_earn': ['referral_system', 'video_players', 'daily_tasks'],
      'referral_system': ['how_to_earn', 'withdrawal'],
      'withdrawal': ['payment_methods', 'daily_tasks'],
      'registration': ['login', 'what_is_thorx'],
      'login': ['security', 'registration'],
      'video_players': ['how_to_earn', 'daily_tasks'],
      'daily_tasks': ['user_levels', 'withdrawal'],
      'user_levels': ['daily_tasks', 'how_to_earn'],
      'account_balance': ['withdrawal', 'how_to_earn'],
      'payment_methods': ['withdrawal', 'account_balance']
    };

    const related = relatedTopics[currentIntentId];
    if (!related || related.length === 0) return null;

    const randomRelated = related[Math.floor(Math.random() * related.length)];
    const intent = this.intentIndex.get(randomRelated);
    
    if (intent) {
      const patterns = intent.patterns[language];
      return patterns[0];
    }

    return null;
  }

  private getSuggestedActions(intentId: string, language: 'en' | 'ur'): string[] {
    const actionSuggestions: Record<string, { en: string[]; ur: string[] }> = {
      'how_to_earn': {
        en: ['Go to Work section', 'Check your referral code', 'View daily tasks'],
        ur: ['Work section mein jayen', 'Apna referral code dekhein', 'Daily tasks dekhein']
      },
      'referral_system': {
        en: ['Share your code', 'Check referral earnings', 'Invite friends'],
        ur: ['Apna code share karein', 'Referral earnings dekhein', 'Doston ko invite karein']
      },
      'withdrawal': {
        en: ['Go to Payout section', 'Complete daily tasks first', 'Add payment method'],
        ur: ['Payout section mein jayen', 'Pehle daily tasks karein', 'Payment method add karein']
      },
      'registration': {
        en: ['Enter your details', 'Verify email OTP', 'Start earning'],
        ur: ['Apni details daalein', 'Email OTP verify karein', 'Kamana shuru karein']
      },
      'login': {
        en: ['Enter credentials', 'Check email for OTP', 'Contact support if stuck'],
        ur: ['Credentials daalein', 'Email mein OTP dekhein', 'Mushkil ho to support se rabta karein']
      }
    };

    return actionSuggestions[intentId]?.[language] || [];
  }

  public processMessage(
    message: string, 
    userName: string = 'User',
    userId: string = 'anonymous',
    sessionId: string = 'default'
  ): ChatbotResponse {
    const context = this.getOrCreateContext(userId, sessionId);
    const language = this.textProcessor.detectLanguage(message);
    context.language = language;

    if (context.userTraits.preferredLanguage === undefined) {
      context.userTraits.preferredLanguage = language;
    }

    this.updateContext(context, 'user', message);

    if (this.checkSecurityBoundary(message)) {
      const securityResponse = language === 'en' 
        ? `I understand you're curious, ${userName}, but I cannot provide information about internal systems, technical infrastructure, or confidential details. I'm here to help you with everything about using Thorx - earning, referrals, payouts, and more! What would you like to know?`
        : `${userName}, main samajhta hoon aap curious hain, lekin main internal systems, technical infrastructure, ya confidential details ke baare mein information nahi de sakta. Main aapki Thorx use karne mein madad karne ke liye hoon - earning, referrals, payouts, aur bahut kuch! Aap kya jaanna chahenge?`;
      
      return {
        response: securityResponse,
        language,
        intent: 'security_blocked',
        confidence: 1.0,
        sentiment: 'neutral',
        isEscalation: false
      };
    }

    const sentiment = this.sentimentAnalyzer.analyze(message);
    context.userTraits.sentiment = (context.userTraits.sentiment + sentiment.score) / 2;

    const { intentId, confidence, method } = this.detectIntent(message, language, context);

    let response: string;
    let suggestedActions: string[] = [];
    let isEscalation = false;

    if (intentId && confidence >= CONFIDENCE_THRESHOLDS.MINIMUM) {
      response = this.generateResponse(intentId, language, userName, context, confidence);
      suggestedActions = this.getSuggestedActions(intentId, language);
      
      this.updateContext(context, 'bot', response, intentId);
    } else {
      response = this.generateFallbackResponse(language, userName, context);
      
      if (context.turns.filter(t => t.intent === 'fallback' || !t.intent).length >= 3) {
        isEscalation = true;
        const escalationNote = language === 'en'
          ? " If you're not finding the answers you need, please visit the Contact section in Help to message our support team directly - they'll be happy to assist you!"
          : " Agar aapko jo jawab chahiye wo nahi mil rahe, please Help mein Contact section mein jakar hamari support team ko seedha message karein - wo khushi se aapki madad karenge!";
        response = response + escalationNote;
      }
      
      this.updateContext(context, 'bot', response, 'fallback');
    }

    if (sentiment.label === 'negative' && !isEscalation) {
      const empathyPrefix = language === 'en'
        ? "I understand this might be frustrating. "
        : "Main samajhta hoon yeh mushkil ho sakta hai. ";
      
      if (!response.toLowerCase().includes('understand') && !response.toLowerCase().includes('samajh')) {
        response = empathyPrefix + response;
      }
    }

    return {
      response,
      language,
      intent: intentId || 'fallback',
      confidence: Math.round(confidence * 100) / 100,
      sentiment: sentiment.label,
      suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
      isEscalation
    };
  }

  public getConversationHistory(userId: string, sessionId: string): Array<{
    role: 'user' | 'bot';
    message: string;
    timestamp: number;
  }> {
    const context = this.conversationContexts.get(`${userId}_${sessionId}`);
    return context?.turns || [];
  }

  public clearConversation(userId: string, sessionId: string): void {
    this.conversationContexts.delete(`${userId}_${sessionId}`);
  }

  public getKnowledgeBaseVersion(): string {
    return this.knowledgeBase.metadata.version;
  }

  public getLastUpdated(): string {
    return this.knowledgeBase.metadata.lastUpdated;
  }

  public getStats(): {
    totalIntents: number;
    totalPatterns: number;
    activeConversations: number;
    version: string;
  } {
    return {
      totalIntents: this.knowledgeBase.intents.length,
      totalPatterns: this.allPatterns.length,
      activeConversations: this.conversationContexts.size,
      version: this.knowledgeBase.metadata.version
    };
  }
}

export const advancedChatbotService = new AdvancedChatbotService();
