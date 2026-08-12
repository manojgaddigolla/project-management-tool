import React, { useEffect, useMemo, useState } from "react";
import { getProjectAnalytics } from "../../services/projectService";
import { toast } from "react-toastify";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import "./ProjectAnalytics.css";

const BarList = ({ items, tone = "blue" }) => {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="analytics-bar-list">
      {items.map((item) => (
        <div key={item.label} className="analytics-bar-row">
          <div className="analytics-bar-label">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
          <div className="analytics-bar-track">
            <div
              className={`analytics-bar-fill ${tone}`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const getDeadlineLabel = (task) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((dueDate - today) / 86400000);

  if (dayDiff < 0) return `${Math.abs(dayDiff)}d overdue`;
  if (dayDiff === 0) return "Due today";
  if (dayDiff === 1) return "Due tomorrow";
  return `Due in ${dayDiff}d`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip" style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.85)', 
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '12px 16px', 
        border: '1px solid rgba(0, 0, 0, 0.08)', 
        borderRadius: '12px', 
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' 
      }}>
        <p className="label" style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{`${label}`}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
            <span style={{ display: 'block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color || 'var(--brand)' }}></span>
            <span style={{ fontSize: '0.9rem', color: '#4b5563', fontWeight: 500 }}>{entry.name}:</span>
            <span style={{ fontSize: '0.95rem', color: '#111827', fontWeight: 700 }}>{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const ProjectAnalytics = ({ projectId, refreshKey }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [timeRange, setTimeRange] = useState(14);

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getProjectAnalytics(projectId, timeRange);
        if (!cancelled) setAnalytics(data);
      } catch (err) {
        if (!cancelled) {
          setError(err.msg || "Could not load project analytics.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [projectId, refreshKey, timeRange]);

  const workloadItems = useMemo(() => {
    return (analytics?.memberLoad || []).map((member) => ({
      name: member.name,
      label: member.name,
      value: member.totalTasks,
      Open: member.openTasks,
      openTasks: member.openTasks,
      Completed: member.completedTasks,
      completedTasks: member.completedTasks,
      Overdue: member.overdueTasks,
      overdueTasks: member.overdueTasks,
    }));
  }, [analytics]);

  const maxWorkload = Math.max(
    ...workloadItems.map((member) => member.value),
    1,
  );

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9'];

  const analyticsText = useMemo(() => {
    if (!analytics) return "";
    return `Project Analytics
Completion Rate: ${analytics.summary.completionRate}%
Total Tasks: ${analytics.summary.totalTasks}
Open Tasks: ${analytics.summary.openTasks}
Overdue Tasks: ${analytics.summary.overdueTasks}
Activity Events: ${analytics.summary.activityCount}

Status Breakdown:
${analytics.byStatus.map(s => `- ${s.label}: ${s.value}`).join('\n')}

Priority Mix:
${analytics.byPriority.map(p => `- ${p.label}: ${p.value}`).join('\n')}
`;
  }, [analytics]);

  const handleCopy = async () => {
    if (!analyticsText) return;
    try {
      await navigator.clipboard.writeText(analyticsText);
      toast.success("Analytics copied to clipboard");
    } catch {
      toast.error("Could not copy analytics");
    }
  };

  const handleShare = () => {
    if (!analyticsText) return;
    if (navigator.share) {
      navigator.share({
        title: 'Project Analytics',
        text: analyticsText
      }).catch(console.error);
    } else {
      toast.info("Sharing is not supported on this browser.");
    }
  };

  if (loading) {
    return <div className="analytics-shell">Loading analytics...</div>;
  }

  if (error) {
    return <div className="analytics-shell analytics-error">{error}</div>;
  }

  if (!analytics) {
    return null;
  }

  const tasksOverTime = analytics.tasksOverTime || [];

  return (
    <section className="analytics-shell">
      <div className="analytics-header" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap", flex: 1 }}>
          <div>
            <p className="analytics-eyebrow">Insights</p>
            <h2>Project Health</h2>
          </div>
          <div className="completion-ring" aria-label="Completion rate">
            <div
              className="completion-ring-progress"
              style={{ "--progress": `${analytics.summary.completionRate}%` }}
            />
            <span>{analytics.summary.completionRate}%</span>
            <p>complete</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Segmented Control for Toggle */}
          <div style={{ 
            display: "flex", 
            backgroundColor: "var(--surface-sunken, #f1f5f9)", 
            padding: "4px", 
            borderRadius: "8px", 
            border: "1px solid var(--border)",
            gap: "4px"
          }}>
            <button 
              onClick={() => setShowAdvanced(false)} 
              style={{ 
                padding: "6px 14px", 
                fontSize: "0.85rem", 
                fontWeight: 600,
                backgroundColor: !showAdvanced ? "var(--surface, #ffffff)" : "transparent", 
                color: !showAdvanced ? "var(--text-h, #111827)" : "var(--text-muted, #6b7280)",
                border: "none",
                borderRadius: "6px",
                boxShadow: !showAdvanced ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              <i className="fa-solid fa-chart-simple" style={{ marginRight: "6px" }}></i> 
              Basic
            </button>
            <button 
              onClick={() => setShowAdvanced(true)} 
              style={{ 
                padding: "6px 14px", 
                fontSize: "0.85rem", 
                fontWeight: 600,
                backgroundColor: showAdvanced ? "var(--surface, #ffffff)" : "transparent", 
                color: showAdvanced ? "var(--text-h, #111827)" : "var(--text-muted, #6b7280)",
                border: "none",
                borderRadius: "6px",
                boxShadow: showAdvanced ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              <i className="fa-solid fa-chart-pie" style={{ marginRight: "6px" }}></i> 
              Advanced
            </button>
          </div>

          <button className="board-action-button" onClick={handleCopy} style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
            <i className="fa-solid fa-copy" style={{ marginRight: "6px" }}></i> Copy
          </button>
          <button className="board-action-button" onClick={handleShare} style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
            <i className="fa-solid fa-share-nodes" style={{ marginRight: "6px" }}></i> Share
          </button>
        </div>
      </div>

      <div className="analytics-kpis" style={{ marginBottom: "32px" }}>
        <div>
          <span>{analytics.summary.totalTasks}</span>
          <p>Total tasks</p>
        </div>
        <div>
          <span>{analytics.summary.openTasks}</span>
          <p>Open tasks</p>
        </div>
        <div>
          <span style={{ color: analytics.summary.overdueTasks > 0 ? 'var(--danger)' : 'inherit' }}>{analytics.summary.overdueTasks}</span>
          <p>Overdue</p>
        </div>
        <div>
          <span>{analytics.summary.activityCount}</span>
          <p>Activity events</p>
        </div>
      </div>

      {showAdvanced ? (
        <div className="recharts-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px" }}>
          {/* Tasks Completed Over Time */}
          <article className="analytics-panel" style={{ gridColumn: "1 / -1", overflow: 'hidden', padding: '24px' }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>Tasks Completed Over Time</h3>
              <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(Number(e.target.value))}
                style={{ padding: "8px 14px", borderRadius: "8px", backgroundColor: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", fontWeight: 500, outline: 'none', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
              >
                <option value={7}>Last 7 Days</option>
                <option value={14}>Last 14 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 90 Days</option>
              </select>
            </div>
            <div style={{ width: '100%', height: 320 }}>
              {tasksOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tasksOverTime} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} dx={-10} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area type="monotone" dataKey="completed" name="Completed Tasks" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="analytics-empty">No timeline data available.</p>
              )}
            </div>
          </article>

          {/* Status Breakdown - Donut Chart */}
          <article className="analytics-panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>Status Breakdown</h3>
            <div style={{ width: '100%', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.byStatus.filter(s => s.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="label"
                    stroke="none"
                  >
                    {analytics.byStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', marginTop: '20px' }}>
              {analytics.byStatus.filter(s => s.value > 0).map((entry, index) => (
                <div key={entry.label} style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#4b5563', fontWeight: 500 }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length], marginRight: '8px' }}></span>
                  {entry.label} <strong style={{ color: '#111827', marginLeft: '4px' }}>{entry.value}</strong>
                </div>
              ))}
            </div>
          </article>

          {/* Team Workload - Elegant Bar Chart */}
          <article className="analytics-panel" style={{ padding: '24px' }}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>Team Workload</h3>
            <div style={{ width: '100%', height: 260 }}>
              {workloadItems.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadItems} margin={{ top: 0, right: 30, left: -20, bottom: 0 }} layout="vertical" barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.06)" />
                    <XAxis type="number" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="#4b5563" fontSize={12} fontWeight={500} tickLine={false} axisLine={false} width={100} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                    <Bar dataKey="Completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Open" stackId="a" fill="#6366f1" />
                    <Bar dataKey="Overdue" stackId="a" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="analytics-empty">No assigned work yet.</p>
              )}
            </div>
          </article>
        </div>
      ) : (
        <div className="analytics-grid">
          <article className="analytics-panel">
            <h3>Status Breakdown</h3>
            <BarList items={analytics.byStatus} />
          </article>

          <article className="analytics-panel">
            <h3>Priority Mix</h3>
            <BarList items={analytics.byPriority} tone="green" />
          </article>

          <article className="analytics-panel">
            <h3>Team Workload</h3>
            <div className="workload-list">
              {workloadItems.length > 0 ? (
                workloadItems.map((member) => (
                  <div key={member.label} className="workload-item">
                    <div className="workload-copy">
                      <div>
                        <strong>{member.label}</strong>
                        <p>
                          {member.openTasks} open / {member.completedTasks} done
                          {member.overdueTasks > 0 &&
                            ` / ${member.overdueTasks} overdue`}
                        </p>
                      </div>
                      <div className="workload-track">
                        <div
                          className="workload-fill"
                          style={{
                            width: `${(member.value / maxWorkload) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span>{member.value}</span>
                  </div>
                ))
              ) : (
                <p className="analytics-empty">No assigned work yet.</p>
              )}
            </div>
          </article>

          <article className="analytics-panel">
            <h3>Deadline Health</h3>
            <div className="deadline-list">
              {analytics.overdueTaskList?.map((task) => (
                <div key={task.id} className="deadline-item overdue">
                  <div>
                    <strong>{task.title}</strong>
                    <p>
                      {task.status} / {task.priority}
                    </p>
                  </div>
                  <span>{getDeadlineLabel(task)}</span>
                </div>
              ))}
              {analytics.dueSoonTasks.length > 0
                ? analytics.dueSoonTasks.map((task) => (
                  <div key={task.id} className="deadline-item">
                    <div>
                      <strong>{task.title}</strong>
                      <p>
                        {task.status} / {task.priority}
                      </p>
                    </div>
                    <span>{getDeadlineLabel(task)}</span>
                  </div>
                ))
                : null}
              {!analytics.overdueTaskList?.length &&
                !analytics.dueSoonTasks.length && (
                  <p className="analytics-empty">No upcoming deadlines.</p>
                )}
            </div>
          </article>
        </div>
      )}
    </section>
  );
};

export default ProjectAnalytics;
