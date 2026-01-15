/**
 * Dashboard Chart Components
 *
 * Reusable chart components for dashboards using Recharts
 */

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Color palettes for charts
export const CHART_COLORS = {
  blue: '#3b82f6',
  cyan: '#06b6d4',
  teal: '#14b8a6',
  emerald: '#10b981',
  green: '#22c55e',
  amber: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
  purple: '#a855f7',
  indigo: '#6366f1',
  pink: '#ec4899',
  gray: '#6b7280',
};

const STATE_COLORS: Record<string, string> = {
  DRAFT: CHART_COLORS.gray,
  FACULTY_REVIEW: CHART_COLORS.blue,
  SCHOOL_REVIEW: CHART_COLORS.indigo,
  COUNCIL_REVIEW: CHART_COLORS.purple,
  APPROVED: CHART_COLORS.emerald,
  REJECTED: CHART_COLORS.red,
  CHANGES_REQUESTED: CHART_COLORS.amber,
  IN_PROGRESS: CHART_COLORS.cyan,
  COMPLETED: CHART_COLORS.green,
  ACCEPTANCE: CHART_COLORS.teal,
};

/**
 * Donut Chart for Proposal State Distribution
 */
export interface StateDistributionData {
  name: string;
  value: number;
  color: string;
}

export interface ProposalStateDonutChartProps {
  data: Array<{ state: string; stateName: string; count: number }>;
  title?: string;
  size?: 'small' | 'medium' | 'large';
}

export function ProposalStateDonutChart({
  data,
  title = 'Phân bổ theo trạng thái',
  size = 'medium',
}: ProposalStateDonutChartProps) {
  const chartData: StateDistributionData[] = data
    .filter(item => item.count > 0)
    .map(item => ({
      name: item.stateName,
      value: item.count,
      color: STATE_COLORS[item.state] || CHART_COLORS.gray,
    }));

  const sizeConfig = {
    small: { height: 200, innerRadius: 40, outerRadius: 60 },
    medium: { height: 280, innerRadius: 60, outerRadius: 90 },
    large: { height: 350, innerRadius: 80, outerRadius: 120 },
  };

  const config = sizeConfig[size];

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: config.height }}>
        <p className="text-gray-400 text-sm">Không có dữ liệu</p>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={config.height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={config.innerRadius}
            outerRadius={config.outerRadius}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            formatter={(value: number) => [value, 'Số lượng']}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Bar Chart for Faculty Performance Comparison
 */
export interface FacultyPerformanceData {
  name: string;
  total: number;
  approved: number;
  rejected: number;
  completed: number;
}

export interface FacultyPerformanceBarChartProps {
  data: Array<{
    facultyName: string;
    facultyCode?: string;
    totalProposals: number;
    approved: number;
    rejected: number;
    completed: number;
  }>;
  title?: string;
  maxFaculties?: number;
}

export function FacultyPerformanceBarChart({
  data,
  title = 'Hiệu suất theo Khoa',
  maxFaculties = 8,
}: FacultyPerformanceBarChartProps) {
  const chartData: FacultyPerformanceData[] = data
    .slice(0, maxFaculties)
    .map(item => ({
      name: item.facultyCode || item.facultyName.substring(0, 15),
      total: item.totalProposals,
      approved: item.approved,
      rejected: item.rejected,
      completed: item.completed,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Không có dữ liệu</p>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 10, left: 10, bottom: 60 }}
          barSize={16}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            tick={{ fill: '#6b7280', fontSize: 11 }}
          />
          <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            formatter={(value: number, name: string) => {
              const labelMap: Record<string, string> = {
                approved: 'Đã duyệt',
                rejected: 'Từ chối',
                completed: 'Hoàn thành',
                total: 'Tổng',
              };
              return [value, labelMap[name] || name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            formatter={(value) => {
              const labelMap: Record<string, string> = {
                Approved: 'Đã duyệt',
                Rejected: 'Từ chối',
                Completed: 'Hoàn thành',
                Total: 'Tổng',
              };
              return labelMap[value] || value;
            }}
          />
          <Bar dataKey="approved" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} />
          <Bar dataKey="completed" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
          <Bar dataKey="rejected" fill={CHART_COLORS.red} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Pie Chart for Status Distribution (Faculty Dashboard)
 */
export interface StatusDistributionPieChartProps {
  data: Array<{
    state: string;
    stateName: string;
    count: number;
    percentage: number;
  }>;
  title?: string;
}

export function StatusDistributionPieChart({
  data,
  title = 'Phân bố trạng thái',
}: StatusDistributionPieChartProps) {
  const chartData: StateDistributionData[] = data
    .filter(item => item.count > 0)
    .map(item => ({
      name: item.stateName,
      value: item.count,
      color: STATE_COLORS[item.state] || CHART_COLORS.gray,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Không có dữ liệu</p>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) =>
              percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
            }
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            formatter={(value: number, name: string, props: any) => {
              const percentage = props.payload?.percentage || 0;
              return [`${value} (${percentage}%)`, name];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-3">
        {chartData.map((item, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-gray-600">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Bar Chart for Monthly Trends (Faculty Dashboard)
 */
export interface MonthlyTrendData {
  month: string;
  newProposals: number;
  approved: number;
  completed: number;
}

export interface MonthlyTrendBarChartProps {
  data: Array<{
    month: string;
    newProposals: number;
    approved: number;
    completed: number;
  }>;
  title?: string;
}

export function MonthlyTrendBarChart({
  data,
  title = 'Xu hướng theo tháng',
}: MonthlyTrendBarChartProps) {
  const chartData = data.map(item => ({
    name: new Date(item.month + '-01').toLocaleDateString('vi-VN', {
      month: 'short',
    }),
    new: item.newProposals,
    approved: item.approved,
    completed: item.completed,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Không có dữ liệu</p>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 10, left: 10, bottom: 40 }}
          barSize={20}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#6b7280', fontSize: 11 }}
          />
          <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            formatter={(value: number, name: string) => {
              const labelMap: Record<string, string> = {
                new: 'Mới',
                approved: 'Duyệt',
                completed: 'Hoàn thành',
              };
              return [value, labelMap[name] || name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            formatter={(value) => {
              const labelMap: Record<string, string> = {
                New: 'Mới',
                Approved: 'Đã duyệt',
                Completed: 'Hoàn thành',
              };
              return labelMap[value] || value;
            }}
          />
          <Bar dataKey="new" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
          <Bar dataKey="approved" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} />
          <Bar dataKey="completed" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
