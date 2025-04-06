-- Désactiver les contraintes de clé étrangère temporairement
SET session_replication_role = 'replica';

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Users can view their own data" ON Users;
DROP POLICY IF EXISTS "Users can view their own sentinel settings" ON SentinelWallet;
DROP POLICY IF EXISTS "Users can update their own sentinel settings" ON SentinelWallet;
DROP POLICY IF EXISTS "Users can insert their own sentinel settings" ON SentinelWallet;
DROP POLICY IF EXISTS "Users can view their own tasks" ON Tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON Tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON Tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON Tasks;
DROP POLICY IF EXISTS "Users can view their own task executions" ON TaskExecutions;

-- Supprimer les triggers
DROP TRIGGER IF EXISTS update_users_last_modified ON Users;
DROP TRIGGER IF EXISTS update_sentinel_updated_at ON SentinelWallet;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON Tasks;

-- Supprimer les fonctions
DROP FUNCTION IF EXISTS update_last_modified();
DROP FUNCTION IF EXISTS update_updated_at();

-- Supprimer les tables dans l'ordre inverse des dépendances
DROP TABLE IF EXISTS TaskExecutions;
DROP TABLE IF EXISTS Tasks;
DROP TABLE IF EXISTS SentinelWallet;
DROP TABLE IF EXISTS Users;

-- Réactiver les contraintes de clé étrangère
SET session_replication_role = 'origin'; 