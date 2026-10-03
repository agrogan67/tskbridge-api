CREATE TABLE IF NOT EXISTS projects (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT NULL,
  team_id     VARCHAR(36)  NOT NULL,
  status      VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP    NULL,
  INDEX idx_team_id (team_id),
  INDEX idx_status (status),
  INDEX idx_deleted_at (deleted_at)
) DEFAULT CHARSET = utf8mb4;
