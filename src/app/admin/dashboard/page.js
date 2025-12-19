'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '@fortawesome/fontawesome-free/css/all.min.css';

// 动态渲染图表类型的图标
const getChartTypeIcon = (type) => {
  switch (type) {
    case 'line':
      return 'fa-chart-line';
    case 'bar':
      return 'fa-chart-bar';
    case 'doughnut':
      return 'fa-chart-pie';
    default:
      return 'fa-chart-line';
  }
};

// 模态框组件
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 模态框头部 */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        {/* 模态框内容 */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// 维度表单组件
const DimensionForm = ({ dimension, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    key_name: dimension?.key_name || '',
    label: dimension?.label || '',
    sort_order: dimension?.sort_order || 0
  });

  useEffect(() => {
    if (dimension) {
      setFormData({
        key_name: dimension.key_name,
        label: dimension.label,
        sort_order: dimension.sort_order
      });
    }
  }, [dimension]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value || 0) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-5">
        <div>
          <label htmlFor="key_name" className="block text-sm font-medium text-slate-700 mb-1">
            维度标识
          </label>
          <input
            id="key_name"
            name="key_name"
            type="text"
            value={formData.key_name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            placeholder="如: day, week, month"
          />
          <p className="text-xs text-slate-500 mt-1">用于URL参数和系统内部标识</p>
        </div>

        <div>
          <label htmlFor="label" className="block text-sm font-medium text-slate-700 mb-1">
            显示名称
          </label>
          <input
            id="label"
            name="label"
            type="text"
            value={formData.label}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            placeholder="如: 日视图, 周视图"
          />
        </div>

        <div>
          <label htmlFor="sort_order" className="block text-sm font-medium text-slate-700 mb-1">
            排序顺序
          </label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            value={formData.sort_order}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            placeholder="0"
          />
        </div>

        <div className="flex gap-3 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            {dimension ? '更新维度' : '创建维度'}
          </button>
        </div>
      </div>
    </form>
  );
};

// 卡片表单组件
const CardForm = ({ card, dimensionId, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: card?.title || '',
    icon: card?.icon || 'fa-chart-bar',
    sql_query: card?.sql_query || '',
    color_class: card?.color_class || 'text-blue-600',
    bg_class: card?.bg_class || 'bg-blue-50',
    sort_order: card?.sort_order || 0
  });

  useEffect(() => {
    if (card) {
      setFormData({
        title: card.title,
        icon: card.icon,
        sql_query: card.sql_query,
        color_class: card.color_class,
        bg_class: card.bg_class,
        sort_order: card.sort_order
      });
    }
  }, [card]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value || 0) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, dimension_id: dimensionId });
  };

  // 预定义图标列表
  const iconOptions = [
    'fa-chart-bar', 'fa-users', 'fa-user-clock', 'fa-clock', 
    'fa-calendar-check', 'fa-percentage', 'fa-check-circle', 
    'fa-exclamation-circle', 'fa-arrow-up', 'fa-arrow-down'
  ];

  // 预定义颜色类列表
  const colorOptions = [
    { bg: 'bg-blue-50', text: 'text-blue-600', label: '蓝色' },
    { bg: 'bg-green-50', text: 'text-green-600', label: '绿色' },
    { bg: 'bg-purple-50', text: 'text-purple-600', label: '紫色' },
    { bg: 'bg-orange-50', text: 'text-orange-600', label: '橙色' },
    { bg: 'bg-red-50', text: 'text-red-600', label: '红色' },
    { bg: 'bg-indigo-50', text: 'text-indigo-600', label: '靛蓝色' }
  ];

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-5">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
            卡片标题
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            placeholder="如: 实到人数, 迟到人数"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            图标选择
          </label>
          <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-lg">
            {iconOptions.map(icon => (
              <button
                key={icon}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, icon }))}
                className={`p-3 rounded-lg transition-all ${formData.icon === icon ? 'bg-indigo-100 text-indigo-600 border border-indigo-300' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
              >
                <i className={`fas ${icon} text-2xl`}></i>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            颜色主题
          </label>
          <div className="grid grid-cols-3 gap-3">
            {colorOptions.map((color, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  bg_class: color.bg,
                  color_class: color.text
                }))}
                className={`p-4 rounded-lg transition-all flex items-center justify-center ${formData.bg_class === color.bg ? 'ring-2 ring-indigo-300' : ''}`}
                style={{ backgroundColor: color.bg.replace('bg-', '#'), color: color.text.replace('text-', '#') }}
              >
                <i className="fas fa-chart-bar text-xl"></i>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="sql_query" className="block text-sm font-medium text-slate-700 mb-1">
            SQL 查询语句
          </label>
          <textarea
            id="sql_query"
            name="sql_query"
            value={formData.sql_query}
            onChange={handleChange}
            required
            rows={6}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-sm"
            placeholder="SELECT COUNT(*) as value FROM attendance_table WHERE ..."
          ></textarea>
          <p className="text-xs text-slate-500 mt-1">
            查询结果必须包含名为 <code>value</code> 的字段
          </p>
        </div>

        <div>
          <label htmlFor="sort_order" className="block text-sm font-medium text-slate-700 mb-1">
            排序顺序
          </label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            value={formData.sort_order}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            placeholder="0"
          />
        </div>

        <div className="flex gap-3 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            {card ? '更新卡片' : '创建卡片'}
          </button>
        </div>
      </div>
    </form>
  );
};

// 图表表单组件
const ChartForm = ({ chart, dimensionId, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: chart?.title || '',
    subtitle: chart?.subtitle || '',
    chart_type: chart?.chart_type || 'line',
    icon: chart?.icon || 'fa-chart-line',
    sql_query: chart?.sql_query || '',
    sort_order: chart?.sort_order || 0
  });

  useEffect(() => {
    if (chart) {
      setFormData({
        title: chart.title,
        subtitle: chart.subtitle,
        chart_type: chart.chart_type,
        icon: chart.icon,
        sql_query: chart.sql_query,
        sort_order: chart.sort_order
      });
    }
  }, [chart]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value || 0) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, dimension_id: dimensionId });
  };

  // 图表类型选项
  const chartTypeOptions = [
    { value: 'line', label: '折线图' },
    { value: 'bar', label: '柱状图' },
    { value: 'doughnut', label: '环形图' }
  ];

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-5">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
            图表标题
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            placeholder="如: 考勤趋势图"
          />
        </div>

        <div>
          <label htmlFor="subtitle" className="block text-sm font-medium text-slate-700 mb-1">
            备注说明
          </label>
          <input
            id="subtitle"
            name="subtitle"
            type="text"
            value={formData.subtitle}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            placeholder="可选: 显示最近7天的考勤趋势"
          />
        </div>

        <div>
          <label htmlFor="chart_type" className="block text-sm font-medium text-slate-700 mb-1">
            图表类型
          </label>
          <select
            id="chart_type"
            name="chart_type"
            value={formData.chart_type}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          >
            {chartTypeOptions.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sql_query" className="block text-sm font-medium text-slate-700 mb-1">
            SQL 查询语句
          </label>
          <textarea
            id="sql_query"
            name="sql_query"
            value={formData.sql_query}
            onChange={handleChange}
            required
            rows={6}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-sm"
            placeholder="SELECT date, count(*) as value FROM attendance_table GROUP BY date ORDER BY date"
          ></textarea>
          <p className="text-xs text-slate-500 mt-1">
            查询结果需包含 <code>label</code>（或日期/时间字段）和 <code>value</code> 字段
          </p>
        </div>

        <div>
          <label htmlFor="sort_order" className="block text-sm font-medium text-slate-700 mb-1">
            排序顺序
          </label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            value={formData.sort_order}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            placeholder="0"
          />
        </div>

        <div className="flex gap-3 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            {chart ? '更新图表' : '创建图表'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default function AdminDashboard() {
  const [dimensions, setDimensions] = useState([]);
  const [selectedDim, setSelectedDim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  // 模态框状态
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState(null);

  // 表单数据状态
  const [editingDimension, setEditingDimension] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [editingChart, setEditingChart] = useState(null);

  // 获取配置
  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/config', {
        credentials: 'include'
      });
      
      if (!res.ok) {
        // 未授权，跳转到登录页
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }
        throw new Error('Failed to fetch configuration');
      }
      
      const json = await res.json();
      
      if (json.success) {
        setDimensions(json.data);
        if (json.data.length > 0 && !selectedDim) {
          setSelectedDim(json.data[0]);
        } else if (selectedDim) {
          // 保持选择状态
          const updatedDim = json.data.find(dim => dim.id === selectedDim.id);
          if (updatedDim) {
            setSelectedDim(updatedDim);
          } else if (json.data.length > 0) {
            setSelectedDim(json.data[0]);
          }
        }
      }
    } catch (err) {
      setError('获取配置失败，请刷新页面重试');
      console.error('Fetch config error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 初始化数据
  useEffect(() => {
    fetchConfig();
  }, [router]);

  // 处理维度创建/更新
  const handleDimensionSubmit = async (formData) => {
    try {
      const type = editingDimension ? 'update_dimension' : 'dimension';
      const data = editingDimension ? { ...formData, id: editingDimension.id } : formData;
      
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, data }),
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setModalOpen(false);
        fetchConfig();
      } else {
        setError(result.error || '操作失败');
      }
    } catch (err) {
      setError('服务器错误，请稍后重试');
    }
  };

  // 处理卡片创建/更新
  const handleCardSubmit = async (formData) => {
    try {
      const type = editingCard ? 'update_card' : 'card';
      const data = editingCard ? { ...formData, id: editingCard.id } : formData;
      
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, data }),
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setModalOpen(false);
        fetchConfig();
      } else {
        setError(result.error || '操作失败');
      }
    } catch (err) {
      setError('服务器错误，请稍后重试');
    }
  };

  // 处理图表创建/更新
  const handleChartSubmit = async (formData) => {
    try {
      const type = editingChart ? 'update_chart' : 'chart';
      const data = editingChart ? { ...formData, id: editingChart.id } : formData;
      
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, data }),
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setModalOpen(false);
        fetchConfig();
      } else {
        setError(result.error || '操作失败');
      }
    } catch (err) {
      setError('服务器错误，请稍后重试');
    }
  };

  // 处理删除操作
  const handleDelete = async (type, id, name) => {
    if (!confirm(`确定要删除"${name}"吗？此操作无法撤销。`)) return;
    
    try {
      const deleteType = `delete_${type}`;
      
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: deleteType, data: { id } }),
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        fetchConfig();
        // 如果删除的是当前选中的维度，选择第一个维度
        if (type === 'dimension' && selectedDim?.id === id && dimensions.length > 1) {
          setSelectedDim(dimensions[0]);
        }
      } else {
        setError(result.error || '删除失败');
      }
    } catch (err) {
      setError('服务器错误，请稍后重试');
    }
  };

  // 打开维度表单模态框
  const openDimensionModal = (dimension = null) => {
    setEditingDimension(dimension);
    setModalTitle(dimension ? '编辑维度' : '创建新维度');
    setModalContent(
      <DimensionForm
        dimension={dimension}
        onSubmit={handleDimensionSubmit}
        onCancel={() => setModalOpen(false)}
      />
    );
    setModalOpen(true);
  };

  // 打开卡片表单模态框
  const openCardModal = (card = null) => {
    if (!selectedDim) {
      setError('请先选择一个维度');
      return;
    }
    
    setEditingCard(card);
    setModalTitle(card ? '编辑卡片' : '创建新卡片');
    setModalContent(
      <CardForm
        card={card}
        dimensionId={selectedDim.id}
        onSubmit={handleCardSubmit}
        onCancel={() => setModalOpen(false)}
      />
    );
    setModalOpen(true);
  };

  // 打开图表表单模态框
  const openChartModal = (chart = null) => {
    if (!selectedDim) {
      setError('请先选择一个维度');
      return;
    }
    
    setEditingChart(chart);
    setModalTitle(chart ? '编辑图表' : '创建新图表');
    setModalContent(
      <ChartForm
        chart={chart}
        dimensionId={selectedDim.id}
        onSubmit={handleChartSubmit}
        onCancel={() => setModalOpen(false)}
      />
    );
    setModalOpen(true);
  };

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-400">加载配置信息中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm border-b border-slate-100">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 text-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center">
              <i className="fas fa-cog text-xl"></i>
            </div>
            <h1 className="text-xl font-bold text-slate-800">考勤系统管理后台</h1>
          </div>
          <button
            onClick={() => {
              // 清除会话并跳转到登录页
              fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: '', password: '' }),
                credentials: 'include'
              }).finally(() => {
                router.push('/admin/login');
              });
            }}
            className="text-slate-600 hover:text-red-600 transition-colors flex items-center gap-1"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span>退出登录</span>
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* 侧边栏：维度列表 */}
        <aside className="w-64 bg-white border-r border-slate-100 overflow-y-auto">
          {/* 添加维度按钮 */}
          <div className="p-4 border-b border-slate-100">
            <button
              onClick={() => openDimensionModal()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              <i className="fas fa-plus"></i>
              <span>添加维度</span>
            </button>
          </div>

          {/* 维度列表 */}
          <nav className="p-2">
            {dimensions.length > 0 ? (
              <ul className="space-y-1">
                {dimensions.map(dim => (
                  <li key={dim.id}>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setSelectedDim(dim)}
                        className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${selectedDim?.id === dim.id ? 'bg-indigo-100 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <i className="fas fa-layer-group"></i>
                        <span>{dim.label}</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{dim.key_name}</span>
                      </button>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openDimensionModal(dim)}
                          className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="编辑维度"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => handleDelete('dimension', dim.id, dim.label)}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                          title="删除维度"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <i className="fas fa-layer-group text-4xl mb-2"></i>
                <p>暂无维度配置</p>
                <p className="text-xs mt-1">点击上方按钮添加第一个维度</p>
              </div>
            )}
          </nav>
        </aside>

        {/* 主内容：配置该维度的卡片和图表 */}
        <main className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-xl flex items-center">
              <i className="fas fa-exclamation-circle mr-2"></i>
              <span>{error}</span>
              <button
                onClick={() => setError('')}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}

          {selectedDim ? (
            <div>
              {/* 维度信息和操作 */}
              <div className="mb-8 bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">{selectedDim.label}</h2>
                    <p className="text-slate-500">维度标识：{selectedDim.key_name}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => openCardModal()}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors flex items-center gap-2"
                    >
                      <i className="fas fa-plus"></i>
                      <span>添加卡片</span>
                    </button>
                    <button
                      onClick={() => openChartModal()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex items-center gap-2"
                    >
                      <i className="fas fa-plus"></i>
                      <span>添加图表</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 卡片管理区 */}
              <section className="mb-10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <i className="fas fa-chart-bar text-indigo-600"></i>
                    <span>KPI 卡片</span>
                  </h3>
                  <span className="text-sm text-slate-500">共 {selectedDim.cards?.length || 0} 个卡片</span>
                </div>

                {selectedDim.cards?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedDim.cards.map(card => (
                      <div key={card.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:-translate-y-1 transition-all duration-300">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-10 h-10 rounded-xl ${card.bg_class} flex items-center justify-center ${card.color_class}`}>
                              <i className={`fas ${card.icon} text-lg`}></i>
                            </div>
                            <h4 className="font-bold text-slate-800">{card.title}</h4>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => openCardModal(card)}
                              className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                              title="编辑卡片"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={() => handleDelete('card', card.id, card.title)}
                              className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                              title="删除卡片"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl overflow-hidden">
                          {card.sql_query}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-dashed border-slate-200">
                    <i className="fas fa-chart-bar text-4xl text-slate-300 mb-3"></i>
                    <p className="text-slate-500 mb-4">该维度下暂无 KPI 卡片</p>
                    <button
                      onClick={() => openCardModal()}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      添加第一个卡片
                    </button>
                  </div>
                )}
              </section>

              {/* 图表管理区 */}
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <i className="fas fa-chart-line text-indigo-600"></i>
                    <span>图表配置</span>
                  </h3>
                  <span className="text-sm text-slate-500">共 {selectedDim.charts?.length || 0} 个图表</span>
                </div>

                {selectedDim.charts?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedDim.charts.map(chart => (
                      <div key={chart.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:-translate-y-1 transition-all duration-300">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                              <i className={`fas ${getChartTypeIcon(chart.chart_type)} text-lg`}></i>
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800">{chart.title}</h4>
                              {chart.subtitle && (
                                <p className="text-xs text-slate-500">{chart.subtitle}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => openChartModal(chart)}
                              className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                              title="编辑图表"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={() => handleDelete('chart', chart.id, chart.title)}
                              className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                              title="删除图表"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl overflow-hidden">
                          {chart.sql_query}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full">{chart.chart_type}</span>
                          <span className="text-xs text-slate-400">排序: {chart.sort_order}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-dashed border-slate-200">
                    <i className="fas fa-chart-line text-4xl text-slate-300 mb-3"></i>
                    <p className="text-slate-500 mb-4">该维度下暂无图表配置</p>
                    <button
                      onClick={() => openChartModal()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      添加第一个图表
                    </button>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <i className="fas fa-layer-group text-6xl text-slate-300 mb-4"></i>
                <h3 className="text-xl font-bold text-slate-800 mb-2">选择一个维度</h3>
                <p className="text-slate-500">从左侧选择一个维度来配置其卡片和图表</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 模态框 */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
      >
        {modalContent}
      </Modal>
    </div>
  );
}
