export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: any;
        Insert: any;
        Update: any;
      };
      // Add other tables as needed for stronger typing
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
