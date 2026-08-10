import {describe, expect, it} from "vitest";
import {RenderJobQueue} from "./render-queue";

describe("RenderJobQueue", () => {
  it("sequences jobs and reports how many are ahead", () => {
    const queue = new RenderJobQueue<{jobId: string}>();
    expect(queue.enqueue({jobId: "a"})).toBe(0);
    expect(queue.takeNext()?.jobId).toBe("a");
    expect(queue.enqueue({jobId: "b"})).toBe(1);
    expect(queue.enqueue({jobId: "c"})).toBe(2);
    expect(queue.finish("a")?.jobId).toBe("a");
    expect(queue.takeNext()?.jobId).toBe("b");
    expect(queue.finish("b")?.jobId).toBe("b");
    expect(queue.takeNext()?.jobId).toBe("c");
  });

  it("removes a pending job without disturbing the active job", () => {
    const queue = new RenderJobQueue<{jobId: string}>();
    queue.enqueue({jobId: "active"});
    queue.takeNext();
    queue.enqueue({jobId: "cancel-me"});
    queue.enqueue({jobId: "keep"});
    expect(queue.removePending("cancel-me")?.jobId).toBe("cancel-me");
    expect(queue.getActive()?.jobId).toBe("active");
    queue.finish("active");
    expect(queue.takeNext()?.jobId).toBe("keep");
  });
});
