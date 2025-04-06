-- Script SQL pour créer la table transactions_history dans Supabase

CREATE TABLE IF NOT EXISTS transactions_history (
  id SERIAL PRIMARY KEY,
  tx_hash TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  sender_address TEXT REFERENCES users(wallet_address),
  recipient_address TEXT,
  amount TEXT,
  currency TEXT,
  confidence_score FLOAT,
  risk_factors TEXT[],
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Index pour recherche rapide par hash de transaction
  CONSTRAINT unique_tx_hash UNIQUE (tx_hash)
);

-- Ajouter un index sur sender_address pour améliorer les performances des jointures
CREATE INDEX IF NOT EXISTS idx_transactions_history_sender_address ON transactions_history(sender_address);

-- Commentaires sur la table
COMMENT ON TABLE transactions_history IS 'Historique des analyses de transactions XRP par l''IA Sentinel';
COMMENT ON COLUMN transactions_history.tx_hash IS 'Hash de la transaction analysée';
COMMENT ON COLUMN transactions_history.recommendation IS 'Recommandation de l''IA (SIGN, REJECT, REVIEW)';
COMMENT ON COLUMN transactions_history.ai_response IS 'Réponse complète générée par l''IA';
COMMENT ON COLUMN transactions_history.sender_address IS 'Adresse de l''émetteur de la transaction, liée à la table users';
COMMENT ON COLUMN transactions_history.confidence_score IS 'Score de confiance calculé lors de l''analyse';
COMMENT ON COLUMN transactions_history.risk_factors IS 'Facteurs de risque identifiés par l''analyse'; 