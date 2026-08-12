import {formatBytes} from "../../shared/export-estimate";
import {getExportPreset} from "../../shared/export-presets";
import {ExternalLink, RotateCw, Trash2, X} from "lucide-react";
import type {RenderJobState} from "./render-job";

export const RenderQueuePanel: React.FC<{
  jobs: RenderJobState[];
  onClear: () => void;
  onRetry: (job: RenderJobState) => void;
}> = ({jobs, onClear, onRetry}) => {
  if (jobs.length === 0) return null;
  const activeCount = jobs.filter((job) => job.status === "queued" || job.status === "rendering").length;
  const latestCompletedJob = jobs.find((job) => job.status === "complete");
  const fileManagerLabel = window.motioner?.platform === "win32" ? "在资源管理器显示" : "在 Finder 显示";
  return <section className="render-panel render-queue-panel" aria-live="polite"><div className="render-queue-heading"><div><strong>导出队列</strong><span>{activeCount > 0 ? `${activeCount} 个待处理` : "全部处理完成"}</span></div><div className="render-queue-actions">{latestCompletedJob && <button type="button" className="render-queue-action" onClick={() => void window.motioner?.revealInFileManager(latestCompletedJob.outputLocation)} title={`${fileManagerLabel}最新导出结果`}><ExternalLink />{fileManagerLabel}</button>}<button type="button" className="render-queue-action render-queue-clear" onClick={onClear} title="清除已完成、已取消和失败的记录" aria-label="清除记录"><Trash2 />清除记录</button></div></div><div className="render-job-list">{jobs.map((job) => {
    const progressPercent = Math.round(job.progress * 100);
    const preset = getExportPreset(job.presetId);
    return <article className={`render-job render-${job.status}`} key={job.jobId}><div className="render-panel-header"><div><strong>{preset.shortLabel} · {job.project.name}</strong><span>{job.detail}</span></div><span className="progress-value">{progressPercent}%</span></div><div className="progress-track" aria-label={`导出进度 ${progressPercent}%`}><span style={{"--render-progress": progressPercent / 100} as React.CSSProperties} /></div><div className="render-job-actions">{(job.status === "queued" || job.status === "rendering") && <button type="button" className="cancel-button icon-btn" onClick={() => void window.motioner?.cancelRender(job.jobId)} title="取消" aria-label="取消"><X /></button>}{(job.status === "error" || job.status === "cancelled") && <button type="button" className="retry-button" onClick={() => onRetry(job)} title="重试"><RotateCw />重试</button>}<span className={`job-status job-status-${job.status}`}>{job.status === "queued" ? "排队" : job.status === "rendering" ? "处理中" : job.status === "complete" ? `已校验 · ${formatBytes(job.validation?.fileSizeBytes ?? 0)}` : job.status === "cancelled" ? "已取消" : "失败"}</span></div>{job.status === "complete" && <p className="output-path" title={job.outputLocation}>{job.outputLocation}</p>}</article>;
  })}</div></section>;
};
