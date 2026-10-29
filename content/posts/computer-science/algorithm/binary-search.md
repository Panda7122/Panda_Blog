---
title: "二分搜尋的邊界怎麼寫才不會錯"
date: 2026-10-22
tags: ["binary search", "C++"]
---
用左閉右開 `[lo, hi)` 的寫法，迴圈不變式最清楚：

```cpp
int lower_bound(const vector<int>& a, int x) {
    int lo = 0, hi = a.size();
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] < x) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}
```

時間複雜度為 `O(log n)`。
