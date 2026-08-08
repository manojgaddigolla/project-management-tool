import React, { useEffect, useMemo, useState } from "react";
import { getProjectAnalytics } from "../../services/projectService";
import { toast } from "react-toastify";
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

Team Workload:
${analytics.memberLoad?.length ? analytics.memberLoad.map(m => `- ${m.name}: ${m.totalTasks} total (${m.openTasks} open, ${m.completedTasks} done, ${m.overdueTasks} overdue)`).join('\n') : "None"}

Upcoming Deadlines:
${[...(analytics.overdueTaskList || []), ...(analytics.dueSoonTasks || [])].map(t => `- ${t.title} (${t.status}, ${t.priority}) - ${getDeadlineLabel(t)}`).join('\n') || "None"}
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

  const handleDownload = () => {
    if (!analyticsText) return;
    const blob = new Blob([analyticsText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Project_Analytics.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  return (
    <section className="analytics-shell">
      <div className="analytics-header" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "24px" }}>
        <div style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap", flex: 1 }}>
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

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button className="board-action-button" onClick={handleCopy} style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
            <i className="fa-solid fa-copy" style={{ marginRight: "6px" }}></i> Copy
          </button>
          <button className="board-action-button" onClick={handleShare} style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
            <i className="fa-solid fa-share-nodes" style={{ marginRight: "6px" }}></i> Share
          </button>
          <button className="board-action-button" onClick={handleDownload} style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
            <i className="fa-solid fa-download" style={{ marginRight: "6px" }}></i> Download
          </button>
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
