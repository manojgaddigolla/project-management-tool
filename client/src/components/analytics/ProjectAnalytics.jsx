import React, { useEffect, useMemo, useState } from "react";
import { getProjectAnalytics } from "../../services/projectService";
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

const ProjectAnalytics = ({ projectId, refreshKey }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getProjectAnalytics(projectId);
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
  }, [projectId, refreshKey]);

  const workloadItems = useMemo(() => {
    return (analytics?.memberLoad || []).map((member) => ({
      label: member.name,
      value: member.totalTasks,
      openTasks: member.openTasks,
      completedTasks: member.completedTasks,
      overdueTasks: member.overdueTasks,
    }));
  }, [analytics]);

  const maxWorkload = Math.max(
    ...workloadItems.map((member) => member.value),
    1,
  );

  if (loading) {
    return <div className="analytics-shell">Loading analytics...</div>;
  }

  if (error) {
    return <div className="analytics-shell analytics-error">{error}</div>;
  }

  if (!analytics) {
    return null;
  }

  return (
    <section className="analytics-shell">
      <div className="analytics-header">
        <div>
          <p className="analytics-eyebrow">Insights</p>
          <h2>Project Analytics</h2>
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

      <div className="analytics-kpis">
        <div>
          <span>{analytics.summary.totalTasks}</span>
          <p>Total tasks</p>
        </div>
        <div>
          <span>{analytics.summary.openTasks}</span>
          <p>Open tasks</p>
        </div>
        <div>
          <span>{analytics.summary.overdueTasks}</span>
          <p>Overdue</p>
        </div>
        <div>
          <span>{analytics.summary.activityCount}</span>
          <p>Activity events</p>
        </div>
      </div>

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
    </section>
  );
};

export default ProjectAnalytics;
