---
title: "MIR 入門：名詞介紹"
date: 2026-10-29
tags: ["MIR"]
summary: "簡單介紹什麼是MIR"
draft: true
---
這邊會介紹MIR是什麼、常見的名詞意思是什麼、常用的工具

## MIR 是什麼
MIR 全名是 music information retrieval (音樂資訊檢索)
顧名思義，通常是做音樂相關的資訊分析
包含但不限於
- 曲風分析
- 歌曲推薦
- 歌曲相似度
- 音源分離
- 旋律、音高分析
- 節奏、節拍分析
- 曲調分析
- 和弦分析
- 情緒分析
- 轉譜
- 歌曲生成

基本上是你想得到的跟音樂相關的任務都屬於MIR的範疇，這些大部分都是辨識、分類的衍生任務

## 常見樂理名詞
### 旋律相關
pitch: 音高，基本上就是這個音符是什麼音，像是C4, E6, F#6等等的，而物理上來說就是這段聲音的頻率高低，公式為$f=440\times 2^{(p-69)/12}$, 這裡的$p$指的是MIDI標準的音符，定義A4=69, 每高一個半音就是+1反之亦然

fundamental frequency: 基頻, 聲音振動發聲時，聲音可以分解為很多的正弦波
換句話說，自然的聲音是很多頻率不同的正弦波組成的，最低頻率的就是**基頻(基音)**，反之其他則稱為**泛音**
**在音樂中，基頻決定了音高，泛音決定了樂器**

chord: 和弦，簡單來說是把 2 個或 3 個以上不同的音，同時（或依序）彈出來的聲音組合，負責給旋律提供情緒、厚度、立體感
常見的和弦類型大致上可以分成大和弦、小和弦
大和弦聽起來比較明亮開朗，像是C和弦(C-E-G)
小和弦聽起來相較悲傷、憂鬱、柔和，像是Cm和弦(C-E♭-G)
詳細可以參考好和弦的介紹 https://nicechord.com/post/chord-symbols/

Tone/Semitone:全音和半音，基本上代表了音高之間的距離，一個全音是兩個半音，而一個半音就是音高之間最短的距離單位
而音高順序是`C,C#/D♭, D, D#/E♭, E, F, F#/G♭, G, G#/A♭, A, A#/B♭, B`

tonic: 主音（Tonic）是指某個調性中的起始音或核心音，通常以羅馬數字「I」表示。

key: 符合基本音階的音程結構所構成的音列的音高位置，就叫作調，而調性往往會決定一首歌的氣氛跟情緒，像是小調通常是比較負面、陰暗的情緒
聽起來很抽象但基本上意思是以一個音為主（主音）組成一系列的音，大致上可以分成大調、小調
大調是以主音為起點，數全全半全全全半到下一個主音
像是C大調就是C,D,E,F,G,A,B,C
同理D大調就是D,E,F#,G,A,B,C#,D
小調則是以主音為起點，數全半全全半全全到下一個主音
像是C小調就是C,D,E♭,F,G,A♭,B♭,C

而在記譜的時候習慣用有哪些升降記號來記，像是D大調就是`升C升C`

### 節奏相關
beat: 拍，聽音樂時會想跟著點頭、打拍子的那個規律脈動，就是拍。拍是節奏的基本單位，MIR 裡的 **beat tracking** 就是要找出每一拍出現的時間點。

downbeat: 每個小節的第一拍，通常是聽起來最重的那一拍。**downbeat tracking** 比 beat tracking 更難，因為除了找出拍點，還要知道哪一拍是小節的開頭。

onset: 一個音開始發聲的時間點。鼓、鋼琴這種敲擊型的聲音 onset 很明顯；小提琴、人聲這種慢慢變大聲的音就很難抓準。**onset detection** 常常是轉譜和節拍分析的第一步。

offset: 一個音結束的時間點。在轉譜裡，一個音符通常就用 (onset, offset, pitch) 來描述，有時候再加上 velocity（力度）。

BPM: 每分鐘有幾拍，用來表示速度（tempo）。每一拍的長度是 $60/\text{BPM}$ 秒，例如 120 BPM 就是一拍 0.5 秒。

time signature: 拍號表示每小節有幾拍、以什麼音符為一拍，例如 4/4 是每小節 4 拍、四分音符為一拍，3/4 則是華爾滋常見的三拍子。樂譜會以小節為單位切開。

bar: 小節
TPQN: MIDI 檔的時間解析度，表示一個四分音符被切成幾個 tick（也叫 PPQ）。例如 TPQN = 480 時，一個八分音符就是 240 ticks。換算成秒數：
$$\text{秒數} = \frac{\text{ticks}}{\text{TPQN}} \times \frac{60}{\text{BPM}}$$
（這裡假設 BPM 以四分音符為一拍）
### 其他
score: 用符號記錄音樂的方式，最常見的是五線譜。電腦上常用 MusicXML（保留完整記譜資訊）或 MIDI（比較接近演奏資訊）來存。

transcript: 把 audio 轉成 symbolic，也就是「聽歌寫譜」，正式名稱是 automatic music transcription（AMT）。只轉旋律相對簡單，多樂器同時演奏（polyphonic）的轉譜到現在都還是很難的問題。

midi: 不是聲音，而是一串「事件」：哪個音（0–127，就是前面 pitch 公式的 p）、什麼時候按下、什麼時候放開、力度（velocity，0–127）多大。同一份 MIDI 給不同音色播放，聽起來就會不一樣。

## 常用工具

**音訊分析**
- [librosa](https://librosa.org/)：Python 做音訊分析的標配，讀檔、頻譜、chroma、onset、beat tracking 都有
- [madmom](https://github.com/CPJKU/madmom)：beat / downbeat tracking 很強
- [Essentia](https://essentia.upf.edu/)：功能很完整的音訊分析函式庫，C++ 寫的、有 Python 介面
- torchaudio：PyTorch 生態系的音訊工具，做深度學習會用到

**符號音樂（MIDI / 樂譜）**
- [pretty_midi](https://github.com/craffel/pretty-midi)、mido、miditoolkit：讀寫、操作 MIDI
- [music21](https://web.mit.edu/music21/)：樂譜分析，調性、和弦分析都可以做

**現成模型**
- [Demucs](https://github.com/facebookresearch/demucs)：音源分離（人聲、鼓、貝斯、其他）
- [Basic Pitch](https://github.com/spotify/basic-pitch)：Spotify 的轉譜模型，audio 轉 MIDI
- [CREPE](https://github.com/marl/crepe)：單音音高（F0）偵測

**評估與視覺化**
- [mir_eval](https://github.com/craffel/mir_eval)：MIR 各種任務的標準評估指標
- [Sonic Visualiser](https://www.sonicvisualiser.org/)：看頻譜、標註音訊的桌面軟體
- MuseScore：免費打譜軟體，可以開 MIDI / MusicXML

