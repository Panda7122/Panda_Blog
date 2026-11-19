---
title: "Paper Reading: View-Aware Semantic Alignment for Aerial-Ground Person Re-Identification"
date: 2026-11-19
tags: []
summary: "閱讀CV專題論文"
---
因為CV的期末專題，所以來讀這篇論文
來自CVPR 2026的論文，主要在說空地行人重識別
## 想解決的問題

空地行人重識別（AGPReID）要在無人機（空拍）和地面攝影機之間，找出同一個人。難點是視角差很大：一邊是俯視，一邊是水平視角。

現有方法（VDT、DTST、SeCap、VIF-AGReID）走 view-invariant（視角不變） 路線，把不同視角的共同特徵對齊。作者認為這會出問題：

- 對齊只剩「兩邊都看得到的共同部位」，也就是 part-level alignment。
- 只有單一視角才看得到、但對身分很有判別力的線索被壓掉了，例如地面視角的腿、空拍視角的肩膀。
- 多數方法只用全域特徵（CLS token），忽略局部 patch 裡的細節。

核心主張： 不該壓抑視角資訊，而要把「視角不變的身分特徵」和「視角特定但有判別力的特徵」解耦後一起使用。作者稱之為 view-aware semantic alignment（語意層級對齊）

## 方法架構
ViSA 是 encoder–decoder 結構，由三個部分組成。
![image](media/1795103735152-image.png)
### (1) View-Aware Backbone（VAB）
- 基於 VDT 的 ViT，每層有空拍和地面兩組可學習的 view token。
- CLS token 逐層減去對應的 view token，得到較不受視角影響的全域特徵 $Z_{inv}$，view token 則保留視角特徵 $Z_{spe}$。

### (2) ETGM（Expert-driven Token Generation Module）

- 用 Mixture-of-Experts 產生語意 query。
- 專家分成 shared、aerial、ground 三類，各有 router，每個樣本 top-2 routing。
- 每個專家是一組可學習 token，經過 CrossAttn → SelfAttn → FFN 處理($T' = \text{FFN}(\text{SelfAttn}(\text{CrossAttn}(T, Z)))$)，再加權合成 $Q_{inv}$ 和 $Q_{spe}$。
- 論文設定每類 8 個專家。

### (3) DLFM（Dual-branch Local Fusion Module）

- 分成 view-invariant 和 view-specific 兩個分支。
- 每個 query 用 cosine similarity 從 patch 中選 top-k 最相關的 patch，並把 query 本身當成一個節點，建成 query-augmented 的局部圖。
- 用 GCN 在圖上推理，取出 query 節點作為精煉後的局部特徵 Q̂。
- 最後 $[Q̂_{inv}, Q̂_{spe}, CLS]$ 經過一個 self-attention，輸出最終表示。

### Loss
$L = (L_{id}^{global} + L_{tri}^{global}) + (L_{id}^{local} + L_{tri}^{local}) + L_{o} + L_{view} + \lambda ·L_{balance}$

- $L_{o}$：正交約束，讓 $f_{inv}$ 和 $f_{spe}$ 的 cosine 趨近 0。
- $L_{view}$：用 view token 做空拍／地面二元分類。
- $L_{balance}$：MoE 負載平衡，防止專家塌陷，$\lambda=0.001$。

## 實驗結果
訓練設定如下：
- Backbone：ImageNet 預訓練的 ViT，輸入 256×128。
- Batch：256（64 個 ID × 4 張）。
- 訓練：120 epochs，SGD，lr 8e-3，cosine 降到 1.6e-6。
- 硬體：單張 RTX 4090。

CARGO 資料集：

| 方法 | ALL R1 / mAP | A↔G R1 / mAP |
| --- | --- | --- |
| ViT baseline | 61.54 / 53.54　| 43.13 / 40.11 |
| VDT | 64.10 / 55.20 | 48.12 / 42.76 |
| SeCap | 68.59 / 60.19 | 69.43 / 58.94 |
| **ViSA** | 70.51 / 65.46 | 71.28 / 69.00 |

消融:
![image](media/1795103636127-image.png)

- ViT baseline 的平均成績為 66.70 / 57.37。
- 只加 DLFM，平均提升到 74.97 / 69.47，是單一模組中貢獻最大的。
- VAB + ETGM + DLFM 全加，平均達 78.17 / 71.54，為最佳。

超參數： E=8、top-k 的 k=2 最佳，過多專家或過多啟用專家都會變差。
論文說在 AG-ReID.v2 和 LAGPeR 上取得最佳 mAP，細節在 supplementary。最大的提升是 CARGO 跨視角協定上 mAP 增加 10.06%。
