export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      currencies: {
        Row: {
          code: string;
          name: string;
          symbol: string;
          decimal_places: number;
          is_active: boolean;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          base_currency: string;
          default_account_id: string | null;
          push_notifications_enabled: boolean;
          budget_alerts_enabled: boolean;
          recurring_reminders_enabled: boolean;
          budget_alert_threshold_pct: number;
          role: "user" | "admin" | "superadmin";
          created_at: string;
          updated_at: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          title: string;
          body: string;
          type: "release" | "maintenance" | "alert" | "feature" | "info";
          priority: "low" | "normal" | "high" | "critical";
          action_url: string | null;
          action_label: string | null;
          target_platform: string[];
          target_min_version: string | null;
          target_max_version: string | null;
          show_as_banner: boolean;
          is_dismissible: boolean;
          status: "draft" | "scheduled" | "published" | "expired";
          scheduled_at: string | null;
          expires_at: string | null;
          published_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
      };
      notification_reads: {
        Row: {
          id: string;
          notification_id: string;
          user_id: string;
          read_at: string;
        };
      };
      notification_dismissals: {
        Row: {
          id: string;
          notification_id: string;
          user_id: string;
          dismissed_at: string;
        };
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: "desktop" | "android" | "ios";
          app_version: string;
          device_info: Json | null;
          is_active: boolean;
          last_used_at: string;
          created_at: string;
        };
      };
      app_versions: {
        Row: {
          id: string;
          version: string;
          platform: "desktop" | "android" | "ios";
          release_notes: string | null;
          download_url: string | null;
          asset_url_win: string | null;
          asset_url_mac: string | null;
          asset_url_linux: string | null;
          is_critical: boolean;
          is_published: boolean;
          rollout_percentage: number;
          min_os_version: string | null;
          published_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          year_month: string;
          amount: string;
          created_at: string;
          updated_at: string;
        };
      };
      recurring_rules: {
        Row: {
          id: string;
          user_id: string;
          frequency: "daily" | "weekly" | "monthly";
          interval_n: number;
          next_run_date: string;
          end_date: string | null;
          type: "expense" | "income";
          category_id: string;
          description: string | null;
          account_id: string;
          amount: string;
          currency_code: string;
          exchange_rate: string;
          is_active: boolean;
          last_generated_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      user_notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string | null;
          read_at: string | null;
          created_at: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: "bank" | "e_wallet" | "cash" | "credit_card";
          default_currency: string;
          icon: string | null;
          color: string | null;
          is_archived: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: "expense" | "income" | "transfer";
          category_id: string | null;
          description: string | null;
          notes: string | null;
          date: string;
          created_at: string;
          updated_at: string;
        };
      };
      transaction_lines: {
        Row: {
          id: string;
          transaction_id: string;
          account_id: string;
          amount: string;
          currency_code: string;
          exchange_rate: string;
          base_amount: string;
          created_at: string;
        };
      };
    };
    Functions: {
      create_transaction: {
        Args: {
          p_type: string;
          p_category_id: string | null;
          p_description: string | null;
          p_notes: string | null;
          p_date: string;
          p_lines: Json;
        };
        Returns: string;
      };
      update_transaction: {
        Args: {
          p_transaction_id: string;
          p_type: string;
          p_category_id: string | null;
          p_description: string | null;
          p_notes: string | null;
          p_date: string;
          p_lines: Json;
          p_expected_updated_at?: string | null;
        };
        Returns: string;
      };
      scan_imbalanced_transfers: {
        Args: Record<string, never>;
        Returns: {
          transaction_id: string;
          user_id: string;
          imbalance: number;
          description: string | null;
          txn_date: string;
        }[];
      };
      wipe_user_finance_data: {
        Args: Record<string, never>;
        Returns: null;
      };
      process_my_recurring_rules: {
        Args: Record<string, never>;
        Returns: number;
      };
      publish_and_expire_notifications: {
        Args: Record<string, never>;
        Returns: null;
      };
      get_notification_engagement_stats: {
        Args: Record<string, never>;
        Returns: {
          notification_id: string;
          read_count: number;
          dismiss_count: number;
        }[];
      };
      get_desktop_version_distribution: {
        Args: Record<string, never>;
        Returns: {
          app_version: string;
          device_count: number;
        }[];
      };
    };
  };
}
