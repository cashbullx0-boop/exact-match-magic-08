export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          title: string
          xp_reward: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          title: string
          xp_reward?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      banned_documents: {
        Row: {
          banned_at: string
          email: string | null
          id: string
          id_number: string | null
          phone: string | null
          reason: string
          user_id: string
        }
        Insert: {
          banned_at?: string
          email?: string | null
          id?: string
          id_number?: string | null
          phone?: string | null
          reason?: string
          user_id: string
        }
        Update: {
          banned_at?: string
          email?: string | null
          id?: string
          id_number?: string | null
          phone?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      cron_job_runs: {
        Row: {
          created_at: string
          cycles_credited: number
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          job_name: string
          missed_cycles: number
          skipped: boolean
          started_at: string
          status: string
          total_credited_cents: number
          trades_processed: number
        }
        Insert: {
          created_at?: string
          cycles_credited?: number
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_name: string
          missed_cycles?: number
          skipped?: boolean
          started_at?: string
          status?: string
          total_credited_cents?: number
          trades_processed?: number
        }
        Update: {
          created_at?: string
          cycles_credited?: number
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_name?: string
          missed_cycles?: number
          skipped?: boolean
          started_at?: string
          status?: string
          total_credited_cents?: number
          trades_processed?: number
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          id: string
          reward_cents: number
          streak_day: number
          user_id: string
        }
        Insert: {
          checkin_date?: string
          created_at?: string
          id?: string
          reward_cents?: number
          streak_day?: number
          user_id: string
        }
        Update: {
          checkin_date?: string
          created_at?: string
          id?: string
          reward_cents?: number
          streak_day?: number
          user_id?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount_usd: number
          confirmations: number
          confirmed_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          network: Database["public"]["Enums"]["deposit_network"]
          notes: string | null
          provider: string
          provider_payment_id: string | null
          rejection_reason: string | null
          sender_wallet_address: string | null
          slip_attempt: number
          slip_path: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          tx_hash: string | null
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          amount_usd: number
          confirmations?: number
          confirmed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          network: Database["public"]["Enums"]["deposit_network"]
          notes?: string | null
          provider?: string
          provider_payment_id?: string | null
          rejection_reason?: string | null
          sender_wallet_address?: string | null
          slip_attempt?: number
          slip_path?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          tx_hash?: string | null
          updated_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          amount_usd?: number
          confirmations?: number
          confirmed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          network?: Database["public"]["Enums"]["deposit_network"]
          notes?: string | null
          provider?: string
          provider_payment_id?: string | null
          rejection_reason?: string | null
          sender_wallet_address?: string | null
          slip_attempt?: number
          slip_path?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      investment_levels: {
        Row: {
          color: string
          created_at: string
          daily_profit_cents: number
          icon: string
          id: string
          level: number
          min_deposit_cents: number
          name: string
          perks: string[] | null
          tier: string
        }
        Insert: {
          color: string
          created_at?: string
          daily_profit_cents: number
          icon: string
          id?: string
          level: number
          min_deposit_cents: number
          name: string
          perks?: string[] | null
          tier: string
        }
        Update: {
          color?: string
          created_at?: string
          daily_profit_cents?: number
          icon?: string
          id?: string
          level?: number
          min_deposit_cents?: number
          name?: string
          perks?: string[] | null
          tier?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount_cents: number
          asset: string
          asset_name: string
          completed_at: string | null
          created_at: string
          entry_price: number
          id: string
          return_percent: number
          status: Database["public"]["Enums"]["investment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          asset: string
          asset_name: string
          completed_at?: string | null
          created_at?: string
          entry_price?: number
          id?: string
          return_percent?: number
          status?: Database["public"]["Enums"]["investment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          asset?: string
          asset_name?: string
          completed_at?: string | null
          created_at?: string
          entry_price?: number
          id?: string
          return_percent?: number
          status?: Database["public"]["Enums"]["investment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kyc_submissions: {
        Row: {
          country: string
          created_at: string
          date_of_birth: string
          full_legal_name: string
          id: string
          id_back_path: string | null
          id_front_path: string
          id_number: string
          id_type: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_path: string
          status: Database["public"]["Enums"]["kyc_status"]
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          country: string
          created_at?: string
          date_of_birth: string
          full_legal_name: string
          id?: string
          id_back_path?: string | null
          id_front_path: string
          id_number: string
          id_type: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path: string
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string
          created_at?: string
          date_of_birth?: string
          full_legal_name?: string
          id?: string
          id_back_path?: string | null
          id_front_path?: string
          id_number?: string
          id_type?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path?: string
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          admin_note: string | null
          approved_at: string | null
          expires_at: string
          id: string
          otp_hash: string | null
          otp_verified: boolean
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          approved_at?: string | null
          expires_at?: string
          id?: string
          otp_hash?: string | null
          otp_verified?: boolean
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          approved_at?: string | null
          expires_at?: string
          id?: string
          otp_hash?: string | null
          otp_verified?: boolean
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      phone_verifications: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          otp_hash: string | null
          phone: string
          user_id: string | null
          verified: boolean
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          otp_hash?: string | null
          phone: string
          user_id?: string | null
          verified?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          otp_hash?: string | null
          phone?: string
          user_id?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance_cents: number
          ban_reason: string | null
          bio: string | null
          created_at: string
          current_streak: number
          deposit_deadline: string | null
          full_name: string | null
          id: string
          kyc_approved_at: string | null
          last_checkin_date: string | null
          level: number
          longest_streak: number
          okx_wallet: string | null
          okx_wallet_locked: boolean
          phone: string | null
          phone_country_code: string | null
          phone_verified: boolean
          referral_code: string
          referred_by: string | null
          status: string
          total_earned_cents: number
          two_factor_enabled: boolean
          updated_at: string
          username: string | null
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          balance_cents?: number
          ban_reason?: string | null
          bio?: string | null
          created_at?: string
          current_streak?: number
          deposit_deadline?: string | null
          full_name?: string | null
          id: string
          kyc_approved_at?: string | null
          last_checkin_date?: string | null
          level?: number
          longest_streak?: number
          okx_wallet?: string | null
          okx_wallet_locked?: boolean
          phone?: string | null
          phone_country_code?: string | null
          phone_verified?: boolean
          referral_code: string
          referred_by?: string | null
          status?: string
          total_earned_cents?: number
          two_factor_enabled?: boolean
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          balance_cents?: number
          ban_reason?: string | null
          bio?: string | null
          created_at?: string
          current_streak?: number
          deposit_deadline?: string | null
          full_name?: string | null
          id?: string
          kyc_approved_at?: string | null
          last_checkin_date?: string | null
          level?: number
          longest_streak?: number
          okx_wallet?: string | null
          okx_wallet_locked?: boolean
          phone?: string | null
          phone_country_code?: string | null
          phone_verified?: boolean
          referral_code?: string
          referred_by?: string | null
          status?: string
          total_earned_cents?: number
          two_factor_enabled?: boolean
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          bonus_cents: number
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          bonus_cents?: number
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          bonus_cents?: number
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      spins: {
        Row: {
          cost_cents: number
          created_at: string
          id: string
          reward_cents: number
          spin_date: string
          user_id: string
        }
        Insert: {
          cost_cents?: number
          created_at?: string
          id?: string
          reward_cents?: number
          spin_date?: string
          user_id: string
        }
        Update: {
          cost_cents?: number
          created_at?: string
          id?: string
          reward_cents?: number
          spin_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_reply: string | null
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          created_at: string
          id: string
          reviewed_at: string | null
          reward_cents: number
          status: Database["public"]["Enums"]["completion_status"]
          task_id: string
          user_id: string
          watched_seconds: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reward_cents: number
          status?: Database["public"]["Enums"]["completion_status"]
          task_id: string
          user_id: string
          watched_seconds?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reward_cents?: number
          status?: Database["public"]["Enums"]["completion_status"]
          task_id?: string
          user_id?: string
          watched_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          category: Database["public"]["Enums"]["task_category"]
          created_at: string
          description: string | null
          estimated_minutes: number | null
          id: string
          image_url: string | null
          is_active: boolean
          reward_cents: number
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["task_category"]
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          reward_cents: number
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["task_category"]
          created_at?: string
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          reward_cents?: number
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      trades: {
        Row: {
          amount_cents: number
          created_at: string
          duration_hours: number
          expires_at: string
          id: string
          profit_amount_cents: number
          profit_cents: number | null
          profit_rate: number
          settled_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          duration_hours: number
          expires_at: string
          id?: string
          profit_amount_cents: number
          profit_cents?: number | null
          profit_rate: number
          settled_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          duration_hours?: number
          expires_at?: string
          id?: string
          profit_amount_cents?: number
          profit_cents?: number | null
          profit_rate?: number
          settled_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_cents: number
          created_at: string
          description: string | null
          id: string
          related_id: string | null
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          description?: string | null
          id?: string
          related_id?: string | null
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          description?: string | null
          id?: string
          related_id?: string | null
          type?: Database["public"]["Enums"]["txn_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_change_requests: {
        Row: {
          admin_note: string | null
          approved_at: string | null
          expires_at: string
          id: string
          new_wallet: string
          old_wallet: string | null
          otp_hash: string | null
          otp_verified: boolean
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          approved_at?: string | null
          expires_at?: string
          id?: string
          new_wallet: string
          old_wallet?: string | null
          otp_hash?: string | null
          otp_verified?: boolean
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          approved_at?: string | null
          expires_at?: string
          id?: string
          new_wallet?: string
          old_wallet?: string | null
          otp_hash?: string | null
          otp_verified?: boolean
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_otps: {
        Row: {
          created_at: string
          email_verified: boolean
          expires_at: string
          id: string
          otp_hash: string | null
          phone_verified: boolean
          user_id: string
          withdrawal_id: string | null
        }
        Insert: {
          created_at?: string
          email_verified?: boolean
          expires_at?: string
          id?: string
          otp_hash?: string | null
          phone_verified?: boolean
          user_id: string
          withdrawal_id?: string | null
        }
        Update: {
          created_at?: string
          email_verified?: boolean
          expires_at?: string
          id?: string
          otp_hash?: string | null
          phone_verified?: boolean
          user_id?: string
          withdrawal_id?: string | null
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          admin_notes: string | null
          amount_cents: number
          created_at: string
          id: string
          network: Database["public"]["Enums"]["withdrawal_network"]
          processed_at: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          tx_hash: string | null
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          admin_notes?: string | null
          amount_cents: number
          created_at?: string
          id?: string
          network: Database["public"]["Enums"]["withdrawal_network"]
          processed_at?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          tx_hash?: string | null
          updated_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          admin_notes?: string | null
          amount_cents?: number
          created_at?: string
          id?: string
          network?: Database["public"]["Enums"]["withdrawal_network"]
          processed_at?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _mask_identifier: { Args: { _val: string }; Returns: string }
      admin_adjust_user_balance: {
        Args: { _delta_cents: number; _reason: string; _user_id: string }
        Returns: Json
      }
      admin_approve_deposit: {
        Args: { _deposit_id: string }
        Returns: undefined
      }
      admin_approve_password_reset: {
        Args: { _request_id: string }
        Returns: undefined
      }
      admin_approve_wallet_change: {
        Args: { _request_id: string }
        Returns: undefined
      }
      admin_approve_withdrawal: {
        Args: { _id: string; _notes?: string }
        Returns: undefined
      }
      admin_cancel_investment: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      admin_complete_investment: {
        Args: { _id: string; _return_percent: number }
        Returns: undefined
      }
      admin_mark_withdrawal_paid: {
        Args: { _id: string; _tx_hash: string }
        Returns: undefined
      }
      admin_reject_deposit: {
        Args: { _deposit_id: string; _reason: string }
        Returns: undefined
      }
      admin_reject_withdrawal: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      attach_verified_phone: {
        Args: { _country_code: string; _phone: string }
        Returns: undefined
      }
      ban_expired_kyc_accounts: { Args: never; Returns: undefined }
      check_banned_documents: {
        Args: { _email: string; _id_number: string; _phone: string }
        Returns: boolean
      }
      check_signup_health: { Args: never; Returns: Json }
      check_withdrawal_otp_complete: {
        Args: { _user_id: string }
        Returns: boolean
      }
      claim_daily_checkin: {
        Args: never
        Returns: {
          reward_cents: number
          streak_day: number
          xp_gain: number
        }[]
      }
      claim_referral_code: { Args: { p_code: string }; Returns: boolean }
      confirm_wallet_change: {
        Args: { _otp: string; _request_id: string }
        Returns: undefined
      }
      create_investment: {
        Args: {
          _amount_cents: number
          _asset: string
          _asset_name: string
          _entry_price: number
        }
        Returns: string
      }
      create_self_notification: {
        Args: { _body: string; _link?: string; _title: string; _type?: string }
        Returns: string
      }
      create_signup_phone_otp: { Args: { _phone: string }; Returns: string }
      create_withdrawal: {
        Args: {
          _amount_cents: number
          _network: string
          _wallet_address: string
        }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_withdrawal_otp: { Args: { _user_id: string }; Returns: string }
      get_downline_children: {
        Args: { _parent_id: string }
        Returns: {
          child_count: number
          display_name: string
          joined_at: string
          masked_email: string
          user_id: string
        }[]
      }
      get_downline_commission_summary: {
        Args: never
        Returns: {
          count: number
          level: number
          total_cents: number
        }[]
      }
      get_downline_level: {
        Args: { _level: number; _limit?: number; _offset?: number }
        Returns: {
          display_name: string
          joined_at: string
          masked_email: string
          referred_by: string
          referrer_name: string
          total_count: number
          user_id: string
        }[]
      }
      get_downline_summary: {
        Args: never
        Returns: {
          count: number
          level: number
        }[]
      }
      get_my_downline: {
        Args: never
        Returns: {
          avatar_url: string
          balance_cents: number
          bonus_cents: number
          country: string
          full_name: string
          joined_at: string
          real_bonus_cents: number
          referred_id: string
          slot: number
          status: string
          total_deposit_cents: number
          username: string
        }[]
      }
      get_referrer_id_by_code: { Args: { _code: string }; Returns: string }
      get_referrer_id_by_username_or_code: {
        Args: { _value: string }
        Returns: string
      }
      get_referrer_public_info: {
        Args: { _value: string }
        Returns: {
          avatar_url: string
          full_name: string
          username: string
        }[]
      }
      get_user_level: {
        Args: { _user_id: string }
        Returns: {
          color: string
          daily_profit_cents: number
          icon: string
          level: number
          min_deposit_cents: number
          name: string
          next_level_deposit: number
          tier: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      open_roi_trade: {
        Args: { _amount_cents: number; _duration_hours: number }
        Returns: {
          amount_cents: number
          created_at: string
          duration_hours: number
          expires_at: string
          id: string
          profit_amount_cents: number
          profit_cents: number | null
          profit_rate: number
          settled_at: string | null
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "trades"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      perform_spin: { Args: never; Returns: Json }
      process_due_trades: { Args: never; Returns: number }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reconcile_financials: { Args: never; Returns: Json }
      request_password_reset_by_email: {
        Args: { _email: string }
        Returns: string
      }
      request_wallet_change: { Args: { _new_wallet: string }; Returns: string }
      set_okx_wallet: { Args: { _address: string }; Returns: undefined }
      settle_trade: {
        Args: { _trade_id: string }
        Returns: {
          amount_cents: number
          created_at: string
          duration_hours: number
          expires_at: string
          id: string
          profit_amount_cents: number
          profit_cents: number | null
          profit_rate: number
          settled_at: string | null
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "trades"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_deposit_sender_address: {
        Args: { _deposit_id: string; _sender_address: string }
        Returns: undefined
      }
      submit_deposit_slip: {
        Args: { _deposit_id: string; _slip_path: string }
        Returns: undefined
      }
      submit_deposit_tx_hash: {
        Args: { _deposit_id: string; _tx_hash: string }
        Returns: undefined
      }
      trade_cooldown_seconds: { Args: never; Returns: number }
      verify_password_reset_otp: {
        Args: { _email: string; _otp: string }
        Returns: string
      }
      verify_signup_phone_otp: {
        Args: { _otp: string; _phone: string }
        Returns: boolean
      }
      verify_withdrawal_otp: {
        Args: { _otp: string; _type: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      completion_status: "pending" | "approved" | "rejected"
      deposit_network: "USDT_TRC20" | "USDT_BEP20"
      deposit_status:
        | "pending"
        | "confirming"
        | "approved"
        | "completed"
        | "failed"
        | "expired"
      investment_status: "active" | "completed" | "cancelled"
      kyc_status: "unverified" | "pending" | "verified" | "rejected"
      task_category: "survey" | "video" | "app_install" | "offer"
      txn_type:
        | "task_reward"
        | "referral_bonus"
        | "withdrawal"
        | "adjustment"
        | "deposit"
        | "profit"
        | "bonus"
      withdrawal_network: "TRC20" | "BEP20" | "ERC20"
      withdrawal_status:
        | "pending"
        | "approved"
        | "rejected"
        | "paid"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      completion_status: ["pending", "approved", "rejected"],
      deposit_network: ["USDT_TRC20", "USDT_BEP20"],
      deposit_status: [
        "pending",
        "confirming",
        "approved",
        "completed",
        "failed",
        "expired",
      ],
      investment_status: ["active", "completed", "cancelled"],
      kyc_status: ["unverified", "pending", "verified", "rejected"],
      task_category: ["survey", "video", "app_install", "offer"],
      txn_type: [
        "task_reward",
        "referral_bonus",
        "withdrawal",
        "adjustment",
        "deposit",
        "profit",
        "bonus",
      ],
      withdrawal_network: ["TRC20", "BEP20", "ERC20"],
      withdrawal_status: [
        "pending",
        "approved",
        "rejected",
        "paid",
        "cancelled",
      ],
    },
  },
} as const
