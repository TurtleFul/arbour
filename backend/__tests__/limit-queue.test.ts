import { describe, expect, test } from "bun:test";
import { LimitQueue } from "../utils/limit-queue";

describe("LimitQueue", () => {
    test("keeps items while under the limit", () => {
        const q = new LimitQueue<number>(3);
        q.pushItem(1);
        q.pushItem(2);
        expect([ ...q ]).toEqual([ 1, 2 ]);
        expect(q.length).toBe(2);
    });

    test("evicts the oldest item once the limit is exceeded", () => {
        const q = new LimitQueue<number>(3);
        q.pushItem(1);
        q.pushItem(2);
        q.pushItem(3);
        q.pushItem(4);
        expect([ ...q ]).toEqual([ 2, 3, 4 ]);
        expect(q.length).toBe(3);
    });

    test("keeps evicting as more items are pushed", () => {
        const q = new LimitQueue<number>(2);
        for (const n of [ 1, 2, 3, 4, 5 ]) {
            q.pushItem(n);
        }
        expect([ ...q ]).toEqual([ 4, 5 ]);
    });

    test("calls onExceed with the evicted item", () => {
        const q = new LimitQueue<string>(1);
        const evicted: (string | undefined)[] = [];
        q.__onExceed = (item) => evicted.push(item);
        q.pushItem("a");
        q.pushItem("b");
        q.pushItem("c");
        expect(evicted).toEqual([ "a", "b" ]);
        expect([ ...q ]).toEqual([ "c" ]);
    });

    test("does not call onExceed while under the limit", () => {
        const q = new LimitQueue<number>(5);
        let calls = 0;
        q.__onExceed = () => calls++;
        q.pushItem(1);
        q.pushItem(2);
        expect(calls).toBe(0);
    });
});
