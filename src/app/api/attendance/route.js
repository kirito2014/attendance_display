import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db';

// --- Data Generation Functions (Your Logic) ---

export async function generateCheckinTrend(timeRange) {
  let data = [];
  try {
    if (timeRange === "today") {
      const query = `
        WITH RECURSIVE hours AS (
            SELECT 0 AS hour UNION ALL SELECT hour + 1 FROM hours WHERE hour < 23
        ),
        latest_date AS (
            SELECT max(atten_dt) AS max_dt FROM ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp
        ),
        checkin_data AS (
            SELECT HOUR(p1.EARLIEST_SINGIN_TM) AS hour, COUNT(*) AS checkin
            FROM ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp p1
            INNER JOIN ods_sunline.ods_sunline_psn_binfo p2 ON p1.EMPLY_NAME = p2.EMPLY_NAME AND IMPL_FLAG = 'Y'
            WHERE p1.ATTEN_DT = (SELECT max_dt FROM latest_date) AND p1.EARLIEST_SINGIN_TM IS NOT NULL
            GROUP BY HOUR(p1.EARLIEST_SINGIN_TM)
        )
        SELECT h.hour, COALESCE(c.checkin, 0) AS checkin
        FROM hours h LEFT JOIN checkin_data c ON h.hour = c.hour ORDER BY h.hour;
      `;
      const results = await queryDb(query);
      if (results.length > 0) {
        data = results.map(row => ({ time: `${row.hour}:00`, checkin: row.checkin }));
      }
    } else if (timeRange === "week") {
      // 查询本周每天数据
      const query = `
        WITH date_range AS (
                SELECT 
                    DATE_SUB(CURRENT_DATE(), INTERVAL n DAY) AS date
                FROM (
                    SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 
                    UNION SELECT 4 UNION SELECT 5 UNION SELECT 6
                ) AS days
            ),
            batch_0815 AS (
                SELECT
                    DATE(p1.STD_ATTEN_DT) AS date,
                    '0815' AS batch,
                    COUNT(*) AS checkin
                FROM
                    ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp p1
                INNER JOIN ods_sunline.ods_sunline_psn_binfo p2 
                    ON p1.EMPLY_NAME = p2.EMPLY_NAME AND IMPL_FLAG = 'Y'
                INNER JOIN ods_sunline.ods_in_bank_atten_base_info p3 
                    ON p2.emply_name = p3.emply_name
                WHERE
                    p3.atten_batch = '0815'
                    AND DATE(p1.STD_ATTEN_DT) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
                    AND p1.EARLIEST_SINGIN_TM IS NOT NULL
                GROUP BY
                    DATE(p1.STD_ATTEN_DT)
            ),
            batch_0850 AS (
                SELECT
                    DATE(p1.STD_ATTEN_DT) AS date,
                    '0850' AS batch,
                    COUNT(*) AS checkin
                FROM
                    ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp p1
                INNER JOIN ods_sunline.ods_sunline_psn_binfo p2 
                    ON p1.EMPLY_NAME = p2.EMPLY_NAME AND IMPL_FLAG = 'Y'
                INNER JOIN ods_sunline.ods_in_bank_atten_base_info p3 
                    ON p2.emply_name = p3.emply_name
                WHERE
                    p3.atten_batch = '0850'
                    AND DATE(p1.STD_ATTEN_DT) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
                    AND p1.EARLIEST_SINGIN_TM IS NOT NULL
                GROUP BY
                    DATE(p1.STD_ATTEN_DT)
            )
            SELECT 
                d.date as date,
                COALESCE(b0815.checkin, 0) + COALESCE(b0850.checkin, 0) AS checkin
            FROM 
                date_range d
            LEFT JOIN 
                batch_0815 b0815 ON d.date = b0815.date
            LEFT JOIN 
                batch_0850 b0850 ON d.date = b0850.date
            ORDER BY 
                d.date asc;
      `;
      const results = await queryDb(query);
      
      if (results && results.length > 0) {
        data = results.map(row => ({
          date: row.date.toISOString().split('T')[0].substring(5),
          checkin: row.checkin
        }));
      } else {
        // 模拟数据
        const now = new Date();
        for (let day = 0; day < 7; day++) {
          const date = new Date(now);
          date.setDate(date.getDate() - (6 - day));
          const formattedDate = date.toISOString().split('T')[0].substring(5);
          data.push({
            date: formattedDate,
            checkin: Math.floor(Math.random() * 40) + 100
          });
        }
      }
    } else if (timeRange === "month") {
      // 查询本月每周数据
      const query = `
        WITH 
            -- 获取当前月份的第一天和最后一天
            current_month AS (
                SELECT 
                    DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') AS first_day,
                    LAST_DAY(CURRENT_DATE()) AS last_day
            ),
            -- 生成当前月的所有周（最多6周）
            month_weeks AS (
                SELECT 
                    1 AS week_seq,
                    '第1周' AS week_name,
                    first_day AS week_start,
                    LEAST(DATE_ADD(first_day, INTERVAL 6 DAY), last_day) AS week_end
                FROM current_month
                UNION ALL SELECT 2, '第2周', DATE_ADD(first_day, INTERVAL 7 DAY), LEAST(DATE_ADD(first_day, INTERVAL 13 DAY), last_day) FROM current_month
                UNION ALL SELECT 3, '第3周', DATE_ADD(first_day, INTERVAL 14 DAY), LEAST(DATE_ADD(first_day, INTERVAL 20 DAY), last_day) FROM current_month
                UNION ALL SELECT 4, '第4周', DATE_ADD(first_day, INTERVAL 21 DAY), LEAST(DATE_ADD(first_day, INTERVAL 27 DAY), last_day) FROM current_month
                UNION ALL SELECT 5, '第5周', DATE_ADD(first_day, INTERVAL 28 DAY), last_day FROM current_month
                UNION ALL SELECT 6, '第6周', DATE_ADD(first_day, INTERVAL 35 DAY), last_day FROM current_month
                WHERE DATE_ADD(first_day, INTERVAL 35 DAY) <= last_day
            ),
            -- 0815批次每周统计
            batch_0815 AS (
                SELECT 
                    CEILING(DAYOFMONTH(p1.STD_ATTEN_DT)/7.0) AS week_seq,
                    COUNT(*) AS checkin
                FROM
                    ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp p1
                INNER JOIN ods_sunline.ods_sunline_psn_binfo p2 
                    ON p1.EMPLY_NAME = p2.EMPLY_NAME AND IMPL_FLAG = 'Y'
                INNER JOIN ods_sunline.ods_in_bank_atten_base_info p3 
                    ON p2.emply_name = p3.emply_name
                WHERE
                    p3.atten_batch = '0815'
                    AND p1.STD_ATTEN_DT BETWEEN (SELECT first_day FROM current_month) AND (SELECT last_day FROM current_month)
                    AND p1.EARLIEST_SINGIN_TM IS NOT NULL
                GROUP BY
                    CEILING(DAYOFMONTH(p1.STD_ATTEN_DT)/7.0)
            ),
            -- 0850批次每周统计
            batch_0850 AS (
                SELECT 
                    CEILING(DAYOFMONTH(p1.STD_ATTEN_DT)/7.0) AS week_seq,
                    COUNT(*) AS checkin
                FROM
                    ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp p1
                INNER JOIN ods_sunline.ods_sunline_psn_binfo p2 
                    ON p1.EMPLY_NAME = p2.EMPLY_NAME AND IMPL_FLAG = 'Y'
                INNER JOIN ods_sunline.ods_in_bank_atten_base_info p3 
                    ON p2.emply_name = p3.emply_name
                WHERE
                    p3.atten_batch = '0850'
                    AND p1.STD_ATTEN_DT BETWEEN (SELECT first_day FROM current_month) AND (SELECT last_day FROM current_month)
                    AND p1.EARLIEST_SINGIN_TM IS NOT NULL
                GROUP BY
                    CEILING(DAYOFMONTH(p1.STD_ATTEN_DT)/7.0)
            )
            -- 最终结果
            SELECT 
                mw.week_name AS week,
            --     COALESCE(b0815.checkin, 0) AS '0815批次签到数',
            --     COALESCE(b0850.checkin, 0) AS '0850批次签到数',
                COALESCE(b0815.checkin, 0) + COALESCE(b0850.checkin, 0) AS checkin
            FROM 
                month_weeks mw
            LEFT JOIN 
                batch_0815 b0815 ON mw.week_seq = b0815.week_seq
            LEFT JOIN 
                batch_0850 b0850 ON mw.week_seq = b0850.week_seq
            WHERE
                mw.week_start <= (SELECT last_day FROM current_month)
            ORDER BY 
                mw.week_seq;
      `;
      const results = await queryDb(query);
      
      if (results && results.length > 0) {
        data = results.map(row => ({
          week: row.week,
          checkin: row.checkin
        }));
      } else {
        // 模拟数据
        for (let week = 1; week <= 4; week++) {
          data.push({
            week: `第${week}周`,
            checkin: Math.floor(Math.random() * 100) + 450
          });
        }
      }
    } else if (timeRange === "quarter") {
      // 查询本季度每月数据
      const query = `
        WITH 
            -- 生成最近3个月的月份范围
            month_range AS (
                SELECT 
                    DATE_FORMAT(DATE_SUB(CURRENT_DATE(), INTERVAL 2 MONTH), '%Y-%m-01') AS month_start,
                    LAST_DAY(DATE_SUB(CURRENT_DATE(), INTERVAL 2 MONTH)) AS month_end,
                    DATE_FORMAT(DATE_SUB(CURRENT_DATE(), INTERVAL 2 MONTH), '%m') AS month_num,
                    DATE_FORMAT(DATE_SUB(CURRENT_DATE(), INTERVAL 2 MONTH), '%M') AS month_name_en
                UNION ALL
                SELECT 
                    DATE_FORMAT(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), '%Y-%m-01'),
                    LAST_DAY(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)),
                    DATE_FORMAT(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), '%m'),
                    DATE_FORMAT(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), '%M')
                UNION ALL
                SELECT 
                    DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01'),
                    LAST_DAY(CURRENT_DATE()),
                    DATE_FORMAT(CURRENT_DATE(), '%m'),
                    DATE_FORMAT(CURRENT_DATE(), '%M')
            ),
            -- 中文月份映射
            month_mapping AS (
                SELECT '01' AS num, '一月' AS name UNION ALL
                SELECT '02', '二月' UNION ALL
                SELECT '03', '三月' UNION ALL
                SELECT '04', '四月' UNION ALL
                SELECT '05', '五月' UNION ALL
                SELECT '06', '六月' UNION ALL
                SELECT '07', '七月' UNION ALL
                SELECT '08', '八月' UNION ALL
                SELECT '09', '九月' UNION ALL
                SELECT '10', '十月' UNION ALL
                SELECT '11', '十一月' UNION ALL
                SELECT '12', '十二月'
            ),
            -- 合并签到数据
            checkin_data AS (
                SELECT 
                    DATE_FORMAT(p1.STD_ATTEN_DT, '%Y-%m') AS month_key,
                    COUNT(*) AS total_checkin
                FROM
                    ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp p1
                INNER JOIN ods_sunline.ods_sunline_psn_binfo p2 
                    ON p1.EMPLY_NAME = p2.EMPLY_NAME AND IMPL_FLAG = 'Y'
                WHERE
                    p1.STD_ATTEN_DT BETWEEN DATE_SUB(DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01'), INTERVAL 2 MONTH) 
                                        AND LAST_DAY(CURRENT_DATE())
                    AND p1.EARLIEST_SINGIN_TM IS NOT NULL
                GROUP BY
                    DATE_FORMAT(p1.STD_ATTEN_DT, '%Y-%m')
            )
            -- 最终结果
            SELECT 
                mm.name AS 'month',
                COALESCE(cd.total_checkin, 0) AS 'checkin'
            FROM 
                month_range mr
            JOIN 
                month_mapping mm ON mr.month_num = mm.num
            LEFT JOIN 
                checkin_data cd ON DATE_FORMAT(mr.month_start, '%Y-%m') = cd.month_key
            ORDER BY 
                mr.month_start;
      `;
      const results = await queryDb(query);
      
      if (results && results.length > 0) {
        data = results.map(row => ({
          month: row.month,
          checkin: row.checkin
        }));
      } else {
        // 模拟数据
        const months = ['一月', '二月', '三月'];
        data = months.map(month => ({
          month: month,
          checkin: Math.floor(Math.random() * 300) + 1200
        }));
      }
    } 
    // ... [Include other timeRange logic from your original file]
    
    // Fallback Mock Data if DB returns empty or error (as per your original code structure)
    if (data.length === 0) {
        if(timeRange === 'today') for (let h=8; h<19; h++) data.push({time: `${h}:00`, checkin: Math.floor(Math.random()*15)+5});
        if(timeRange === 'week') for(let d=0; d<7; d++) data.push({date: `Day ${d+1}`, checkin: Math.floor(Math.random()*40)+100});
        if(timeRange === 'month') for(let d=1; d<=31; d++) data.push({date: `${d}`, checkin: Math.floor(Math.random()*30)+50});
        if(timeRange === 'quarter') for(let m=1; m<=4; m++) data.push({month: `Month ${m}`, checkin: Math.floor(Math.random()*80)+200});
    }
  } catch (error) {
    console.error('Error generating checkin trend:', error);
    // 生成模拟数据作为备份
    data = generateMockCheckinTrend(timeRange);
  }
  return data;
}

export async function generateLateDistribution(timeRange) {
let data = [];
  
  try {
    if (timeRange === "today") {
      // 查询今日迟到记录
      const query = `
        WITH latest_date AS (
                SELECT max(atten_dt) AS max_dt 
                FROM ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp
            ),
            batch_0815 AS (
                SELECT 
                    '0815' AS batch,
                    TIME_FORMAT(p1.EARLIEST_SINGIN_TM, '%H:%i') AS time,
                    TIMESTAMPDIFF(MINUTE, TIME('08:15:00'),time(p1.EARLIEST_SINGIN_TM)) AS delay
                FROM
                    ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp p1
                INNER JOIN ods_sunline.ods_sunline_psn_binfo p2 
                    ON p1.EMPLY_NAME = p2.EMPLY_NAME AND IMPL_FLAG = 'Y'
                INNER JOIN ods_sunline.ods_in_bank_atten_base_info p3 
                    ON p2.emply_name = p3.emply_name
                WHERE
                    p3.atten_batch = '0815'
                    AND p1.ATTEN_DT = (SELECT max_dt FROM latest_date)
                    AND p1.EARLIEST_SINGIN_TM IS NOT NULL
                    AND p1.EARLIEST_SINGIN_TM > TIME('08:15:00')
            ),
            batch_0850 AS (
                SELECT 
                    '0850' AS batch,
                    TIME_FORMAT(p1.EARLIEST_SINGIN_TM, '%H:%i') AS time,
                    TIMESTAMPDIFF(MINUTE, TIME('08:50:00'),time(p1.EARLIEST_SINGIN_TM)) AS delay
                FROM
                    ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp p1
                INNER JOIN ods_sunline.ods_sunline_psn_binfo p2 
                    ON p1.EMPLY_NAME = p2.EMPLY_NAME AND IMPL_FLAG = 'Y'
                INNER JOIN ods_sunline.ods_in_bank_atten_base_info p3 
                    ON p2.emply_name = p3.emply_name
                WHERE
                    p3.atten_batch = '0850'
                    AND p1.ATTEN_DT = (SELECT max_dt FROM latest_date)
                    AND p1.EARLIEST_SINGIN_TM IS NOT NULL
                    AND p1.EARLIEST_SINGIN_TM > TIME('08:50:00')
            )
            SELECT time,delay FROM batch_0815
            UNION ALL
            SELECT time,delay FROM batch_0850
            ORDER BY  time;
      `;
      const results = await queryDb(query);
      
      if (results && results.length > 0) {
        data = results.map(row => ({
          time: row.time,
          delay: row.delay
        }));
      } else {
        // 模拟数据
        for (let i = 0; i < 30; i++) {
          const hour = Math.floor(Math.random() * 2) + 8; // 8-9点
          const minute = Math.floor(Math.random() * 59) + 1;
          const delay = Math.floor(Math.random() * 60) + 1;
          data.push({
            time: `${hour}:${minute.toString().padStart(2, '0')}`,
            delay: delay
          });
        }
      }
    } else if (timeRange === "week") {
      // 查询本周迟到记录
      const query = `
        WITH 
            -- 获取本周一日期
            week_start AS (
                SELECT DATE_SUB(CURRENT_DATE(), INTERVAL WEEKDAY(CURRENT_DATE()) DAY) AS monday
            ),
            -- 生成完整一周的日期（周一到周日）
            week_days AS (
                SELECT 
                    DATE_ADD((SELECT monday FROM week_start), INTERVAL 0 DAY) AS day,
                    '1' AS day_name
                UNION ALL
                SELECT 
                    DATE_ADD((SELECT monday FROM week_start), INTERVAL 1 DAY) AS day,
                    '2' AS day_name
                UNION ALL
                SELECT 
                    DATE_ADD((SELECT monday FROM week_start), INTERVAL 2 DAY) AS day,
                    '3' AS day_name
                UNION ALL
                SELECT 
                    DATE_ADD((SELECT monday FROM week_start), INTERVAL 3 DAY) AS day,
                    '4' AS day_name
                UNION ALL
                SELECT 
                    DATE_ADD((SELECT monday FROM week_start), INTERVAL 4 DAY) AS day,
                    '5' AS day_name
                UNION ALL
                SELECT 
                    DATE_ADD((SELECT monday FROM week_start), INTERVAL 5 DAY) AS day,
                    '6' AS day_name
                UNION ALL
                SELECT 
                    DATE_ADD((SELECT monday FROM week_start), INTERVAL 6 DAY) AS day,
                    '7' AS day_name
            ),
            -- 0815批次当周迟到数据
            batch_0815_late AS (
                SELECT 
                    DATE(p1.STD_ATTEN_DT) AS day,
                    COUNT(*) AS late_count
                FROM
                    ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp p1
                INNER JOIN ods_sunline.ods_sunline_psn_binfo p2 
                    ON p1.EMPLY_NAME = p2.EMPLY_NAME AND p2.IMPL_FLAG = 'Y'
                INNER JOIN ods_sunline.ods_in_bank_atten_base_info p3 
                    ON p2.emply_name = p3.emply_name
                WHERE
                    p3.atten_batch = '0815'
                    AND p1.STD_ATTEN_DT BETWEEN (SELECT monday FROM week_start) 
                                        AND DATE_ADD((SELECT monday FROM week_start), INTERVAL 6 DAY)
                    AND p1.EARLIEST_SINGIN_TM IS NOT NULL
                    AND TIME(p1.EARLIEST_SINGIN_TM) > TIME('08:15:00')
                GROUP BY
                    DATE(p1.STD_ATTEN_DT)
            ),
            -- 0850批次当周迟到数据
            batch_0850_late AS (
                SELECT 
                    DATE(p1.STD_ATTEN_DT) AS day,
                    COUNT(*) AS late_count
                FROM
                    ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp p1
                INNER JOIN ods_sunline.ods_sunline_psn_binfo p2 
                    ON p1.EMPLY_NAME = p2.EMPLY_NAME AND p2.IMPL_FLAG = 'Y'
                INNER JOIN ods_sunline.ods_in_bank_atten_base_info p3 
                    ON p2.emply_name = p3.emply_name
                WHERE
                    p3.atten_batch = '0850'
                    AND p1.STD_ATTEN_DT BETWEEN (SELECT monday FROM week_start) 
                                        AND DATE_ADD((SELECT monday FROM week_start), INTERVAL 6 DAY)
                    AND p1.EARLIEST_SINGIN_TM IS NOT NULL
                    AND TIME(p1.EARLIEST_SINGIN_TM) > TIME('08:50:00')
                GROUP BY
                    DATE(p1.STD_ATTEN_DT)
            ),
            -- 合并两个批次的迟到数据
            combined_late AS (
                SELECT day, late_count FROM batch_0815_late
                UNION ALL
                SELECT day, late_count FROM batch_0850_late
            ),
            -- 按天汇总迟到人数
            daily_late AS (
                SELECT 
                    day,
                    SUM(late_count) AS total_late
                FROM 
                    combined_late
                GROUP BY 
                    day
            )
            -- 最终结果：显示完整一周，包括没有迟到记录的日期
            SELECT 
                
                w.day_name AS day,
                COALESCE(d.total_late, 0) AS late_count
            FROM 
                week_days w
            LEFT JOIN 
                daily_late d ON w.day = d.day
            ORDER BY 
                w.day_name;
      `;
      const results = await queryDb(query);
      
      if (results && results.length > 0) {
        data = results.map(row => ({
          day: row.day,
          late_count: row.late_count
        }));
      } else {
        // 模拟数据
        data = Array.from({length: 7}, (_, i) => ({
          day: `${i + 1}`,
          late_count: Math.floor(Math.random() * 10) + 1
        }));
      }
    } else if (timeRange === "month") {
      // 查询本月迟到记录
      const query = `
        WITH 
            -- 获取当月1号和当前日期
            current_month AS (
                SELECT 
                    DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01') AS first_day,
                    CURRENT_DATE() AS today
            ),
            -- 生成当月1号到今天的日期序列
            month_days AS (
                SELECT 
                    day_of_month AS day,
                    DATE_ADD((SELECT first_day FROM current_month), INTERVAL day_of_month-1 DAY) AS full_date
                FROM (
                    SELECT 1 AS day_of_month UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
                    UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
                    UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
                    UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
                    UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25
                    UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30
                    UNION SELECT 31
                ) AS days
                WHERE 
                    day_of_month <= DAY((SELECT today FROM current_month))
            ),
            -- 0815批次当月迟到数据
            batch_0815_late AS (
                SELECT 
                    DAY(p1.STD_ATTEN_DT) AS day,
                    COUNT(*) AS late_count
                FROM
                    ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp p1
                INNER JOIN ods_sunline.ods_sunline_psn_binfo p2 
                    ON p1.EMPLY_NAME = p2.EMPLY_NAME AND p2.IMPL_FLAG = 'Y'
                INNER JOIN ods_sunline.ods_in_bank_atten_base_info p3 
                    ON p2.emply_name = p3.emply_name
                WHERE
                    p3.atten_batch = '0815'
                    AND p1.STD_ATTEN_DT BETWEEN (SELECT first_day FROM current_month) 
                                        AND (SELECT today FROM current_month)
                    AND p1.EARLIEST_SINGIN_TM IS NOT NULL
                    AND TIME(p1.EARLIEST_SINGIN_TM) > TIME('08:15:00')
                GROUP BY
                    DAY(p1.STD_ATTEN_DT)
            ),
            -- 0850批次当月迟到数据
            batch_0850_late AS (
                SELECT 
                    DAY(p1.STD_ATTEN_DT) AS day,
                    COUNT(*) AS late_count
                FROM
                    ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp p1
                INNER JOIN ods_sunline.ods_sunline_psn_binfo p2 
                    ON p1.EMPLY_NAME = p2.EMPLY_NAME AND p2.IMPL_FLAG = 'Y'
                INNER JOIN ods_sunline.ods_in_bank_atten_base_info p3 
                    ON p2.emply_name = p3.emply_name
                WHERE
                    p3.atten_batch = '0850'
                    AND p1.STD_ATTEN_DT BETWEEN (SELECT first_day FROM current_month) 
                                        AND (SELECT today FROM current_month)
                    AND p1.EARLIEST_SINGIN_TM IS NOT NULL
                    AND TIME(p1.EARLIEST_SINGIN_TM) > TIME('08:50:00')
                GROUP BY
                    DAY(p1.STD_ATTEN_DT)
            ),
            -- 合并两个批次的迟到数据
            combined_late AS (
                SELECT day, late_count FROM batch_0815_late
                UNION ALL
                SELECT day, late_count FROM batch_0850_late
            ),
            -- 按天汇总迟到人数
            daily_late AS (
                SELECT 
                    day,
                    SUM(late_count) AS total_late
                FROM 
                    combined_late
                GROUP BY 
                    day
            )
            -- 最终结果：显示当月1号到今天的每天迟到人数
            SELECT 
                m.day,
                COALESCE(d.total_late, 0) AS late_count
            FROM 
                month_days m
            LEFT JOIN 
                daily_late d ON m.day = d.day
            ORDER BY 
                m.day;
      `;
      const results = await queryDb(query);
      
      if (results && results.length > 0) {
        data = results.map(row => ({
          day: row.day,
          late_count: row.late_count
        }));
      } else {
        // 模拟数据
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        data = Array.from({length: daysInMonth}, (_, i) => ({
          day: i + 1,
          late_count: Math.floor(Math.random() * 8) + 1
        }));
      }
    } else if (timeRange === "quarter") {
      // 查询本季度迟到记录
      const query = `
        WITH 
            -- 获取当前季度的第一天和当前日期
            current_quarter AS (
                SELECT 
                    CASE 
                        WHEN MONTH(CURRENT_DATE()) BETWEEN 1 AND 3 THEN DATE_FORMAT(CURRENT_DATE(), '%Y-01-01')
                        WHEN MONTH(CURRENT_DATE()) BETWEEN 4 AND 6 THEN DATE_FORMAT(CURRENT_DATE(), '%Y-04-01')
                        WHEN MONTH(CURRENT_DATE()) BETWEEN 7 AND 9 THEN DATE_FORMAT(CURRENT_DATE(), '%Y-07-01')
                        ELSE DATE_FORMAT(CURRENT_DATE(), '%Y-10-01')
                    END AS quarter_start,
                    CURRENT_DATE() AS today
            ),
            -- 生成季度开始到今天的日期序列（带序号）
            quarter_days AS (
                SELECT 
                    ROW_NUMBER() OVER () AS day,
                    date_series.date
                FROM (
                    SELECT 
                        DATE_ADD((SELECT quarter_start FROM current_quarter), INTERVAL seq DAY) AS date
                    FROM (
                        SELECT 0 AS seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
                        UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
                        UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
                        UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
                        UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24
                        UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
                        UNION SELECT 30 UNION SELECT 31 UNION SELECT 32 UNION SELECT 33 UNION SELECT 34
                        UNION SELECT 35 UNION SELECT 36 UNION SELECT 37 UNION SELECT 38 UNION SELECT 39
                        UNION SELECT 40 UNION SELECT 41 UNION SELECT 42 UNION SELECT 43 UNION SELECT 44
                        UNION SELECT 45 UNION SELECT 46 UNION SELECT 47 UNION SELECT 48 UNION SELECT 49
                        UNION SELECT 50 UNION SELECT 51 UNION SELECT 52 UNION SELECT 53 UNION SELECT 54
                        UNION SELECT 55 UNION SELECT 56 UNION SELECT 57 UNION SELECT 58 UNION SELECT 59
                        UNION SELECT 60 UNION SELECT 61 UNION SELECT 62 UNION SELECT 63 UNION SELECT 64
                        UNION SELECT 65 UNION SELECT 66 UNION SELECT 67 UNION SELECT 68 UNION SELECT 69
                        UNION SELECT 70 UNION SELECT 71 UNION SELECT 72 UNION SELECT 73 UNION SELECT 74
                        UNION SELECT 75 UNION SELECT 76 UNION SELECT 77 UNION SELECT 78 UNION SELECT 79
                        UNION SELECT 80 UNION SELECT 81 UNION SELECT 82 UNION SELECT 83 UNION SELECT 84
                        UNION SELECT 85 UNION SELECT 86 UNION SELECT 87 UNION SELECT 88 UNION SELECT 89
                        UNION SELECT 90 UNION SELECT 91 UNION SELECT 92 -- 最多92天（3个月+）
                    ) AS seq_nums
                    WHERE 
                        DATE_ADD((SELECT quarter_start FROM current_quarter), INTERVAL seq DAY) <= 
                        (SELECT today FROM current_quarter)
                ) AS date_series
            ),
            -- 0815批次当季迟到数据
            batch_0815_late AS (
                SELECT 
                    DATEDIFF(p1.STD_ATTEN_DT, (SELECT quarter_start FROM current_quarter)) + 1 AS day,
                    COUNT(*) AS late_count
                FROM
                    ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp p1
                INNER JOIN ods_sunline.ods_sunline_psn_binfo p2 
                    ON p1.EMPLY_NAME = p2.EMPLY_NAME AND p2.IMPL_FLAG = 'Y'
                INNER JOIN ods_sunline.ods_in_bank_atten_base_info p3 
                    ON p2.emply_name = p3.emply_name
                WHERE
                    p3.atten_batch = '0815'
                    AND p1.STD_ATTEN_DT BETWEEN (SELECT quarter_start FROM current_quarter) 
                                        AND (SELECT today FROM current_quarter)
                    AND p1.EARLIEST_SINGIN_TM IS NOT NULL
                    AND TIME(p1.EARLIEST_SINGIN_TM) > TIME('08:15:00')
                GROUP BY
                    DATEDIFF(p1.STD_ATTEN_DT, (SELECT quarter_start FROM current_quarter)) + 1
            ),
            -- 0850批次当季迟到数据
            batch_0850_late AS (
                SELECT 
                    DATEDIFF(p1.STD_ATTEN_DT, (SELECT quarter_start FROM current_quarter)) + 1 AS day,
                    COUNT(*) AS late_count
                FROM
                    ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp p1
                INNER JOIN ods_sunline.ods_sunline_psn_binfo p2 
                    ON p1.EMPLY_NAME = p2.EMPLY_NAME AND p2.IMPL_FLAG = 'Y'
                INNER JOIN ods_sunline.ods_in_bank_atten_base_info p3 
                    ON p2.emply_name = p3.emply_name
                WHERE
                    p3.atten_batch = '0850'
                    AND p1.STD_ATTEN_DT BETWEEN (SELECT quarter_start FROM current_quarter) 
                                        AND (SELECT today FROM current_quarter)
                    AND p1.EARLIEST_SINGIN_TM IS NOT NULL
                    AND TIME(p1.EARLIEST_SINGIN_TM) > TIME('08:50:00')
                GROUP BY
                    DATEDIFF(p1.STD_ATTEN_DT, (SELECT quarter_start FROM current_quarter)) + 1
            ),
            -- 合并两个批次的迟到数据
            combined_late AS (
                SELECT day, late_count FROM batch_0815_late
                UNION ALL
                SELECT day, late_count FROM batch_0850_late
            ),
            -- 按天汇总迟到人数
            daily_late AS (
                SELECT 
                    day,
                    SUM(late_count) AS total_late
                FROM 
                    combined_late
                GROUP BY 
                    day
            )
            -- 最终结果：显示当季第1天到今天的每天迟到人数
            SELECT 
                q.day,
                COALESCE(d.total_late, 0) AS late_count
            FROM 
                quarter_days q
            LEFT JOIN 
                daily_late d ON q.day = d.day
            ORDER BY 
                q.day;
      `;
      const results = await queryDb(query);
      
      if (results && results.length > 0) {
        data = results.map(row => ({
          day: row.day,
          late_count: row.late_count
        }));
      } else {
        // 模拟数据
        const months = ['一月', '二月', '三月'];
        data = months.map(month => ({
          month: month,
          late_count: Math.floor(Math.random() * 100) + 150
        }));
      }
    }
  } catch (error) {
    console.error('Error generating late distribution:', error);
    // 生成模拟数据作为备份
    data = generateMockLateDistribution(timeRange);
  }
  
  return data;
}

export async function generateOvertimeData() {
  let data = [];
  
  try {
    const query = `
      WITH 
      -- 获取最近一个月的数据
      recent_month AS (
        SELECT DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH) AS start_date
      ),
      -- 部门加班数据
      dept_overtime AS (
        SELECT 
          p2.BLG_DEPT AS department,
          ROUND(SUM(TIMESTAMPDIFF(MINUTE, '18:00:00', TIME(p1.LATST_SIGNOUT_TM)) / 60.0), 1) AS overtime_hours
        FROM
          ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp p1
        INNER JOIN ods_sunline.ods_sunline_psn_binfo p2 
          ON p1.EMPLY_NAME = p2.EMPLY_NAME AND p2.IMPL_FLAG = 'Y'
        WHERE
          p1.STD_ATTEN_DT >= (SELECT start_date FROM recent_month)
          AND p1.LATST_SIGNOUT_TM IS NOT NULL
          AND TIME(p1.LATST_SIGNOUT_TM) > '18:00:00'
        GROUP BY
          p2.BLG_DEPT
        ORDER BY
          overtime_hours DESC
        LIMIT 6
      )
      SELECT * FROM dept_overtime;
    `;
    const results = await queryDb(query);
    
    if (results && results.length > 0) {
      data = results.map(row => ({
        department: row.department,
        overtime_hours: parseFloat(row.overtime_hours)
      }));
    } else {
      // 模拟数据
      const departments = ['对公组', '零售组', '信贷组', '资管组', '通用组', '自助分析'];
      data = departments.map(dept => ({
        department: dept,
        overtime_hours: Math.floor(Math.random() * 50) + 10
      }));
    }
  } catch (error) {
    console.error('Error generating overtime data:', error);
    // 生成模拟数据作为备份
    const departments = ['对公组', '零售组', '信贷组', '资管组', '通用组', '自助分析'];
    data = departments.map(dept => ({
      department: dept,
      overtime_hours: Math.floor(Math.random() * 50) + 10
    }));
  }
  
  return data;  
}

export async function generateBatchDistribution() {
  let data = [];
  
  try {
    // 获取最新日期
    const latestDateQuery = `
      SELECT max(atten_dt) AS max_dt 
      FROM ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp
    `;
    const latestDateResult = await queryDb(latestDateQuery);
    const latestDate = latestDateResult && latestDateResult.length > 0 ? latestDateResult[0].max_dt : null;
    
    if (latestDate) {
      const query = `
        SELECT 
          p3.atten_batch AS batch,
          COUNT(*) AS count
        FROM
          ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp p1
        INNER JOIN ods_sunline.ods_sunline_psn_binfo p2 
          ON p1.EMPLY_NAME = p2.EMPLY_NAME AND p2.IMPL_FLAG = 'Y'
        INNER JOIN ods_sunline.ods_in_bank_atten_base_info p3 
          ON p2.emply_name = p3.emply_name
        WHERE
          p1.ATTEN_DT = ?
          AND p1.EARLIEST_SINGIN_TM IS NOT NULL
        GROUP BY
          p3.atten_batch
      `;
      const results = await queryDb(query, [latestDate]);
      
      if (results && results.length > 0) {
        data = results.map(row => ({
          batch: row.batch,
          count: row.count
        }));
      }
    }
    
    if (data.length === 0) {
      // 模拟数据
      data = [
        { batch: '0815', count: 85 },
        { batch: '0850', count: 65 }
      ];
    }
  } catch (error) {
    console.error('Error generating batch distribution:', error);
    // 生成模拟数据作为备份
    data = [
      { batch: '0815', count: 85 },
      { batch: '0850', count: 65 }
    ];
  }
  
  return data;
}

export async function generateAttendanceStats() {
  let stats = {
    checkinCount: 0,
    lateCount: 0,
    totalEmployees: 0,
    totalPresent: 0,
    lateRate: 0
  };
  
  try {
    // 获取最新日期
    const latestDateQuery = `
      SELECT max(atten_dt) AS max_dt 
      FROM ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp
    `;
    const latestDateResult = await queryDb(latestDateQuery);
    const latestDate = latestDateResult && latestDateResult.length > 0 ? latestDateResult[0].max_dt : null;
    
    if (latestDate) {
      // 获取签到人数
      const checkinQuery = `
        SELECT COUNT(*) AS checkin_count
        FROM ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp p1
        INNER JOIN ods_sunline.ods_sunline_psn_binfo p2 
          ON p1.EMPLY_NAME = p2.EMPLY_NAME AND p2.IMPL_FLAG = 'Y'
        WHERE
          p1.ATTEN_DT = ? AND p1.EARLIEST_SINGIN_TM IS NOT NULL
      `;
      const checkinResult = await queryDb(checkinQuery, [latestDate]);
      stats.checkinCount = checkinResult && checkinResult.length > 0 ? checkinResult[0].checkin_count : 0;
      
      // 获取迟到人数
      const lateQuery = `
        SELECT COUNT(*) AS late_count
        FROM ods_sunline.ods_in_bank_psn_atten_dtl_in_bank_exp p1
        INNER JOIN ods_sunline.ods_sunline_psn_binfo p2 
          ON p1.EMPLY_NAME = p2.EMPLY_NAME AND p2.IMPL_FLAG = 'Y'
        INNER JOIN ods_sunline.ods_in_bank_atten_base_info p3 
          ON p2.emply_name = p3.emply_name
        WHERE
          p1.ATTEN_DT = ?
          AND (
            (p3.atten_batch = '0815' AND p1.EARLIEST_SINGIN_TM > TIME('08:15:00'))
            OR (p3.atten_batch = '0850' AND p1.EARLIEST_SINGIN_TM > TIME('08:50:00'))
          )
      `;
      const lateResult = await queryDb(lateQuery, [latestDate]);
      stats.lateCount = lateResult && lateResult.length > 0 ? lateResult[0].late_count : 0;
      
      // 获取总员工数
      const totalEmployeesQuery = `
        SELECT COUNT(*) AS total_count
        FROM ods_sunline.ods_sunline_psn_binfo
        WHERE IMPL_FLAG = 'Y'
      `;
      const totalEmployeesResult = await queryDb(totalEmployeesQuery);
      stats.totalEmployees = totalEmployeesResult && totalEmployeesResult.length > 0 ? totalEmployeesResult[0].total_count : 0;
      
      // 获取在场人数（假设是当天签到的人数）
      stats.totalPresent = stats.checkinCount;
      
      // 计算迟到率
      stats.lateRate = stats.checkinCount > 0 ? 
        Math.round((stats.lateCount / stats.checkinCount) * 100) : 0;
    }
  } catch (error) {
    console.error('Error generating attendance stats:', error);
    // 生成模拟数据作为备份
    stats = {
      checkinCount: Math.floor(Math.random() * 50) + 100,
      lateCount: Math.floor(Math.random() * 20) + 5,
      totalEmployees: 150,
      totalPresent: Math.floor(Math.random() * 50) + 100,
      lateRate: Math.floor(Math.random() * 15) + 5
    };
  }
  
  return stats;
}
// 生成模拟签到趋势数据
function generateMockCheckinTrend(timeRange) {
  let data = [];
  
  if (timeRange === "today") {
    for (let hour = 8; hour < 19; hour++) {
      data.push({
        time: `${hour}:00`,
        checkin: Math.floor(Math.random() * 15) + 5
      });
    }
  } else if (timeRange === "week") {
    const now = new Date();
    for (let day = 0; day < 7; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - day));
      const formattedDate = date.toISOString().split('T')[0].substring(5);
      data.push({
        date: formattedDate,
        checkin: Math.floor(Math.random() * 40) + 100
      });
    }
  } else if (timeRange === "month") {
    for (let week = 1; week <= 4; week++) {
      data.push({
        week: `第${week}周`,
        checkin: Math.floor(Math.random() * 100) + 450
      });
    }
  } else if (timeRange === "quarter") {
    const months = ['一月', '二月', '三月'];
    data = months.map(month => ({
      month: month,
      checkin: Math.floor(Math.random() * 300) + 1200
    }));
  }
  
  return data;
}

// 生成模拟迟到分布数据
function generateMockLateDistribution(timeRange) {
  let data = [];
  
  if (timeRange === "today") {
    for (let i = 0; i < 30; i++) {
      const hour = Math.floor(Math.random() * 2) + 8; // 8-9点
      const minute = Math.floor(Math.random() * 59) + 1;
      const delay = Math.floor(Math.random() * 60) + 1;
      data.push({
        time: `${hour}:${minute.toString().padStart(2, '0')}`,
        delay: delay
      });
    }
  } else if (timeRange === "week") {
    data = Array.from({length: 7}, (_, i) => ({
      day: `${i + 1}`,
      late_count: Math.floor(Math.random() * 10) + 1
    }));
  } else if (timeRange === "month") {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    data = Array.from({length: daysInMonth}, (_, i) => ({
      day: i + 1,
      late_count: Math.floor(Math.random() * 8) + 1
    }));
  } else if (timeRange === "quarter") {
    const months = ['一月', '二月', '三月'];
    data = months.map(month => ({
      month: month,
      late_count: Math.floor(Math.random() * 100) + 150
    }));
  }
  
  return data;
}

// MAIN API HANDLER
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'today';
    
    // In a real scenario, ensure you paste the FULL logic from your route.js file
    // into the functions above.
    
    // Execute all data fetchers
    const [
      checkinTrend,
      lateDistribution,
      overtimeData,
      batchDistribution,
      attendanceStats
    ] = await Promise.all([
      generateCheckinTrend(timeRange),
      generateLateDistribution(timeRange),
      generateOvertimeData(),
      generateBatchDistribution(),
      generateAttendanceStats()
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        checkinTrend,
        lateDistribution,
        overtimeData,
        batchDistribution,
        attendanceStats,
        timeRange
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance data' },
      { status: 500 }
    );
  }
}