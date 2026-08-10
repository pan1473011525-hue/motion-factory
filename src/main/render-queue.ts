export class RenderJobQueue<T extends {jobId: string}> {
  private current: T | null = null;
  private readonly pending: T[] = [];

  public enqueue(job: T): number {
    const queuedAhead = this.pending.length + (this.current ? 1 : 0);
    this.pending.push(job);
    return queuedAhead;
  }

  public takeNext(): T | null {
    if (this.current) return null;
    this.current = this.pending.shift() ?? null;
    return this.current;
  }

  public getActive(): T | null {
    return this.current;
  }

  public finish(jobId: string): T | null {
    if (this.current?.jobId !== jobId) return null;
    const finished = this.current;
    this.current = null;
    return finished;
  }

  public removePending(jobId: string): T | null {
    const index = this.pending.findIndex((job) => job.jobId === jobId);
    if (index === -1) return null;
    return this.pending.splice(index, 1)[0] ?? null;
  }

  public clear(): void {
    this.pending.length = 0;
  }

  public get size(): number {
    return this.pending.length + (this.current ? 1 : 0);
  }
}
