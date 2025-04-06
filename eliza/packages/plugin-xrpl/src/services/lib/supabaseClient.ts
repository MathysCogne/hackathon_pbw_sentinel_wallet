import { createClient } from '@supabase/supabase-js';
import { elizaLogger } from '@elizaos/core';

// Récupérer les variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Vérifier que les variables d'environnement sont définies
if (!supabaseUrl || !supabaseKey) {
  elizaLogger.error('Supabase environment variables are not defined. Please set SUPABASE_URL and SUPABASE_KEY.');
  console.error('Supabase environment variables are not defined. Please set SUPABASE_URL and SUPABASE_KEY.');
}

// Créer et exporter le client Supabase
export const supabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

// Fonction utilitaire pour tester la connexion
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabaseClient.from('Tasks').select('count', { count: 'exact', head: true });
    
    if (error) {
      elizaLogger.error(`Supabase connection test failed: ${error.message}`);
      console.error(`Supabase connection test failed: ${error.message}`);
      return false;
    }
    
    elizaLogger.log('Supabase connection test successful');
    console.log('Supabase connection test successful');
    return true;
  } catch (err: any) {
    elizaLogger.error(`Supabase connection test exception: ${err.message}`);
    console.error(`Supabase connection test exception: ${err.message}`);
    return false;
  }
} 