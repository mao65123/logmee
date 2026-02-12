-- saved_reports テーブル：生成された報告書のHTMLスナップショットを保存
CREATE TABLE IF NOT EXISTS saved_reports (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  title TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  html_content TEXT NOT NULL,
  db_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  db_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_reports_user_id ON saved_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_reports_client_id ON saved_reports(client_id);

ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own saved reports"
  ON saved_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved reports"
  ON saved_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved reports"
  ON saved_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved reports"
  ON saved_reports FOR DELETE
  USING (auth.uid() = user_id);
