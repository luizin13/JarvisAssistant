import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  isBot: boolean("is_bot").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  userId: true,
  content: true,
  isBot: true,
});

// Business stats (could be transport or farm related)
export const businessStats = pgTable("business_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  category: text("category").notNull(), // "transport" or "farm"
  name: text("name").notNull(),
  value: text("value").notNull(),
  change: text("change"),
  changeType: text("change_type"), // "increase", "decrease" or null
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertBusinessStatSchema = createInsertSchema(businessStats).pick({
  userId: true,
  category: true,
  name: true,
  value: true,
  change: true,
  changeType: true,
  icon: true,
  color: true,
});

// Credit opportunities
export const creditOpportunities = pgTable("credit_opportunities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  institution: text("institution").notNull(),
  amount: text("amount"),
  interestRate: text("interest_rate"),
  term: text("term"),
  category: text("category").notNull(), // "farm", "transport"
  icon: text("icon").notNull(),
  color: text("color").notNull(),
});

export const insertCreditOpportunitySchema = createInsertSchema(creditOpportunities).pick({
  title: true,
  description: true,
  institution: true,
  amount: true,
  interestRate: true,
  term: true,
  category: true,
  icon: true,
  color: true,
});

// Meta ads
export const metaAds = pgTable("meta_ads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  company: text("company").notNull(),
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull(), // "farm", "transport", "other"
  contactUrl: text("contact_url"),
});

export const insertMetaAdSchema = createInsertSchema(metaAds).pick({
  title: true,
  description: true,
  company: true,
  imageUrl: true,
  category: true,
  contactUrl: true,
});

// Business suggestions
export const businessSuggestions = pgTable("business_suggestions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // "farm", "transport", "general"
  tags: text("tags").array().notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
});

export const insertBusinessSuggestionSchema = createInsertSchema(businessSuggestions).pick({
  title: true,
  description: true,
  category: true,
  tags: true,
  icon: true,
  color: true,
});

// News articles
export const newsArticles = pgTable("news_articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(), // Renomeado de summary para content
  source: text("source").notNull(),
  category: text("category").notNull(), // Expandido: "transport", "farm", "tech", "ai", "economy", "sustainability", "consumer", "policy", "education"
  imageUrl: text("image_url"),
  publishedAt: timestamp("published_at").notNull(),
  url: text("url").notNull(),
  relevance: integer("relevance").default(50), // Score de 0-100 para relevância
  sentiment: text("sentiment").default("neutral"), // positive, negative, neutral
  keywords: text("keywords"), // Palavras-chave separadas por vírgula
  businessImpact: text("business_impact"), // Breve análise do impacto nos negócios
});

export const insertNewsArticleSchema = createInsertSchema(newsArticles).pick({
  title: true,
  content: true,
  source: true,
  category: true,
  imageUrl: true,
  publishedAt: true,
  url: true,
  relevance: true,
  sentiment: true,
  keywords: true,
  businessImpact: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type BusinessStat = typeof businessStats.$inferSelect;
export type InsertBusinessStat = z.infer<typeof insertBusinessStatSchema>;

export type CreditOpportunity = typeof creditOpportunities.$inferSelect;
export type InsertCreditOpportunity = z.infer<typeof insertCreditOpportunitySchema>;

export type MetaAd = typeof metaAds.$inferSelect;
export type InsertMetaAd = z.infer<typeof insertMetaAdSchema>;

export type BusinessSuggestion = typeof businessSuggestions.$inferSelect;
export type InsertBusinessSuggestion = z.infer<typeof insertBusinessSuggestionSchema>;

export type NewsArticle = typeof newsArticles.$inferSelect;
export type InsertNewsArticle = z.infer<typeof insertNewsArticleSchema>;

// Modelo para registro de decisões estratégicas
export const strategicDecisions = pgTable("strategic_decisions", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  context: text("context").notNull(),
  result: text("result"),
  learning: text("learning"),
  impact_level: text("impact_level").notNull().default("médio"), // baixo, médio, alto, crítico
  strategic_area: text("strategic_area").notNull().default("geral"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  user_id: integer("user_id").references(() => users.id),
  agent_id: text("agent_id"),
});

export const insertStrategicDecisionSchema = createInsertSchema(strategicDecisions).omit({
  id: true,
  created_at: true,
});

export type StrategicDecision = typeof strategicDecisions.$inferSelect;
export type InsertStrategicDecision = z.infer<typeof insertStrategicDecisionSchema>;

// Modelo estendido para tarefas com impacto estratégico e ROI estimado
export const enhancedTasks = pgTable("enhanced_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  state: text("state").notNull().default("pendente"), // pendente, em_andamento, concluida, falha
  priority: text("priority").notNull().default("normal"), // baixa, normal, alta, crítica
  strategic_impact: text("strategic_impact"),
  estimated_roi: text("estimated_roi"),
  impact_areas: text("impact_areas").array(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at"),
  agent_id: text("agent_id"),
  assigned_to: integer("assigned_to").references(() => users.id),
});

export const insertEnhancedTaskSchema = createInsertSchema(enhancedTasks).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type EnhancedTask = typeof enhancedTasks.$inferSelect;
export type InsertEnhancedTask = z.infer<typeof insertEnhancedTaskSchema>;
