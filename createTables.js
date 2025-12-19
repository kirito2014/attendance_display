const mysql = require('mysql2/promise');

// 从环境变量获取数据库配置
require('dotenv').config({ path: '.env.local' });

const dbConfig = {
  host: process.env.NEXT_SECRET_DB_HOST,
  user: process.env.NEXT_SECRET_DB_USER,
  password: process.env.NEXT_SECRET_DB_PASSWORD,
  database: process.env.NEXT_SECRET_DB_NAME,
  port: parseInt(process.env.NEXT_SECRET_DB_PORT || '3306'),
  charset: process.env.NEXT_SECRET_DB_CHARSET,
};

// SQL语句
const sqlStatements = `
-- 1. 维度表
CREATE TABLE IF NOT EXISTS sys_dimensions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    key_name VARCHAR(50) NOT NULL UNIQUE COMMENT '维度标识,如 day, week',
    label VARCHAR(50) NOT NULL COMMENT '显示名称,如 日视图',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. KPI 卡片配置表 (级联删除)
CREATE TABLE IF NOT EXISTS sys_kpi_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dimension_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    icon VARCHAR(50) DEFAULT 'fa-chart-bar',
    sql_query TEXT NOT NULL COMMENT '查询结果必须包含 value 字段',
    color_class VARCHAR(50) DEFAULT 'text-blue-600',
    bg_class VARCHAR(50) DEFAULT 'bg-blue-50',
    sort_order INT DEFAULT 0,
    FOREIGN KEY (dimension_id) REFERENCES sys_dimensions(id) ON DELETE CASCADE
);

-- 3. 图表配置表 (级联删除)
CREATE TABLE IF NOT EXISTS sys_charts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dimension_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    subtitle VARCHAR(200),
    chart_type VARCHAR(20) DEFAULT 'line' COMMENT 'line, bar, doughnut',
    icon VARCHAR(50) DEFAULT 'fa-chart-line',
    sql_query TEXT NOT NULL COMMENT '查询结果需符合图表数据格式',
    sort_order INT DEFAULT 0,
    FOREIGN KEY (dimension_id) REFERENCES sys_dimensions(id) ON DELETE CASCADE
);

-- 插入默认数据以防止页面空白
INSERT IGNORE INTO sys_dimensions (key_name, label, sort_order) VALUES ('day', '日视图', 1);
INSERT IGNORE INTO sys_dimensions (key_name, label, sort_order) VALUES ('week', '周视图', 2);
INSERT IGNORE INTO sys_dimensions (key_name, label, sort_order) VALUES ('month', '月视图', 3);
INSERT IGNORE INTO sys_dimensions (key_name, label, sort_order) VALUES ('quarter', '季度视图', 4);
`;

// 执行SQL语句
async function createTables() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully!');
    
    // 分割SQL语句并逐个执行
    const sqlStatementsArray = sqlStatements
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    for (const statement of sqlStatementsArray) {
      await connection.query(statement);
    }
    
    console.log('Tables created successfully!');
    
    // 关闭连接
    await connection.end();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error creating tables:', error);
    if (connection) {
      await connection.end();
    }
  }
}

// 执行函数
createTables();