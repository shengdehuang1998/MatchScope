-- MatchScope / Match Insight phase 1 schema
-- Target: PostgreSQL 17+
-- Run this migration exactly once against an empty database.
-- Product term: 分析模板. Technical identifiers keep the standard prompt_* naming.

BEGIN;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  display_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_email_not_blank CHECK (btrim(email) <> ''),
  CONSTRAINT users_password_hash_not_blank CHECK (btrim(password_hash) <> '')
);

CREATE UNIQUE INDEX users_email_lower_unique_idx ON users (lower(email));

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL,
  device_name text,
  user_agent text,
  ip_address inet,
  expires_at timestamp with time zone NOT NULL,
  last_used_at timestamp with time zone,
  revoked_at timestamp with time zone,
  replaced_by_session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sessions_refresh_token_hash_not_blank CHECK (btrim(refresh_token_hash) <> ''),
  CONSTRAINT sessions_expiry_after_creation CHECK (expires_at > created_at),
  CONSTRAINT sessions_replacement_not_self CHECK (replaced_by_session_id IS NULL OR replaced_by_session_id <> id)
);

CREATE UNIQUE INDEX sessions_refresh_token_hash_unique_idx ON sessions (refresh_token_hash);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_active_expiry_idx ON sessions (expires_at) WHERE revoked_at IS NULL;

CREATE TABLE prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  current_version_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  archived_at timestamp with time zone,
  CONSTRAINT prompt_templates_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT prompt_templates_user_id_id_unique UNIQUE (user_id, id)
);

CREATE UNIQUE INDEX prompt_templates_one_default_per_user_idx
  ON prompt_templates (user_id)
  WHERE is_default AND archived_at IS NULL;

CREATE INDEX prompt_templates_user_id_idx ON prompt_templates (user_id, created_at DESC);

CREATE TABLE prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid NOT NULL,
  version_number integer NOT NULL,
  content text NOT NULL,
  created_by_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT prompt_versions_version_positive CHECK (version_number > 0),
  CONSTRAINT prompt_versions_content_not_blank CHECK (btrim(content) <> ''),
  CONSTRAINT prompt_versions_template_fk
    FOREIGN KEY (user_id, template_id)
    REFERENCES prompt_templates(user_id, id)
    ON DELETE CASCADE,
  CONSTRAINT prompt_versions_created_by_user_fk
    FOREIGN KEY (created_by_user_id)
    REFERENCES users(id)
    ON DELETE NO ACTION
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT prompt_versions_template_version_unique UNIQUE (template_id, version_number),
  CONSTRAINT prompt_versions_template_id_id_unique UNIQUE (template_id, id),
  CONSTRAINT prompt_versions_user_id_id_unique UNIQUE (user_id, id)
);

ALTER TABLE prompt_templates
  ADD CONSTRAINT prompt_templates_current_version_fk
  FOREIGN KEY (id, current_version_id)
  REFERENCES prompt_versions(template_id, id)
  ON DELETE NO ACTION
  DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX prompt_versions_template_created_idx
  ON prompt_versions (template_id, version_number DESC);

CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  league text NOT NULL,
  home_team text NOT NULL,
  away_team text NOT NULL,
  kickoff_at timestamp with time zone NOT NULL,
  input_timezone text NOT NULL DEFAULT 'Asia/Shanghai',
  supplemental_material text,
  prompt_version_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  schedule_version integer NOT NULL DEFAULT 1,
  cancelled_at timestamp with time zone,
  finished_at timestamp with time zone,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT matches_league_not_blank CHECK (btrim(league) <> ''),
  CONSTRAINT matches_home_team_not_blank CHECK (btrim(home_team) <> ''),
  CONSTRAINT matches_away_team_not_blank CHECK (btrim(away_team) <> ''),
  CONSTRAINT matches_different_teams CHECK (lower(btrim(home_team)) <> lower(btrim(away_team))),
  CONSTRAINT matches_timezone_not_blank CHECK (btrim(input_timezone) <> ''),
  CONSTRAINT matches_status_valid CHECK (status IN ('draft', 'scheduled', 'cancelled', 'finished')),
  CONSTRAINT matches_schedule_version_positive CHECK (schedule_version > 0),
  CONSTRAINT matches_cancelled_time_consistent CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL)
    OR (status <> 'cancelled' AND cancelled_at IS NULL)
  ),
  CONSTRAINT matches_finished_time_consistent CHECK (
    (status = 'finished' AND finished_at IS NOT NULL)
    OR (status <> 'finished' AND finished_at IS NULL)
  ),
  CONSTRAINT matches_prompt_version_fk
    FOREIGN KEY (user_id, prompt_version_id)
    REFERENCES prompt_versions(user_id, id)
    ON DELETE NO ACTION
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX matches_user_kickoff_idx
  ON matches (user_id, kickoff_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX matches_user_status_kickoff_idx
  ON matches (user_id, status, kickoff_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX matches_prompt_version_id_idx ON matches (prompt_version_id);

CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  default_timezone text NOT NULL DEFAULT 'Asia/Shanghai',
  default_analysis_lead_minutes integer NOT NULL DEFAULT 60,
  email_notifications_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_settings_recipient_email_not_blank CHECK (btrim(recipient_email) <> ''),
  CONSTRAINT user_settings_timezone_not_blank CHECK (btrim(default_timezone) <> ''),
  CONSTRAINT user_settings_analysis_lead_range CHECK (
    default_analysis_lead_minutes BETWEEN 0 AND 10080
  )
);

CREATE TABLE audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  request_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_action_not_blank CHECK (btrim(action) <> ''),
  CONSTRAINT audit_logs_resource_type_not_blank CHECK (btrim(resource_type) <> ''),
  CONSTRAINT audit_logs_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX audit_logs_actor_created_idx ON audit_logs (actor_user_id, created_at DESC);
CREATE INDEX audit_logs_resource_created_idx
  ON audit_logs (resource_type, resource_id, created_at DESC);
CREATE INDEX audit_logs_request_id_idx ON audit_logs (request_id) WHERE request_id IS NOT NULL;

COMMENT ON TABLE users IS '系统用户；第一阶段仅通过初始化命令创建单用户，不开放注册';
COMMENT ON COLUMN users.id IS '用户主键';
COMMENT ON COLUMN users.email IS '登录邮箱；通过小写表达式唯一索引实现不区分大小写唯一';
COMMENT ON COLUMN users.password_hash IS '由应用使用 Argon2id 生成的密码哈希，禁止存储明文密码';
COMMENT ON COLUMN users.display_name IS '用户显示名称';
COMMENT ON COLUMN users.is_active IS '账户是否可登录和使用系统';
COMMENT ON COLUMN users.created_at IS '用户创建时间';
COMMENT ON COLUMN users.updated_at IS '用户最后更新时间，由触发器维护';

COMMENT ON TABLE sessions IS '用户登录会话及可轮换刷新令牌记录';
COMMENT ON COLUMN sessions.id IS '会话主键，同时用于标识具体登录设备会话';
COMMENT ON COLUMN sessions.user_id IS '会话所属用户';
COMMENT ON COLUMN sessions.refresh_token_hash IS '刷新令牌哈希；数据库不保存刷新令牌明文';
COMMENT ON COLUMN sessions.device_name IS '客户端上报的设备名称';
COMMENT ON COLUMN sessions.user_agent IS '创建或使用会话时的客户端 User-Agent';
COMMENT ON COLUMN sessions.ip_address IS '创建会话时的客户端 IP 地址';
COMMENT ON COLUMN sessions.expires_at IS '刷新会话过期时间';
COMMENT ON COLUMN sessions.last_used_at IS '刷新令牌最后使用时间';
COMMENT ON COLUMN sessions.revoked_at IS '会话撤销时间；为空表示尚未主动撤销';
COMMENT ON COLUMN sessions.replaced_by_session_id IS '令牌轮换后替代当前会话的新会话 ID';
COMMENT ON COLUMN sessions.created_at IS '会话创建时间';

COMMENT ON TABLE prompt_templates IS '用户维护的分析模板；执行 AI 分析时与比赛资料组合使用';
COMMENT ON COLUMN prompt_templates.id IS '分析模板主键';
COMMENT ON COLUMN prompt_templates.user_id IS '分析模板所属用户';
COMMENT ON COLUMN prompt_templates.name IS '分析模板名称';
COMMENT ON COLUMN prompt_templates.description IS '分析模板的用途或内容说明';
COMMENT ON COLUMN prompt_templates.is_default IS '是否为该用户当前默认分析模板';
COMMENT ON COLUMN prompt_templates.current_version_id IS '模板当前启用版本；必须属于当前模板';
COMMENT ON COLUMN prompt_templates.created_at IS '模板创建时间';
COMMENT ON COLUMN prompt_templates.updated_at IS '模板最后更新时间，由触发器维护';
COMMENT ON COLUMN prompt_templates.archived_at IS '模板归档时间；为空表示仍可使用';

COMMENT ON TABLE prompt_versions IS '分析模板的不可变历史版本；保存新内容时新增记录而不覆盖旧版本';
COMMENT ON COLUMN prompt_versions.id IS '分析模板版本主键';
COMMENT ON COLUMN prompt_versions.user_id IS '分析模板版本所属用户，用于数据库层隔离用户数据';
COMMENT ON COLUMN prompt_versions.template_id IS '版本所属分析模板';
COMMENT ON COLUMN prompt_versions.version_number IS '模板内从 1 开始递增的版本号';
COMMENT ON COLUMN prompt_versions.content IS '该版本完整且不可变的 AI 分析要求或上下文';
COMMENT ON COLUMN prompt_versions.created_by_user_id IS '创建该版本的用户';
COMMENT ON COLUMN prompt_versions.created_at IS '版本创建时间';

COMMENT ON TABLE matches IS '用户录入的足球比赛及其排期、状态和绑定的分析模板版本';
COMMENT ON COLUMN matches.id IS '比赛主键';
COMMENT ON COLUMN matches.user_id IS '比赛所属用户';
COMMENT ON COLUMN matches.league IS '联赛名称';
COMMENT ON COLUMN matches.home_team IS '主队名称';
COMMENT ON COLUMN matches.away_team IS '客队名称';
COMMENT ON COLUMN matches.kickoff_at IS '标准化后的开赛时间，使用带时区时间类型存储';
COMMENT ON COLUMN matches.input_timezone IS '用户录入开赛时间时使用的 IANA 时区名称';
COMMENT ON COLUMN matches.supplemental_material IS '用户为比赛补充的原始资料文本';
COMMENT ON COLUMN matches.prompt_version_id IS '比赛绑定的分析模板版本；创建后保留明确且不可变的版本引用';
COMMENT ON COLUMN matches.status IS '比赛状态：draft、scheduled、cancelled 或 finished';
COMMENT ON COLUMN matches.schedule_version IS '排期版本号；每次修改开赛时间时递增';
COMMENT ON COLUMN matches.cancelled_at IS '比赛取消时间，仅 cancelled 状态有值';
COMMENT ON COLUMN matches.finished_at IS '比赛完成时间，仅 finished 状态有值';
COMMENT ON COLUMN matches.deleted_at IS '草稿软删除时间；为空表示未删除';
COMMENT ON COLUMN matches.created_at IS '比赛创建时间';
COMMENT ON COLUMN matches.updated_at IS '比赛最后更新时间，由触发器维护';

COMMENT ON TABLE user_settings IS '用户级通知和分析默认设置，与用户一对一';
COMMENT ON COLUMN user_settings.user_id IS '设置所属用户，同时作为表主键';
COMMENT ON COLUMN user_settings.recipient_email IS '分析结果接收邮箱';
COMMENT ON COLUMN user_settings.default_timezone IS '默认 IANA 时区名称';
COMMENT ON COLUMN user_settings.default_analysis_lead_minutes IS '默认提前分析分钟数，范围为 0 至 10080';
COMMENT ON COLUMN user_settings.email_notifications_enabled IS '是否启用邮件通知';
COMMENT ON COLUMN user_settings.created_at IS '设置记录创建时间';
COMMENT ON COLUMN user_settings.updated_at IS '设置最后更新时间，由触发器维护';

COMMENT ON TABLE audit_logs IS '重要业务操作审计日志；用于追踪操作者、资源和请求';
COMMENT ON COLUMN audit_logs.id IS '单调递增的审计日志主键';
COMMENT ON COLUMN audit_logs.actor_user_id IS '执行操作的用户；用户删除后保留日志并置空';
COMMENT ON COLUMN audit_logs.action IS '稳定的操作名称，例如 match.create 或 prompt.version.create';
COMMENT ON COLUMN audit_logs.resource_type IS '被操作资源类型，例如 match 或 prompt_template';
COMMENT ON COLUMN audit_logs.resource_id IS '被操作资源的 UUID；资源不存在时可为空';
COMMENT ON COLUMN audit_logs.request_id IS 'API 请求标识，用于串联应用日志';
COMMENT ON COLUMN audit_logs.ip_address IS '发起操作的客户端 IP 地址';
COMMENT ON COLUMN audit_logs.user_agent IS '发起操作的客户端 User-Agent';
COMMENT ON COLUMN audit_logs.metadata IS '不包含密码、令牌或密钥的附加 JSON 对象';
COMMENT ON COLUMN audit_logs.created_at IS '审计日志创建时间';

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_updated_at() IS '在更新记录前自动刷新 updated_at 字段';

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER prompt_templates_set_updated_at
BEFORE UPDATE ON prompt_templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER matches_set_updated_at
BEFORE UPDATE ON matches
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER user_settings_set_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
