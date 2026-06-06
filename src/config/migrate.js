import "dotenv/config";
import mysql from "mysql2/promise";

// Separate connection for migration (not the pool)
const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const createTables = async () => {
  try {
    console.log("🔄 Running migrations...");

    // 1. PROFILES TABLE
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS profiles (
        id                        INT AUTO_INCREMENT PRIMARY KEY,
        username                  VARCHAR(100) NOT NULL UNIQUE,
        name                      VARCHAR(255),
        avatar_url                TEXT,
        bio                       TEXT,
        email                     VARCHAR(255),
        blog                      VARCHAR(255),
        company                   VARCHAR(255),
        location                  VARCHAR(255),
        twitter_username          VARCHAR(100),
        hireable                  BOOLEAN DEFAULT FALSE,

        public_repos              INT DEFAULT 0,
        public_gists              INT DEFAULT 0,
        followers                 INT DEFAULT 0,
        following                 INT DEFAULT 0,
        starred_repos             INT DEFAULT 0,

        developer_score           DECIMAL(5,2) DEFAULT 0.00,
        activity_tier             ENUM('Inactive', 'Casual', 'Active', 'Power User') DEFAULT 'Inactive',
        profile_completeness      INT DEFAULT 0,
        avg_stars_per_repo        DECIMAL(8,2) DEFAULT 0.00,
        avg_forks_per_repo        DECIMAL(8,2) DEFAULT 0.00,
        total_stars               INT DEFAULT 0,
        total_forks               INT DEFAULT 0,
        total_open_issues         INT DEFAULT 0,
        primary_language          VARCHAR(100),

        account_age_days          INT DEFAULT 0,
        github_created_at         DATETIME,
        github_updated_at         DATETIME,

        created_at                DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at                DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("  ✅ profiles table ready");

    // 2. REPOSITORIES TABLE
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS repositories (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        profile_id      INT NOT NULL,
        username        VARCHAR(100) NOT NULL,
        repo_name       VARCHAR(255) NOT NULL,
        description     TEXT,
        url             VARCHAR(500),
        language        VARCHAR(100),
        stars           INT DEFAULT 0,
        forks           INT DEFAULT 0,
        open_issues     INT DEFAULT 0,
        watchers        INT DEFAULT 0,
        is_fork         BOOLEAN DEFAULT FALSE,
        is_archived     BOOLEAN DEFAULT FALSE,
        repo_created_at DATETIME,
        repo_updated_at DATETIME,
        repo_pushed_at  DATETIME,
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
        INDEX idx_username (username),
        INDEX idx_stars (stars DESC),
        INDEX idx_language (language)
      )
    `);
    console.log("  ✅ repositories table ready");

    // 3. LANGUAGES TABLE
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS languages (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        profile_id    INT NOT NULL,
        username      VARCHAR(100) NOT NULL,
        language      VARCHAR(100) NOT NULL,
        repo_count    INT DEFAULT 0,
        percentage    DECIMAL(5,2) DEFAULT 0.00,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
        INDEX idx_username (username),
        INDEX idx_language (language)
      )
    `);
    console.log("  ✅ languages table ready");

    // 4. ANALYSIS META TABLE
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS analysis_meta (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        profile_id        INT NOT NULL,
        username          VARCHAR(100) NOT NULL,
        analyzed_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
        cache_expires_at  DATETIME,
        github_api_calls  INT DEFAULT 0,
        analysis_version  VARCHAR(10) DEFAULT '1.0',
        status            ENUM('success', 'failed', 'partial') DEFAULT 'success',
        notes             TEXT,

        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
        INDEX idx_username (username),
        INDEX idx_analyzed_at (analyzed_at DESC)
      )
    `);
    console.log("  ✅ analysis_meta table ready");

    console.log("\n✅ All migrations completed successfully!");

  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    throw err;
  } finally {
    await connection.end();
    process.exit(0);
  }
};

createTables();