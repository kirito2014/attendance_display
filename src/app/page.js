'use client';

import { useEffect, useState, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import '@fortawesome/fontawesome-free/css/all.min.css';

export default function Dashboard() {
  const [dimension, setDimension] = useState('day'); // 'day' maps to 'today' in your API logic
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [timeFormat, setTimeFormat] = useState('default'); // 'default' or 'detailed'

  // Chart References
  const trendChartRef = useRef(null);
  const lateChartRef = useRef(null);
  const overtimeChartRef = useRef(null);
  const batchChartRef = useRef(null);
  
  // Chart Instances to destroy before re-rendering
  const charts = useRef({ trend: null, late: null, overtime: null, batch: null });

  // 辅助函数：获取周数
  const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
  };

  // 辅助函数：获取周一的日期
  const getMonday = (d) => {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  // 辅助函数：获取周日的日期
  const getSunday = (d) => {
    const monday = getMonday(d);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return sunday;
  };

  // 辅助函数：获取季度
  const getQuarter = (d) => {
    const month = d.getMonth();
    return Math.floor(month / 3) + 1;
  };

  // 1. Time Clock with different dimension display
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      // 日维度下的详细时间格式
      if (dimension === 'day' && timeFormat === 'detailed') {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        // 确定时间段
        let period = '';
        if (hours >= 5 && hours < 12) {
          period = '早上';
        } else if (hours >= 12 && hours < 14) {
          period = '中午';
        } else if (hours >= 14 && hours < 18) {
          period = '下午';
        } else if (hours >= 18 && hours < 22) {
          period = '晚上';
        } else {
          period = '凌晨';
        }
        
        setCurrentTime(`${year}年${month}月${day}日 ${period} ${hours}:${minutes}:${seconds}`);
      } else {
        // 默认的时间格式
        const options = {
          day: {
            date: now.toLocaleDateString('zh-CN'),
            weekday: now.toLocaleDateString('zh-CN', { weekday: 'long' })
          },
          week: {
            date: `第${getWeekNumber(now)}周 (${getMonday(now).toLocaleDateString('zh-CN')} - ${getSunday(now).toLocaleDateString('zh-CN')})`,
            weekday: now.toLocaleDateString('zh-CN', { weekday: 'long' })
          },
          month: {
            date: `${now.getFullYear()}年${now.getMonth() + 1}月`,
            weekday: now.toLocaleDateString('zh-CN', { weekday: 'long' })
          },
          quarter: {
            date: `${now.getFullYear()}年第${getQuarter(now)}季度`,
            weekday: now.toLocaleDateString('zh-CN', { weekday: 'long' })
          }
        };
        setCurrentTime(`${options[dimension].date} ${options[dimension].weekday}`);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [dimension, timeFormat]);

  // 2. Fetch Data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Map frontend dimension names to API timeRange names
        const apiRange = dimension === 'day' ? 'today' : dimension;
        const res = await fetch(`/api/attendance?timeRange=${apiRange}`);
        const result = await res.json();
        if (result.success) {
          setData(result.data);
          updateCharts(result.data, dimension);
        }
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dimension]);

  // 3. Chart Logic
  const updateCharts = (apiData, currentDim) => {
    const { checkinTrend, lateDistribution, overtimeData, batchDistribution } = apiData;

    // --- Chart 1: Sign Checkin Trend ---
    if (charts.current.trend) charts.current.trend.destroy();
    if (trendChartRef.current) {
      const ctx1 = trendChartRef.current.getContext('2d');
      const gradientBlue = ctx1.createLinearGradient(0, 0, 0, 400);
      gradientBlue.addColorStop(0, 'rgba(79, 70, 229, 0.2)');
      gradientBlue.addColorStop(1, 'rgba(79, 70, 229, 0)');

      charts.current.trend = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: checkinTrend.map(item => item.time || item.date || item.week || item.month),
        datasets: [{
          label: '签到人数',
          data: checkinTrend.map(item => item.checkin),
          borderColor: '#4f46e5',
          backgroundColor: gradientBlue,
          borderWidth: 2,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#4f46e5',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { borderDash: [4, 4] } }, x: { grid: { display: false } } }
      }
    });
    }

    // --- Chart 2: Late Distribution ---
    if (charts.current.late) charts.current.late.destroy();
    if (lateChartRef.current) {
    charts.current.late = new Chart(lateChartRef.current, {
      type: 'bar',
      data: {
        labels: lateDistribution.map(item => item.time || item.day || item.month || 'N/A'),
        datasets: [{
          label: '迟到/延时',
          data: lateDistribution.map(item => item.delay || item.late_count),
          backgroundColor: '#f59e0b',
          borderRadius: 6,
          barThickness: 'flex',
          maxBarThickness: 30
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { borderDash: [4, 4] } }, x: { grid: { display: false } } }
      }
    });
    }

    // --- Chart 3: Overtime ---
    if (charts.current.overtime) charts.current.overtime.destroy();
    if (overtimeChartRef.current) {
    charts.current.overtime = new Chart(overtimeChartRef.current, {
      type: 'bar',
      data: {
        labels: overtimeData.map(d => d.department),
        datasets: [{
          label: '加班时长(小时)',
          data: overtimeData.map(d => d.overtime_hours),
          backgroundColor: '#8b5cf6',
          borderRadius: 6,
          barThickness: 'flex',
          maxBarThickness: 30
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { borderDash: [4, 4] } }, x: { grid: { display: false } } }
      }
    });
    }

    // --- Chart 4: Batch Distribution ---
    if (charts.current.batch) charts.current.batch.destroy();
    if (batchChartRef.current) {
    charts.current.batch = new Chart(batchChartRef.current, {
      type: 'doughnut',
      data: {
        labels: batchDistribution.map(b => b.batch + '批次'),
        datasets: [{
          data: batchDistribution.map(b => b.count),
          backgroundColor: ['#10b981', '#3b82f6', '#cbd5e1'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } }
      }
    });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-600 relative overflow-y-hidden font-sans">
       {/* Background Blobs */}
      <div className="fixed bg-blue-200 w-96 h-96 top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-50 -z-10"></div>
      <div className="fixed bg-purple-200 w-96 h-96 bottom-0 right-0 translate-x-1/3 translate-y-1/3 rounded-full blur-3xl opacity-50 -z-10"></div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                    <i className="fas fa-layer-group text-indigo-600 mr-3"></i>{process.env.NEXT_PUBLIC_WEBSITE_TITLE}
                </h1>
                <p className="text-slate-500 mt-1 text-sm">实时监控与数据可视化分析平台</p>
            </div>
            <div className="mt-4 md:mt-0">
                <div 
                    className="inline-flex items-center px-5 py-2.5 bg-white rounded-full shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow duration-200"
                    onClick={() => setTimeFormat(timeFormat === 'default' ? 'detailed' : 'default')}
                    title="点击切换时间格式"
                >
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-3 animate-pulse"></div>
                    <span className="text-sm font-semibold text-slate-700 tabular-nums">{currentTime}</span>
                </div>
            </div>
        </div>

        {/* Dimension Switcher */}
        <div className="flex justify-center mb-10">
            <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 inline-flex flex-wrap justify-center gap-1">
                {['day', 'week', 'month', 'quarter'].map((dim) => (
                    <button
                        key={dim}
                        onClick={() => setDimension(dim)}
                        className={`px-6 py-2 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none ${
                            dimension === dim 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        {dim === 'day' ? '日视图' : dim === 'week' ? '周视图' : dim === 'month' ? '月视图' : '季视图'}
                    </button>
                ))}
            </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                    <SkeletonKpiCard key={index} />
                ))
            ) : (
                <>
                    <KpiCard 
                        title="总员工数" 
                        value={data?.attendanceStats.totalEmployees ?? '-'} 
                        icon="fa-users" 
                        colorClass="text-blue-600" 
                        bgClass="bg-blue-50"
                        trend="+2"
                        trendUp={true}
                    />
                    <KpiCard 
                        title="实到人数" 
                        value={data?.attendanceStats.totalPresent ?? '-'} 
                        icon="fa-user-check" 
                        colorClass="text-emerald-600" 
                        bgClass="bg-emerald-50"
                        subText={`出勤率 ${data?.attendanceStats.totalEmployees ? Math.round((data?.attendanceStats.totalPresent/data?.attendanceStats.totalEmployees)*100) : 0}%`}
                    />
                    <KpiCard 
                        title="迟到人数" 
                        value={data?.attendanceStats.lateCount ?? '-'} 
                        icon="fa-clock" 
                        colorClass="text-amber-500" 
                        bgClass="bg-amber-50"
                        trend="-3"
                        trendUp={false} // actually good if down
                    />
                    <KpiCard 
                        title="迟到率" 
                        value={(data?.attendanceStats.lateRate ?? 0) + '%'} 
                        icon="fa-percentage" 
                        colorClass="text-rose-500" 
                        bgClass="bg-rose-50"
                        trend="-2.1%"
                        trendUp={false}
                    />
                </>
            )}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                    <SkeletonChartCard key={index} />
                ))
            ) : (
                <>
                    <ChartCard title="签到趋势" subtitle="24小时/周期内签到曲线" icon="fa-chart-line" iconColor="bg-indigo-50 text-indigo-600">
                        <canvas ref={trendChartRef}></canvas>
                    </ChartCard>
                    <ChartCard title="迟到分布" subtitle="迟到时间段统计" icon="fa-chart-bar" iconColor="bg-amber-50 text-amber-600">
                        <canvas ref={lateChartRef}></canvas>
                    </ChartCard>
                    <ChartCard title="加班时长" subtitle="各部门加班时长统计" icon="fa-business-time" iconColor="bg-purple-50 text-purple-600">
                        <canvas ref={overtimeChartRef}></canvas>
                    </ChartCard>
                    <ChartCard title="签到批次" subtitle="各打卡批次占比" icon="fa-chart-pie" iconColor="bg-emerald-50 text-emerald-600">
                        <div className="h-full flex justify-center">
                            <canvas ref={batchChartRef}></canvas>
                        </div>
                    </ChartCard>
                </>
            )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-8 flex flex-col items-center">
            <p className="text-slate-400 text-xs flex items-center gap-2">
                <span><i className="fas fa-sync-alt mr-1"></i>数据更新: {currentTime}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>系统版本: {process.env.NEXT_PUBLIC_VERSION}</span>
            </p>
            <p className="text-slate-300 text-xs mt-2">© 2023 人员考勤信息展示系统</p>
        </div>
      </div>
    </div>
  );
}

// 骨架屏组件
function SkeletonKpiCard() {
    return (
        <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 animate-pulse"></div>
                <div className="flex gap-2">
                    <div className="w-16 h-5 rounded-full bg-slate-100 animate-pulse"></div>
                </div>
            </div>
            <div>
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse mb-2"></div>
                <div className="h-12 w-32 bg-slate-100 rounded animate-pulse"></div>
            </div>
        </div>
    );
}

function SkeletonChartCard() {
    return (
        <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="h-5 w-32 bg-slate-100 rounded animate-pulse mb-1"></div>
                    <div className="h-3 w-48 bg-slate-100 rounded animate-pulse"></div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse"></div>
            </div>
            <div className="h-64 bg-slate-100 rounded-xl animate-pulse"></div>
        </div>
    );
}

// Sub-components for cleaner code
function KpiCard({ title, value, icon, colorClass, bgClass, trend, trendUp, subText }) {
    return (
        <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl ${bgClass} flex items-center justify-center ${colorClass} text-xl`}>
                    <i className={`fas ${icon}`}></i>
                </div>
                <div className="flex gap-2">
                    {trend && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700`}>
                            <i className={`fas ${trendUp ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1`}></i>{trend}
                        </span>
                    )}
                     {subText && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                            {subText}
                        </span>
                    )}
                </div>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">{value}</h3>
            </div>
        </div>
    );
}

function ChartCard({ title, subtitle, icon, iconColor, children }) {
    return (
        <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
                </div>
                <div className={`p-2 rounded-lg ${iconColor}`}>
                    <i className={`fas ${icon}`}></i>
                </div>
            </div>
            <div className="h-64 relative">
                {children}
            </div>
        </div>
    );
}