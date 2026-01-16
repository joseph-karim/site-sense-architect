-- Part3 project handoffs
-- Tracks when users request to push artifacts/risk items to Part3 CA system
CREATE TABLE IF NOT EXISTS part3_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  city VARCHAR(50) NOT NULL,
  project_name TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, synced, error
  part3_external_id UUID, -- ID returned by Part3 API when integrated
  sync_error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_part3_projects_artifact_id ON part3_projects (artifact_id);
CREATE INDEX IF NOT EXISTS idx_part3_projects_user_email ON part3_projects (user_email);
CREATE INDEX IF NOT EXISTS idx_part3_projects_status ON part3_projects (status);
