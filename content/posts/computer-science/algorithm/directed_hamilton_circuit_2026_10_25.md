---
title: "Reduce Vertex Cover to Directed Hamilton Circuit"
date: 2026-10-22
tags: ["reduction", "NP-Complete", "Directed Hamilton Circuit", "Vertex Cover"]
summary: "把 Vertex Cover 多項式時間歸約到 Directed Hamilton Circuit，並證明正確性。"
---

## 問題定義

### Vertex Cover

- **input**：無向圖 $G=(V,E)$ 與整數 $k$
- **question**：是否存在 $S\subseteq V$，$|S|\le k$，使得每條邊 $\{u,v\}\in E$ 至少有一個端點在 $S$ 裡？

### Directed Hamilton Circuit

- **input**：有向圖 $G'=(V',E')$
- **question**：是否存在一個 circuit，**恰好經過每個點一次**？

### 目標

給定 $(G,k)$，在多項式時間內建出有向圖 $G'$，使得

$$
G \text{ 有大小} \le k \text{ 的 vertex cover} \iff G' \text{ 有 directed Hamilton circuit}
$$

不失一般性，先把 $G$ 中 degree 為 0 的孤立點拿掉，它們不影響 vertex cover；並假設 $k\le|V|$，否則答案顯然是 yes。

## 構造 $G'$

整個構造由三種零件組成：**edge gadget**、**vertex chain**、**selector vertices**。

### 1. Edge gadget

對每條邊 $e=\{u,v\}\in E$，建立 4 個點：

$$
\langle u,e,\text{in}\rangle,\ \langle u,e,\text{out}\rangle,\ \langle v,e,\text{in}\rangle,\ \langle v,e,\text{out}\rangle
$$

以及 6 條有向邊：

$$
\begin{aligned}
&(\langle u,e,\text{in}\rangle, \langle u,e,\text{out}\rangle), && (\langle v,e,\text{in}\rangle, \langle v,e,\text{out}\rangle) \\
&(\langle u,e,\text{in}\rangle, \langle v,e,\text{in}\rangle), && (\langle v,e,\text{in}\rangle, \langle u,e,\text{in}\rangle) \\
&(\langle u,e,\text{out}\rangle, \langle v,e,\text{out}\rangle), && (\langle v,e,\text{out}\rangle, \langle u,e,\text{out}\rangle)
\end{aligned}
$$

我們把這 4 個點和 6 條邊稱為一個 **gadget**。畫出來長這樣：上面一排屬於 $u$，下面一排屬於 $v$，兩個 in 之間、兩個 out 之間都是雙向邊。

```text
chain(u) ──► <u,e,in> ──────► <u,e,out> ──► chain(u)
               ▲  │             ▲  │
               │  ▼             │  ▼
chain(v) ──► <v,e,in> ──────► <v,e,out> ──► chain(v)
```

### 2. Vertex chain

對每個點 $v$，設它相鄰的邊依某個固定順序為 $e_1,e_2,\dots,e_{d}$（$d=\deg(v)$），把這些 gadget 中屬於 $v$ 的那一排串起來：

$$
(\langle v,e_1,\text{out}\rangle,\langle v,e_2,\text{in}\rangle),\ (\langle v,e_2,\text{out}\rangle,\langle v,e_3,\text{in}\rangle),\ \dots,\ (\langle v,e_{d-1},\text{out}\rangle,\langle v,e_{d},\text{in}\rangle)
$$

這條路徑 $\langle v,e_1,\text{in}\rangle \to \cdots \to \langle v,e_d,\text{out}\rangle$ 稱為 $\text{chain}(v)$。

### 3. Selector vertices

再建立 $k$ 個點 $a_1,a_2,\dots,a_k$，稱為 **selector vertices**。每個 selector 都可以進入、也可以接收任何一條 chain：

$$
(a_i,\ \langle v_j,e_1,\text{in}\rangle),\quad (\langle v_j,e_{d_j},\text{out}\rangle,\ a_i)
\qquad \forall\, 1\le i\le k,\ 1\le j\le |V|
$$

這裡 $e_1$、$e_{d_j}$ 分別是 $\text{chain}(v_j)$ 的第一條與最後一條邊，共 $2k|V|$ 條邊。

直覺上：**每個 selector 代表「選一個點放進 vertex cover」**，$k$ 個 selector 就代表最多選 $k$ 個點。

### 構造的大小

| 部分 | 點數 | 邊數 |
| --- | --- | --- |
| edge gadget | $4\lvert E\rvert$ | $6\lvert E\rvert$ |
| vertex chain | — | $\sum_v(\deg(v)-1) \le 2\lvert E\rvert$ |
| selector | $k$ | $2k\lvert V\rvert$ |

全部都是 $|V|,|E|$ 的多項式，所以這是一個 polynomial-time reduction。

## 關鍵性質：gadget 只能怎麼走

在證明之前，先看 gadget 的一個重要性質：

> 如果 Hamilton circuit 從 $\langle u,e,\text{in}\rangle$ 進入 gadget，那它一定從 $\langle u,e,\text{out}\rangle$ 離開（$v$ 那一排同理）。

用反證法：假設從 $\langle u,e,\text{in}\rangle$ 進入，卻從 $\langle v,e,\text{out}\rangle$ 離開、走向 $\text{chain}(v)$。

- $\langle u,e,\text{out}\rangle$ 的前一個點只能是 $\langle u,e,\text{in}\rangle$ 或 $\langle v,e,\text{out}\rangle$。後者的下一步已經是 $\text{chain}(v)$，所以必須是 $\langle u,e,\text{in}\rangle\to\langle u,e,\text{out}\rangle$。
- 因為最後要從 $\langle v,e,\text{out}\rangle$ 離開，接著只能走 $\langle u,e,\text{out}\rangle\to\langle v,e,\text{out}\rangle$。
- 這時 $\langle v,e,\text{in}\rangle$ 還沒被拜訪，但它的下一步只能是 $\langle u,e,\text{in}\rangle$ 或 $\langle v,e,\text{out}\rangle$，兩者都已經被拜訪過了，矛盾。

所以「從 $u$ 進、從 $v$ 出」不可能發生。因此通過 gadget 只有三種走法：

1. **只有 $u$ 經過**：$\langle u,e,\text{in}\rangle\to\langle v,e,\text{in}\rangle\to\langle v,e,\text{out}\rangle\to\langle u,e,\text{out}\rangle$，一次拜訪全部 4 個點
2. **只有 $v$ 經過**：$\langle v,e,\text{in}\rangle\to\langle u,e,\text{in}\rangle\to\langle u,e,\text{out}\rangle\to\langle v,e,\text{out}\rangle$
3. **$u$、$v$ 各經過一次**：$\langle u,e,\text{in}\rangle\to\langle u,e,\text{out}\rangle$，之後某個時間點再 $\langle v,e,\text{in}\rangle\to\langle v,e,\text{out}\rangle$

不存在任何走法可以在 $\text{chain}(u)$ 與 $\text{chain}(v)$ 都沒經過的情況下拜訪這個 gadget。

## 正確性證明

### ($\Rightarrow$) $G$ 有大小 $\le k$ 的 vertex cover $\implies$ $G'$ 有 Hamilton circuit

設 vertex cover 為 $S$。若 $|S|<k$，就任意補上不在 $S$ 中的點直到 $|S|=k$（補完仍是 vertex cover）。記 $S=\{v_1,v_2,\dots,v_k\}$。

把 circuit 切成 $k$ 段，每個 selector 帶出一條 chain：

$$
a_1\to\text{chain}(v_1)\to a_2\to\text{chain}(v_2)\to\cdots\to a_k\to\text{chain}(v_k)\to a_1
$$

走 $\text{chain}(u)$（$u\in S$）時，對每條相鄰邊 $e=\{u,v\}$ 分兩種情況：

1. **另一端 $v\notin S$**：$\text{chain}(v)$ 永遠不會被走到，所以由 $u$ 一次走完整個 gadget：
   $\langle u,e,\text{in}\rangle\to\langle v,e,\text{in}\rangle\to\langle v,e,\text{out}\rangle\to\langle u,e,\text{out}\rangle$
2. **另一端 $v\in S$**：兩端都在 cover 中，$u$ 只走自己那一排 $\langle u,e,\text{in}\rangle\to\langle u,e,\text{out}\rangle$；之後走到 $\text{chain}(v)$ 時，$v$ 再走 $\langle v,e,\text{in}\rangle\to\langle v,e,\text{out}\rangle$

因為 $S$ 是 vertex cover，每條邊 $e=\{u,v\}$ 至少有一個端點在 $S$ 中，所以每個 gadget 的 4 個點都恰好被拜訪一次；$a_1,\dots,a_k$ 也各被拜訪一次。因此這是一個 Hamilton circuit。

### ($\Leftarrow$) $G'$ 有 Hamilton circuit $\implies$ $G$ 有大小 $\le k$ 的 vertex cover

在 $G'$ 中：

- $a_i$ 的 outgoing edge 只會指向某條 chain 的起點 $\langle u,e_1,\text{in}\rangle$
- $a_i$ 的 incoming edge 只會來自某條 chain 的終點 $\langle u,e_d,\text{out}\rangle$

由 gadget 的性質，從 $\langle u,e_1,\text{in}\rangle$ 進入之後，circuit 會一路沿著 $\text{chain}(u)$ 走到 $\langle u,e_d,\text{out}\rangle$，再回到某個 selector。所以 circuit 的形狀一定是「selector → 一整條 chain → selector → …」。

令

$$
S=\{u\in V \mid \text{chain}(u) \text{ 由某個 } a_i \text{ 直接進入}\}
$$

因為只有 $k$ 個 selector，每個 selector 只帶出一條 chain，所以 $|S|\le k$。

接著看任一條邊 $e=\{u,v\}$。Hamilton circuit 拜訪了 $G'$ 的所有點，包含這個 gadget 的 4 個點。由上面的性質，只有三種走法，而每一種都需要走過 $\text{chain}(u)$ 或 $\text{chain}(v)$ 至少一條，也就是 $u\in S$ 或 $v\in S$。

所以每條邊都至少有一個端點在 $S$ 裡，$S$ 是一個大小 $\le k$ 的 vertex cover。 $\blacksquare$

## 結論

1. Directed Hamilton Circuit $\in$ NP：給一個點的排列，可以在多項式時間內檢查它是不是 Hamilton circuit
2. Vertex Cover $\le_p$ Directed Hamilton Circuit（上面的構造）
3. Vertex Cover 是 NP-complete

所以 **Directed Hamilton Circuit 是 NP-complete**。歸約鏈為：

$$
\text{SAT}\ \le_p\ \text{Clique}\ \le_p\ \text{Vertex Cover}\ \le_p\ \text{Directed Hamilton Circuit}
$$
