import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db';
import { cookies } from 'next/headers';

// 验证管理员身份的中间件
async function isAdmin() {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get('admin_session');
  return adminSession?.value === 'true';
}

export async function GET(request) {
  try {
    // 获取所有配置结构
    const dimensions = await queryDb('SELECT * FROM sys_dimensions ORDER BY sort_order');
    
    // 获取每个维度下的 cards 和 charts
    for (let dim of dimensions) {
      dim.cards = await queryDb('SELECT * FROM sys_kpi_cards WHERE dimension_id = ? ORDER BY sort_order', [dim.id]);
      dim.charts = await queryDb('SELECT * FROM sys_charts WHERE dimension_id = ? ORDER BY sort_order', [dim.id]);
    }
    
    return NextResponse.json({ success: true, data: dimensions });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!await isAdmin()) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { type, data } = await request.json(); // type: 'dimension', 'card', 'chart', 'update_dimension', 'update_card', 'update_chart', 'delete_dimension', 'delete_card', 'delete_chart'
  
  try {
    if (type === 'dimension') {
      const res = await queryDb('INSERT INTO sys_dimensions (key_name, label, sort_order) VALUES (?, ?, ?)', 
        [data.key_name, data.label, data.sort_order || 0]);
      return NextResponse.json({ success: true, id: res.insertId });
    } 
    else if (type === 'card') {
      const res = await queryDb(
        'INSERT INTO sys_kpi_cards (dimension_id, title, icon, sql_query, color_class, bg_class, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [data.dimension_id, data.title, data.icon || 'fa-chart-bar', data.sql_query, data.color_class || 'text-blue-600', data.bg_class || 'bg-blue-50', data.sort_order || 0]
      );
      return NextResponse.json({ success: true, id: res.insertId });
    }
    else if (type === 'chart') {
      const res = await queryDb(
        'INSERT INTO sys_charts (dimension_id, title, subtitle, chart_type, icon, sql_query, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [data.dimension_id, data.title, data.subtitle || '', data.chart_type || 'line', data.icon || 'fa-chart-line', data.sql_query, data.sort_order || 0]
      );
      return NextResponse.json({ success: true, id: res.insertId });
    }
    else if (type === 'update_dimension') {
      await queryDb(
        'UPDATE sys_dimensions SET key_name = ?, label = ?, sort_order = ? WHERE id = ?',
        [data.key_name, data.label, data.sort_order || 0, data.id]
      );
      return NextResponse.json({ success: true });
    }
    else if (type === 'update_card') {
      await queryDb(
        'UPDATE sys_kpi_cards SET title = ?, icon = ?, sql_query = ?, color_class = ?, bg_class = ?, sort_order = ? WHERE id = ?',
        [data.title, data.icon || 'fa-chart-bar', data.sql_query, data.color_class || 'text-blue-600', data.bg_class || 'bg-blue-50', data.sort_order || 0, data.id]
      );
      return NextResponse.json({ success: true });
    }
    else if (type === 'update_chart') {
      await queryDb(
        'UPDATE sys_charts SET title = ?, subtitle = ?, chart_type = ?, icon = ?, sql_query = ?, sort_order = ? WHERE id = ?',
        [data.title, data.subtitle || '', data.chart_type || 'line', data.icon || 'fa-chart-line', data.sql_query, data.sort_order || 0, data.id]
      );
      return NextResponse.json({ success: true });
    }
    else if (type === 'delete_dimension') {
       // 由于设置了 ON DELETE CASCADE，只需删除 dimension
       await queryDb('DELETE FROM sys_dimensions WHERE id = ?', [data.id]);
       return NextResponse.json({ success: true });
    }
    else if (type === 'delete_card') {
       await queryDb('DELETE FROM sys_kpi_cards WHERE id = ?', [data.id]);
       return NextResponse.json({ success: true });
    }
    else if (type === 'delete_chart') {
       await queryDb('DELETE FROM sys_charts WHERE id = ?', [data.id]);
       return NextResponse.json({ success: true });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
}
