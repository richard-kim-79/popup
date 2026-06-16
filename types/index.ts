// ============================================================
// Leaf — Core Type Definitions
// ============================================================

// --- Block Types ---

export type BlockType = 'h1' | 'h2' | 'text' | 'image' | 'button' | 'divider' | 'youtube' | 'link'

export interface BaseBlock {
  id: string
  type: BlockType
}

export interface TextBlock extends BaseBlock {
  type: 'h1' | 'h2' | 'text'
  content: string
}

export type ImageWidth = 'small' | 'medium' | 'full'

export type MediaType = 'image' | 'video' | 'pdf'

export interface ImageBlock extends BaseBlock {
  type: 'image'
  url?: string         // Supabase Storage public URL
  filename?: string    // 원본 파일명 (한글/영문 포함)
  width?: ImageWidth   // 크기 프리셋 (기본: 'full')
  caption?: string
  mediaType?: MediaType  // 미디어 종류 (미설정 시 확장자로 판별)
}

export interface ButtonBlock extends BaseBlock {
  type: 'button'
  label: string
  href?: string
  color?: string   // hex — 버튼 배경색 (미지정 시 accent 그린)
}

export interface DividerBlock extends BaseBlock {
  type: 'divider'
}

export interface YoutubeBlock extends BaseBlock {
  type: 'youtube'
  url?: string      // YouTube URL
  videoId?: string  // 추출된 video ID
  width?: ImageWidth
}

export type SocialEmbedType = 'twitter' | 'instagram' | 'tiktok'

export interface LinkBlock extends BaseBlock {
  type: 'link'
  url?: string
  title?: string
  description?: string
  favicon?: string
  image?: string
  width?: ImageWidth
  embedType?: SocialEmbedType
  embedId?: string
}

export type Block = TextBlock | ImageBlock | ButtonBlock | DividerBlock | YoutubeBlock | LinkBlock

// --- Page ---

export interface Page {
  id: string
  slug: string
  blocks: Block[]
  html_content: string | null  // raw HTML 페이지 (null이면 블록 페이지)
  locked: boolean
  expires_at: string   // ISO 8601
  delete_at: string
  view_count: number
  user_id: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

// --- Payment ---

export type Plan = 'month' | 'year'
export type PaymentStatus = 'pending' | 'done' | 'failed' | 'canceled'

export interface Payment {
  id: string
  page_id: string
  user_id: string | null
  order_id: string
  payment_key: string | null
  amount: number
  plan: Plan
  status: PaymentStatus
  extended_until: string | null
  paid_at: string | null
  created_at: string
}

// --- Subscription ---

export type SubscriptionTier = 'lite' | 'pro'
export type SubscriptionBillingCycle = 'monthly' | 'yearly'
export type SubscriptionStatusValue = 'active' | 'past_due' | 'canceled' | 'paused'

export interface Subscription {
  id: string
  user_id: string
  tier: SubscriptionTier
  billing_cycle: SubscriptionBillingCycle
  status: SubscriptionStatusValue
  billing_key: string
  customer_key: string
  card_company: string | null
  card_number_masked: string | null
  current_period_start: string
  current_period_end: string
  next_charge_at: string
  cancel_at_period_end: boolean
  canceled_at: string | null
  failed_charge_count: number
  created_at: string
  updated_at: string
}

// --- Report ---

export type ReportReason = 'illegal' | 'spam' | 'adult' | 'other'

export interface Report {
  id: string
  page_id: string
  reason: ReportReason
  detail: string | null
  ip_hash: string
  created_at: string
}

// --- API Response shapes ---

export interface CreatePageResponse {
  slug: string
  editToken: string
}

export interface PageResponse {
  blocks: Block[]
  htmlContent?: string | null  // raw HTML 페이지인 경우
  locked: boolean
  expiresAt: string
  viewCount: number
  daysLeft: number
}

export interface VerifyPinResponse {
  editToken: string
}

export interface UploadResponse {
  signedUrl: string
  publicUrl: string
  filename: string
}

export interface ApiError {
  error: string
}

// --- API Key ---

export type ApiKeyScope =
  | 'pages:create'
  | 'pages:read'
  | 'pages:update'
  | 'pages:delete'
  | 'uploads:create'

export interface ApiKey {
  id: string
  prefix: string
  name: string
  scopes: ApiKeyScope[]
  rate_limit: number
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
  expires_at: string | null
}

// --- Supabase Database types ---
// Format matches Supabase JS v2 generated type schema.
// Full types: supabase gen types typescript --project-id <id>

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      pages: {
        Row: {
          id: string
          slug: string
          blocks: Json
          pin_hash: string
          expires_at: string
          delete_at: string
          locked: boolean
          user_id: string | null
          view_count: number
          deleted_at: string | null
          report_count: number
          api_key_id: string | null
          created_at: string
          updated_at: string
          listed: boolean
          listing_title: string | null
          listing_description: string | null
          listed_at: string | null
          search_vector: string | null
          html_content: string | null
          size_bytes: number
          source: string | null
          auto_listed: boolean
          gallery_opt_out: boolean
        }
        Insert: {
          id?: string
          slug: string
          blocks?: Json
          html_content?: string | null
          pin_hash: string
          expires_at: string
          delete_at: string
          locked?: boolean
          user_id?: string | null
          view_count?: number
          deleted_at?: string | null
          report_count?: number
          api_key_id?: string | null
          created_at?: string
          updated_at?: string
          listed?: boolean
          listing_title?: string | null
          listing_description?: string | null
          listed_at?: string | null
          search_vector?: string | null
          size_bytes?: number
          source?: string | null
          auto_listed?: boolean
          gallery_opt_out?: boolean
        }
        Update: {
          id?: string
          slug?: string
          blocks?: Json
          html_content?: string | null
          pin_hash?: string
          expires_at?: string
          delete_at?: string
          locked?: boolean
          user_id?: string | null
          view_count?: number
          deleted_at?: string | null
          report_count?: number
          api_key_id?: string | null
          created_at?: string
          updated_at?: string
          listed?: boolean
          listing_title?: string | null
          listing_description?: string | null
          listed_at?: string | null
          search_vector?: string | null
          size_bytes?: number
          source?: string | null
          auto_listed?: boolean
          gallery_opt_out?: boolean
        }
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          page_id: string
          reason: string
          detail: string | null
          ip_hash: string
          created_at: string
        }
        Insert: {
          id?: string
          page_id: string
          reason: string
          detail?: string | null
          ip_hash: string
          created_at?: string
        }
        Update: {
          id?: string
          page_id?: string
          reason?: string
          detail?: string | null
          ip_hash?: string
          created_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          page_id: string
          user_id: string | null
          order_id: string
          payment_key: string | null
          amount: number
          plan: string
          status: string
          extended_until: string | null
          paid_at: string | null
          customer_email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          page_id: string
          user_id?: string | null
          order_id: string
          payment_key?: string | null
          amount: number
          plan: string
          status?: string
          extended_until?: string | null
          paid_at?: string | null
          customer_email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          page_id?: string
          user_id?: string | null
          order_id?: string
          payment_key?: string | null
          amount?: number
          plan?: string
          status?: string
          extended_until?: string | null
          paid_at?: string | null
          customer_email?: string | null
          created_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          tier: string
          billing_cycle: string
          status: string
          billing_key: string
          customer_key: string
          card_company: string | null
          card_number_masked: string | null
          current_period_start: string
          current_period_end: string
          next_charge_at: string
          cancel_at_period_end: boolean
          canceled_at: string | null
          failed_charge_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier: string
          billing_cycle: string
          status: string
          billing_key: string
          customer_key: string
          card_company?: string | null
          card_number_masked?: string | null
          current_period_start: string
          current_period_end: string
          next_charge_at: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          failed_charge_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier?: string
          billing_cycle?: string
          status?: string
          billing_key?: string
          customer_key?: string
          card_company?: string | null
          card_number_masked?: string | null
          current_period_start?: string
          current_period_end?: string
          next_charge_at?: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          failed_charge_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      subscription_charges: {
        Row: {
          id: string
          subscription_id: string
          order_id: string
          amount: number
          status: string
          payment_key: string | null
          error_code: string | null
          error_message: string | null
          attempted_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          order_id: string
          amount: number
          status: string
          payment_key?: string | null
          error_code?: string | null
          error_message?: string | null
          attempted_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          order_id?: string
          amount?: number
          status?: string
          payment_key?: string | null
          error_code?: string | null
          error_message?: string | null
          attempted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscription_charges_subscription_id_fkey'
            columns: ['subscription_id']
            referencedRelation: 'subscriptions'
            referencedColumns: ['id']
          }
        ]
      }
      page_emails: {
        Row: {
          id: string
          page_id: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          page_id: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          page_id?: string
          email?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'page_emails_page_id_fkey'
            columns: ['page_id']
            referencedRelation: 'pages'
            referencedColumns: ['id']
          }
        ]
      }
      api_keys: {
        Row: {
          id: string
          key_hash: string
          prefix: string
          name: string
          scopes: string[]
          rate_limit: number
          created_at: string
          last_used_at: string | null
          revoked_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          key_hash: string
          prefix: string
          name?: string
          scopes?: string[]
          rate_limit?: number
          created_at?: string
          last_used_at?: string | null
          revoked_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          key_hash?: string
          prefix?: string
          name?: string
          scopes?: string[]
          rate_limit?: number
          created_at?: string
          last_used_at?: string | null
          revoked_at?: string | null
          expires_at?: string | null
        }
        Relationships: []
      }
      api_key_pages: {
        Row: {
          api_key_id: string
          page_id: string
          created_at: string
        }
        Insert: {
          api_key_id: string
          page_id: string
          created_at?: string
        }
        Update: {
          api_key_id?: string
          page_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'api_key_pages_api_key_id_fkey'
            columns: ['api_key_id']
            referencedRelation: 'api_keys'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'api_key_pages_page_id_fkey'
            columns: ['page_id']
            referencedRelation: 'pages'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
