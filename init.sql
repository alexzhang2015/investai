-- InvestAI 数据库初始化脚本

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    risk_profile JSONB DEFAULT '{"level": "moderate", "experience": "intermediate"}',
    subscription_plan VARCHAR(20) DEFAULT 'free',
    subscription_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stocks (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    market VARCHAR(20) NOT NULL,
    industry VARCHAR(50),
    sector VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analysis_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    stock_code VARCHAR(10) REFERENCES stocks(code),
    task_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    input_params JSONB DEFAULT '{}',
    result JSONB DEFAULT '{}',
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    stock_code VARCHAR(10) REFERENCES stocks(code),
    recommendation VARCHAR(20) NOT NULL,
    confidence VARCHAR(10),
    target_price DECIMAL(10,2),
    stop_loss DECIMAL(10,2),
    analysis_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_analysis_tasks_user_id ON analysis_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_tasks_stock_code ON analysis_tasks(stock_code);
CREATE INDEX IF NOT EXISTS idx_analysis_tasks_created_at ON analysis_tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON stock_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_stock_code ON stock_recommendations(stock_code);

-- 插入示例数据
INSERT INTO stocks (code, name, market, industry, sector) VALUES
('00700', '腾讯控股', 'HK', '互联网', '科技'),
('00941', '中国移动', 'HK', '电信', '通信'),
('01398', '工商银行', 'HK', '银行', '金融'),
('AAPL', '苹果公司', 'US', '科技', '消费电子'),
('MSFT', '微软公司', 'US', '科技', '软件'),
('600036', '招商银行', 'CN', '银行', '金融')
ON CONFLICT (code) DO NOTHING;

-- 创建更新触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();