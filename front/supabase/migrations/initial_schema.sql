-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Supprimer les tables existantes si nécessaire
DROP TABLE IF EXISTS TaskExecutions;
DROP TABLE IF EXISTS Tasks;
DROP TABLE IF EXISTS SentinelWallet;
DROP TABLE IF EXISTS Users;

-- Table principale des utilisateurs
CREATE TABLE Users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL,
    xumm_user_id TEXT UNIQUE NOT NULL,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    last_modified TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Table pour les configurations Sentinel Wallet
CREATE TABLE SentinelWallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES Users(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT FALSE,
    provider TEXT[] DEFAULT '{}',
    
    -- Configuration des providers
    provider_config JSONB DEFAULT '{}'::jsonb,
    
    notification_threshold DECIMAL(20,8),
    last_notification_sent TIMESTAMPTZ,
    notification_cooldown_minutes INTEGER DEFAULT 60,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des tâches du Task Manager
CREATE TABLE Tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES Users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'failed', 'cancelled')),
    
    -- Gestion de la récurrence
    recurrence_type TEXT CHECK (recurrence_type IN ('once', 'daily', 'weekly', 'monthly')),
    recurrence_interval INTEGER DEFAULT 1,
    recurrence_days INTEGER[], -- Pour les tâches hebdomadaires [1,3,5] = Lundi, Mercredi, Vendredi
    
    start_date TIMESTAMPTZ NOT NULL,
    next_execution TIMESTAMPTZ,
    last_execution TIMESTAMPTZ,
    
    -- Configuration spécifique à la tâche
    task_config JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contrainte pour s'assurer que next_execution est après start_date
    CONSTRAINT valid_next_execution CHECK (next_execution >= start_date)
);

-- Table pour l'historique des exécutions de tâches
CREATE TABLE TaskExecutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES Tasks(id) ON DELETE CASCADE,
    execution_start TIMESTAMPTZ NOT NULL,
    execution_end TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'cancelled')),
    error_message TEXT,
    execution_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fonction pour mettre à jour last_modified
DROP FUNCTION IF EXISTS update_last_modified() CASCADE;
CREATE OR REPLACE FUNCTION update_last_modified()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_modified = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour updated_at
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour Users
CREATE TRIGGER update_users_last_modified
    BEFORE UPDATE ON Users
    FOR EACH ROW
    EXECUTE FUNCTION update_last_modified();

-- Triggers pour SentinelWallet
CREATE TRIGGER update_sentinel_updated_at
    BEFORE UPDATE ON SentinelWallet
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Triggers pour Tasks
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON Tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Ajout des politiques RLS (Row Level Security)
ALTER TABLE Users ENABLE ROW LEVEL SECURITY;
ALTER TABLE SentinelWallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE Tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE TaskExecutions ENABLE ROW LEVEL SECURITY;

-- Politiques pour Users
CREATE POLICY "Users can view their own data"
    ON Users FOR SELECT
    USING (auth.uid()::text = id::text);

-- Politiques pour SentinelWallet
CREATE POLICY "Users can view their own sentinel settings"
    ON SentinelWallet FOR SELECT
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own sentinel settings"
    ON SentinelWallet FOR UPDATE
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own sentinel settings"
    ON SentinelWallet FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

-- Politiques pour Tasks
CREATE POLICY "Users can view their own tasks"
    ON Tasks FOR SELECT
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own tasks"
    ON Tasks FOR UPDATE
    USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own tasks"
    ON Tasks FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own tasks"
    ON Tasks FOR DELETE
    USING (auth.uid()::text = user_id::text);

-- Politiques pour TaskExecutions
CREATE POLICY "Users can view their own task executions"
    ON TaskExecutions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM Tasks
        WHERE Tasks.id = TaskExecutions.task_id
        AND auth.uid()::text = Tasks.user_id::text
    )); 