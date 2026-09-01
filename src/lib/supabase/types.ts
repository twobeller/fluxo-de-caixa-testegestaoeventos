// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      planejamento_itens: {
        Row: {
          atualizado_em: string
          categoria: string
          criado_em: string
          criado_por: string | null
          evento: number
          falta_pagar: number
          gutto: number
          id: string
          item: string
          junior: number
          pc: number
          quantidade: number
          responsavel: string
          ruan: number
          status: string
          total_pago: number
          valor_final: number
          valor_unitario: number
        }
        Insert: {
          atualizado_em?: string
          categoria: string
          criado_em?: string
          criado_por?: string | null
          evento?: number
          falta_pagar?: number
          gutto?: number
          id?: string
          item: string
          junior?: number
          pc?: number
          quantidade?: number
          responsavel: string
          ruan?: number
          status?: string
          total_pago?: number
          valor_final?: number
          valor_unitario?: number
        }
        Update: {
          atualizado_em?: string
          categoria?: string
          criado_em?: string
          criado_por?: string | null
          evento?: number
          falta_pagar?: number
          gutto?: number
          id?: string
          item?: string
          junior?: number
          pc?: number
          quantidade?: number
          responsavel?: string
          ruan?: number
          status?: string
          total_pago?: number
          valor_final?: number
          valor_unitario?: number
        }
        Relationships: []
      }
      transacoes: {
        Row: {
          categoria: string
          comprovante_url: string | null
          criado_em: string
          criado_por: string
          data: string
          descricao: string
          entrada: number
          id: string
          observacoes: string | null
          responsavel: string
          saida: number
          saldo_acumulado: number
        }
        Insert: {
          categoria: string
          comprovante_url?: string | null
          criado_em?: string
          criado_por: string
          data?: string
          descricao: string
          entrada?: number
          id?: string
          observacoes?: string | null
          responsavel: string
          saida?: number
          saldo_acumulado?: number
        }
        Update: {
          categoria?: string
          comprovante_url?: string | null
          criado_em?: string
          criado_por?: string
          data?: string
          descricao?: string
          entrada?: number
          id?: string
          observacoes?: string | null
          responsavel?: string
          saida?: number
          saldo_acumulado?: number
        }
        Relationships: []
      }
      vendas_ingressos: {
        Row: {
          comprovante_url: string | null
          cpf: string | null
          criado_em: string
          email: string | null
          forma_pagamento: string
          id: string
          nome_comprador: string
          nome_pagador: string
          qtd_ingressos: number
          telefone: string | null
          transacao_id: string | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          comprovante_url?: string | null
          cpf?: string | null
          criado_em?: string
          email?: string | null
          forma_pagamento: string
          id?: string
          nome_comprador: string
          nome_pagador: string
          qtd_ingressos?: number
          telefone?: string | null
          transacao_id?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          comprovante_url?: string | null
          cpf?: string | null
          criado_em?: string
          email?: string | null
          forma_pagamento?: string
          id?: string
          nome_comprador?: string
          nome_pagador?: string
          qtd_ingressos?: number
          telefone?: string | null
          transacao_id?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: 'vendas_ingressos_transacao_id_fkey'
            columns: ['transacao_id']
            isOneToOne: false
            referencedRelation: 'transacoes'
            referencedColumns: ['id']
          },
        ]
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
