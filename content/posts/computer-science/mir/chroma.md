---
title: "MIR 入門：Chroma Feature"
date: 2026-10-15
tags: ["MIR", "librosa"]
---
Chroma feature 把頻譜能量投影到 12 個半音類別上，常用在和弦辨識與翻唱偵測。

```python
import librosa

y, sr = librosa.load("song.wav")
chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
print(chroma.shape)  # (12, n_frames)
```
