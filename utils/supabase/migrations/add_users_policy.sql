-- Ajouter la politique pour permettre l'insertion de nouveaux utilisateurs
CREATE POLICY "Enable insert for users" ON users FOR INSERT WITH CHECK (true);

-- Ajouter une politique pour permettre la mise à jour des utilisateurs par eux-mêmes
CREATE POLICY "Users can update their own data" ON users 
FOR UPDATE USING (auth.uid()::text = id::text);

-- Ajouter une politique pour permettre la suppression des utilisateurs par eux-mêmes
CREATE POLICY "Users can delete their own data" ON users 
FOR DELETE USING (auth.uid()::text = id::text); 