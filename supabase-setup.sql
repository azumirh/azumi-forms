-- Execute este SQL no Supabase
-- Acesse: Supabase → SQL Editor → New Query → Cole e Execute

-- Tabela de formulários
CREATE TABLE IF NOT EXISTS forms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  description TEXT DEFAULT '',
  expiry DATE,
  questions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de respostas
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  form_name TEXT,
  client TEXT,
  answers JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS responses_form_id_idx ON responses(form_id);

-- Permissões (RLS desativado para simplicidade - habilite depois se quiser)
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Policies: leitura e escrita públicas (o controle de acesso é feito pelo app)
CREATE POLICY "Allow all on forms" ON forms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on responses" ON responses FOR ALL USING (true) WITH CHECK (true);
