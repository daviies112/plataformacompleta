export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          id: string
          reseller_id: string
          bank_name: string
          bank_code: string | null
          agency: string
          account_number: string
          account_type: string
          holder_name: string
          holder_document: string
          pix_key: string | null
          pix_key_type: string | null
          is_primary: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          reseller_id: string
          bank_name: string
          bank_code?: string | null
          agency: string
          account_number: string
          account_type: string
          holder_name: string
          holder_document: string
          pix_key?: string | null
          pix_key_type?: string | null
          is_primary?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          reseller_id?: string
          bank_name?: string
          bank_code?: string | null
          agency?: string
          account_number?: string
          account_type?: string
          holder_name?: string
          holder_document?: string
          pix_key?: string | null
          pix_key_type?: string | null
          is_primary?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          id: string
          reseller_id: string
          bank_account_id: string
          amount: number
          status: string
          requested_at: string
          processed_at: string | null
          completed_at: string | null
          transfer_type: string
          transfer_receipt: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          reseller_id: string
          bank_account_id: string
          amount: number
          status?: string
          requested_at?: string
          processed_at?: string | null
          completed_at?: string | null
          transfer_type?: string
          transfer_receipt?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          reseller_id?: string
          bank_account_id?: string
          amount?: number
          status?: string
          requested_at?: string
          processed_at?: string | null
          completed_at?: string | null
          transfer_type?: string
          transfer_receipt?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sales_with_split: {
        Row: {
          id: string
          product_id: string
          reseller_id: string
          company_id: string | null
          payment_method: string
          status: string | null
          total_amount: number
          reseller_amount: number
          company_amount: number
          commission_percentage: number | null
          quantity: number | null
          paid: boolean | null
          paid_at: string | null
          pagarme_order_id: string | null
          pagarme_charge_id: string | null
          customer_name: string | null
          customer_email: string | null
          customer_phone: string | null
          customer_document: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          reseller_id: string
          company_id?: string | null
          payment_method: string
          status?: string | null
          total_amount: number
          reseller_amount: number
          company_amount: number
          commission_percentage?: number | null
          quantity?: number | null
          paid?: boolean | null
          paid_at?: string | null
          pagarme_order_id?: string | null
          pagarme_charge_id?: string | null
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          customer_document?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          reseller_id?: string
          company_id?: string | null
          payment_method?: string
          status?: string | null
          total_amount?: number
          reseller_amount?: number
          company_amount?: number
          commission_percentage?: number | null
          quantity?: number | null
          paid?: boolean | null
          paid_at?: string | null
          pagarme_order_id?: string | null
          pagarme_charge_id?: string | null
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          customer_document?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      commission_config: {
        Row: {
          id: string
          use_dynamic_tiers: boolean | null
          sales_tiers: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          use_dynamic_tiers?: boolean | null
          sales_tiers?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          use_dynamic_tiers?: boolean | null
          sales_tiers?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      resellers: {
        Row: {
          id: string
          nome: string | null
          cpf: string | null
          telefone: string | null
          email: string | null
          tipo: string | null
          nivel: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          nome?: string | null
          cpf?: string | null
          telefone?: string | null
          email?: string | null
          tipo?: string | null
          nivel?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          nome?: string | null
          cpf?: string | null
          telefone?: string | null
          email?: string | null
          tipo?: string | null
          nivel?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      reseller_stores: {
        Row: {
          id: string
          reseller_id: string
          product_ids: string[]
          is_published: boolean | null
          store_name: string | null
          store_slug: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          reseller_id: string
          product_ids?: string[]
          is_published?: boolean | null
          store_name?: string | null
          store_slug?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          reseller_id?: string
          product_ids?: string[]
          is_published?: boolean | null
          store_name?: string | null
          store_slug?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reseller_alerts: {
        Row: {
          id: string
          reseller_id: string
          alert_type: string
          severity: string
          message: string
          current_month_sales: number | null
          average_monthly_sales: number | null
          drop_percentage: number | null
          baseline_months: number | null
          analysis_month: number
          analysis_year: number
          reseller_name: string | null
          reseller_phone: string | null
          reseller_email: string | null
          is_active: boolean | null
          notified_at: string | null
          resolved_at: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          reseller_id: string
          alert_type?: string
          severity?: string
          message: string
          current_month_sales?: number | null
          average_monthly_sales?: number | null
          drop_percentage?: number | null
          baseline_months?: number | null
          analysis_month: number
          analysis_year: number
          reseller_name?: string | null
          reseller_phone?: string | null
          reseller_email?: string | null
          is_active?: boolean | null
          notified_at?: string | null
          resolved_at?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          reseller_id?: string
          alert_type?: string
          severity?: string
          message?: string
          current_month_sales?: number | null
          average_monthly_sales?: number | null
          drop_percentage?: number | null
          baseline_months?: number | null
          analysis_month?: number
          analysis_year?: number
          reseller_name?: string | null
          reseller_phone?: string | null
          reseller_email?: string | null
          is_active?: boolean | null
          notified_at?: string | null
          resolved_at?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          image: string | null
          barcode: string | null
          reference: string | null
          description: string | null
          number: string | null
          color: string | null
          category: string | null
          subcategory: string | null
          price: number | null
          stock: number | null
          low_stock_threshold: number | null
          notify_low_stock: boolean | null
          supplier: string | null
          weight: number | null
          gold_plating_millesimal: number | null
          purchase_cost: number | null
          gold_plating_cost: number | null
          rhodium_plating_cost: number | null
          silver_plating_cost: number | null
          varnish_cost: number | null
          labor_cost: number | null
          wholesale_price: number | null
          nfe_data: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          image?: string | null
          barcode?: string | null
          reference?: string | null
          description?: string | null
          number?: string | null
          color?: string | null
          category?: string | null
          subcategory?: string | null
          price?: number | null
          stock?: number | null
          low_stock_threshold?: number | null
          notify_low_stock?: boolean | null
          supplier?: string | null
          weight?: number | null
          gold_plating_millesimal?: number | null
          purchase_cost?: number | null
          gold_plating_cost?: number | null
          rhodium_plating_cost?: number | null
          silver_plating_cost?: number | null
          varnish_cost?: number | null
          labor_cost?: number | null
          wholesale_price?: number | null
          nfe_data?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          image?: string | null
          barcode?: string | null
          reference?: string | null
          description?: string | null
          number?: string | null
          color?: string | null
          category?: string | null
          subcategory?: string | null
          price?: number | null
          stock?: number | null
          low_stock_threshold?: number | null
          notify_low_stock?: boolean | null
          supplier?: string | null
          weight?: number | null
          gold_plating_millesimal?: number | null
          purchase_cost?: number | null
          gold_plating_cost?: number | null
          rhodium_plating_cost?: number | null
          silver_plating_cost?: number | null
          varnish_cost?: number | null
          labor_cost?: number | null
          wholesale_price?: number | null
          nfe_data?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[keyof Database]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
