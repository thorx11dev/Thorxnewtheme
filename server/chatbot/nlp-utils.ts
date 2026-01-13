/**
 * Advanced NLP Utilities for Thorx Chatbot
 * Implements TF-IDF, Cosine Similarity, Fuzzy Matching, and Text Processing
 * No external AI APIs - fully self-contained
 */

export interface TokenizedDocument {
  id: string;
  tokens: string[];
  original: string;
  language: 'en' | 'ur';
}

export interface SimilarityResult {
  id: string;
  score: number;
  document: string;
}

export interface TFIDFVector {
  [term: string]: number;
}

/**
 * Text preprocessing and tokenization
 */
export class TextProcessor {
  private readonly englishStopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'for', 'on', 'with',
    'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once',
    'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 's', 't', 'just', 'now', 'i', 'me', 'my', 'myself',
    'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'he',
    'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself',
    'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom',
    'this', 'that', 'these', 'those', 'am', 'about', 'against', 'because', 'both',
    'if', 'over', 'while', 'any', 'out', 'up', 'down', 'off', 'until', 'also'
  ]);

  private readonly urduStopWords = new Set([
    'ka', 'ki', 'ke', 'ko', 'se', 'mein', 'hai', 'hain', 'ho', 'tha', 'thi', 'the',
    'aur', 'ya', 'lekin', 'magar', 'par', 'per', 'jo', 'jab', 'kab', 'kaise',
    'kya', 'kaun', 'kahan', 'yeh', 'woh', 'is', 'us', 'in', 'un', 'apna', 'apni',
    'apne', 'hum', 'ham', 'tum', 'aap', 'main', 'wo', 'ye', 'ek', 'do', 'teen',
    'bhi', 'hi', 'to', 'na', 'nahi', 'nahin', 'ab', 'phir', 'fir', 'tak', 'tak',
    'saath', 'sath', 'liye', 'lye', 'wala', 'wali', 'wale'
  ]);

  /**
   * Normalize and clean text
   */
  normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Tokenize text into words
   */
  tokenize(text: string): string[] {
    const normalized = this.normalize(text);
    return normalized.split(/\s+/).filter(token => token.length > 1);
  }

  /**
   * Remove stop words based on language
   */
  removeStopWords(tokens: string[], language: 'en' | 'ur'): string[] {
    const stopWords = language === 'en' ? this.englishStopWords : this.urduStopWords;
    return tokens.filter(token => !stopWords.has(token.toLowerCase()));
  }

  /**
   * Simple stemming (suffix removal)
   */
  stem(word: string, language: 'en' | 'ur'): string {
    if (language === 'en') {
      return this.englishStem(word);
    }
    return this.urduStem(word);
  }

  private englishStem(word: string): string {
    const suffixes = ['ing', 'ed', 'ly', 'es', 's', 'ness', 'ment', 'tion', 'sion', 'ity', 'ful', 'less', 'able', 'ible'];
    for (const suffix of suffixes) {
      if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
        return word.slice(0, -suffix.length);
      }
    }
    return word;
  }

  private urduStem(word: string): string {
    const suffixes = ['ein', 'en', 'on', 'an', 'ain', 'wala', 'wali', 'wale', 'kar', 'karna', 'karo', 'karein'];
    for (const suffix of suffixes) {
      if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
        return word.slice(0, -suffix.length);
      }
    }
    return word;
  }

  /**
   * Full preprocessing pipeline
   */
  preprocess(text: string, language: 'en' | 'ur'): string[] {
    const tokens = this.tokenize(text);
    const filtered = this.removeStopWords(tokens, language);
    return filtered.map(token => this.stem(token, language));
  }

  /**
   * Detect language from text
   */
  detectLanguage(text: string): 'en' | 'ur' {
    const urduPatterns = [
      /\b(kaise|kya|hai|hain|ka|ki|se|mein|aap|apka|apna|aapki|karna|karein|chahiye|chahie|hoon|ho|dekhen|dekhna|paise|kamai|zyada|jaldi|zaroor|bohot|bahut|abhi|phir|yahan|wahan|kar|karo|kare|thorx|batao|karo|batayen|samjhayen|bataye)\b/i,
      /[\u0600-\u06FF]/
    ];

    for (const pattern of urduPatterns) {
      if (pattern.test(text)) {
        return 'ur';
      }
    }

    return 'en';
  }
}

/**
 * TF-IDF Implementation for document similarity
 */
export class TFIDFEngine {
  private documents: TokenizedDocument[] = [];
  private idfCache: Map<string, number> = new Map();
  private tfidfVectors: Map<string, TFIDFVector> = new Map();
  private textProcessor: TextProcessor;

  constructor() {
    this.textProcessor = new TextProcessor();
  }

  /**
   * Add a document to the corpus
   */
  addDocument(id: string, text: string, language: 'en' | 'ur'): void {
    const tokens = this.textProcessor.preprocess(text, language);
    this.documents.push({
      id,
      tokens,
      original: text,
      language
    });
    this.invalidateCache();
  }

  /**
   * Add multiple documents at once
   */
  addDocuments(docs: Array<{ id: string; text: string; language: 'en' | 'ur' }>): void {
    for (const doc of docs) {
      const tokens = this.textProcessor.preprocess(doc.text, doc.language);
      this.documents.push({
        id: doc.id,
        tokens,
        original: doc.text,
        language: doc.language
      });
    }
    this.invalidateCache();
  }

  private invalidateCache(): void {
    this.idfCache.clear();
    this.tfidfVectors.clear();
  }

  /**
   * Calculate term frequency for a document
   */
  private calculateTF(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    const totalTerms = tokens.length;

    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    Array.from(tf.entries()).forEach(([term, count]) => {
      tf.set(term, count / totalTerms);
    });

    return tf;
  }

  /**
   * Calculate inverse document frequency for a term
   */
  private calculateIDF(term: string): number {
    if (this.idfCache.has(term)) {
      return this.idfCache.get(term)!;
    }

    const totalDocs = this.documents.length;
    let docsWithTerm = 0;

    for (const doc of this.documents) {
      if (doc.tokens.includes(term)) {
        docsWithTerm++;
      }
    }

    const idf = docsWithTerm > 0 
      ? Math.log((totalDocs + 1) / (docsWithTerm + 1)) + 1 
      : 0;
    
    this.idfCache.set(term, idf);
    return idf;
  }

  /**
   * Calculate TF-IDF vector for tokens
   */
  private calculateTFIDF(tokens: string[]): TFIDFVector {
    const tf = this.calculateTF(tokens);
    const tfidf: TFIDFVector = {};

    Array.from(tf.entries()).forEach(([term, tfValue]) => {
      const idf = this.calculateIDF(term);
      tfidf[term] = tfValue * idf;
    });

    return tfidf;
  }

  /**
   * Get or compute TF-IDF vector for a document
   */
  private getDocumentVector(docId: string): TFIDFVector {
    if (this.tfidfVectors.has(docId)) {
      return this.tfidfVectors.get(docId)!;
    }

    const doc = this.documents.find(d => d.id === docId);
    if (!doc) {
      return {};
    }

    const vector = this.calculateTFIDF(doc.tokens);
    this.tfidfVectors.set(docId, vector);
    return vector;
  }

  /**
   * Calculate cosine similarity between two TF-IDF vectors
   */
  private cosineSimilarity(vec1: TFIDFVector, vec2: TFIDFVector): number {
    const terms = [...Object.keys(vec1), ...Object.keys(vec2)];
    const uniqueTerms = Array.from(new Set(terms));
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (const term of uniqueTerms) {
      const v1 = vec1[term] || 0;
      const v2 = vec2[term] || 0;
      
      dotProduct += v1 * v2;
      magnitude1 += v1 * v1;
      magnitude2 += v2 * v2;
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Find most similar documents to a query
   */
  findSimilar(query: string, language: 'en' | 'ur', topK: number = 5, threshold: number = 0.1): SimilarityResult[] {
    const queryTokens = this.textProcessor.preprocess(query, language);
    const queryVector = this.calculateTFIDF(queryTokens);

    const results: SimilarityResult[] = [];

    for (const doc of this.documents) {
      if (doc.language !== language) continue;

      const docVector = this.getDocumentVector(doc.id);
      const similarity = this.cosineSimilarity(queryVector, docVector);

      if (similarity >= threshold) {
        results.push({
          id: doc.id,
          score: similarity,
          document: doc.original
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Get best match for a query
   */
  getBestMatch(query: string, language: 'en' | 'ur'): SimilarityResult | null {
    const results = this.findSimilar(query, language, 1, 0.05);
    return results.length > 0 ? results[0] : null;
  }
}

/**
 * Fuzzy String Matching using Levenshtein Distance
 */
export class FuzzyMatcher {
  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    if (m === 0) return n;
    if (n === 0) return m;

    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate similarity ratio (0-1)
   */
  similarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    const maxLen = Math.max(s1.length, s2.length);
    
    if (maxLen === 0) return 1;
    
    const distance = this.levenshteinDistance(s1, s2);
    return 1 - (distance / maxLen);
  }

  /**
   * Find best fuzzy match from a list of patterns
   */
  findBestMatch(query: string, patterns: string[], threshold: number = 0.6): { pattern: string; score: number } | null {
    let bestMatch: { pattern: string; score: number } | null = null;

    for (const pattern of patterns) {
      const score = this.similarity(query, pattern);
      
      if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { pattern, score };
      }
    }

    return bestMatch;
  }

  /**
   * Check if query contains any pattern (fuzzy)
   */
  containsFuzzy(query: string, patterns: string[], threshold: number = 0.7): { matched: boolean; pattern?: string; score?: number } {
    const words = query.toLowerCase().split(/\s+/);

    for (const pattern of patterns) {
      const patternWords = pattern.toLowerCase().split(/\s+/);
      
      if (query.toLowerCase().includes(pattern.toLowerCase())) {
        return { matched: true, pattern, score: 1.0 };
      }

      for (const word of words) {
        for (const patternWord of patternWords) {
          const score = this.similarity(word, patternWord);
          if (score >= threshold) {
            return { matched: true, pattern, score };
          }
        }
      }
    }

    return { matched: false };
  }
}

/**
 * N-gram generator for better text matching
 */
export class NGramGenerator {
  /**
   * Generate character n-grams
   */
  charNGrams(text: string, n: number): string[] {
    const ngrams: string[] = [];
    const cleaned = text.toLowerCase().replace(/\s+/g, ' ');
    
    for (let i = 0; i <= cleaned.length - n; i++) {
      ngrams.push(cleaned.slice(i, i + n));
    }
    
    return ngrams;
  }

  /**
   * Generate word n-grams
   */
  wordNGrams(tokens: string[], n: number): string[] {
    const ngrams: string[] = [];
    
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(' '));
    }
    
    return ngrams;
  }

  /**
   * Calculate n-gram similarity between two texts
   */
  ngramSimilarity(text1: string, text2: string, n: number = 2): number {
    const ngrams1 = new Set(this.charNGrams(text1, n));
    const ngrams2 = new Set(this.charNGrams(text2, n));

    if (ngrams1.size === 0 && ngrams2.size === 0) return 1;
    if (ngrams1.size === 0 || ngrams2.size === 0) return 0;

    let intersection = 0;
    Array.from(ngrams1).forEach(ngram => {
      if (ngrams2.has(ngram)) {
        intersection++;
      }
    });

    const union = ngrams1.size + ngrams2.size - intersection;
    return intersection / union;
  }
}

/**
 * Sentiment Analysis (basic lexicon-based)
 */
export class SentimentAnalyzer {
  private positiveWords = new Set([
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like',
    'best', 'helpful', 'thanks', 'thank', 'appreciate', 'happy', 'glad', 'perfect',
    'awesome', 'nice', 'beautiful', 'easy', 'quick', 'fast', 'reliable', 'useful',
    'acha', 'behtareen', 'zabardast', 'shukriya', 'shukria', 'khushi', 'maza', 'pyar'
  ]);

  private negativeWords = new Set([
    'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'worst', 'poor',
    'slow', 'broken', 'failed', 'error', 'problem', 'issue', 'frustrated', 'angry',
    'useless', 'difficult', 'hard', 'confusing', 'annoying', 'disappointed',
    'bura', 'kharab', 'mushkil', 'masla', 'ghalat', 'naraz', 'pareshani'
  ]);

  analyze(text: string): { score: number; label: 'positive' | 'negative' | 'neutral' } {
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (this.positiveWords.has(word)) positiveCount++;
      if (this.negativeWords.has(word)) negativeCount++;
    }

    const total = positiveCount + negativeCount;
    if (total === 0) {
      return { score: 0, label: 'neutral' };
    }

    const score = (positiveCount - negativeCount) / total;
    
    if (score > 0.2) return { score, label: 'positive' };
    if (score < -0.2) return { score, label: 'negative' };
    return { score, label: 'neutral' };
  }
}

export const textProcessor = new TextProcessor();
export const tfidfEngine = new TFIDFEngine();
export const fuzzyMatcher = new FuzzyMatcher();
export const ngramGenerator = new NGramGenerator();
export const sentimentAnalyzer = new SentimentAnalyzer();
