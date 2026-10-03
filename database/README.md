# 数据库迁移

当前云数据库使用 PostgreSQL 17.11，`migrations/0001_initial_schema.sql` 与 PostgreSQL 17 及以上版本兼容。

在空数据库上执行首个迁移：

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/0001_initial_schema.sql
```

PowerShell：

```powershell
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/migrations/0001_initial_schema.sql
```

脚本使用事务执行。任意语句失败时不会保留只创建了一部分的表。

该迁移只创建表、约束、索引和更新时间触发器，不创建初始用户。用户密码必须由 API 使用 Argon2id 生成哈希后再写入，禁止向 SQL 文件提交明文密码。

如果迁移提示某张表已经存在，不要直接增加 `IF NOT EXISTS`，因为同名旧表的字段和约束可能与当前设计不同。先执行只读检查脚本：

```bash
psql "$DATABASE_URL" -f database/diagnostics/inspect_existing_schema.sql
```

根据检查结果选择保留数据并编写增量迁移，或在确认数据库没有需要保留的数据后清理旧结构再执行首个迁移。
