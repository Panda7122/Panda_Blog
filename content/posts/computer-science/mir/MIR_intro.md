---
title: "MIR 入門：名詞介紹"
date: 2026-10-29
tags: ["MIR"]
summary: "簡單介紹什麼是MIR"
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

velocity: MIDI 裡記錄「這個音按得多用力」的數值，範圍是 0–127（這裡的 0 有特殊意義，等同於放開按鍵）。
velocity 不只影響音量，通常也會影響音色。像真的鋼琴，敲得越大力聲音越亮，所以好的音源會依 velocity 切換不同的取樣。
樂譜上的力度記號（pp、p、mp、mf、f、ff）沒有固定對應的數值，大致上是 pp 偏低、ff 接近 127。
在轉譜任務中，除了 onset、offset、pitch，有些模型（例如鋼琴轉譜）也會一起預測 velocity。

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

### 訊號處理相關
#### sample rate（取樣率）
電腦沒辦法存連續的聲波，只能每隔一小段時間記錄一次波形的高度，這個動作叫取樣。**每秒取幾個點**就是取樣率，單位是 Hz。
- CD 音質是 44100 Hz，也就是每秒 44100 個點
- MIR 常把音檔降到 22050 Hz 或 16000 Hz，資料量比較小，對大部分任務也夠用

取樣率決定了能記錄的最高頻率：**最高只能記錄到取樣率的一半**（奈奎斯特頻率，Nyquist frequency）。人耳大約聽得到 20 Hz 到 20 kHz，所以 CD 才會選 44.1 kHz（一半是 22.05 kHz，剛好涵蓋人耳範圍）。

#### spectrogram / STFT（頻譜圖 / 短時傅立葉轉換）
波形只看得出「什麼時候比較大聲」，看不出「裡面有哪些音」。傅立葉轉換（FFT）可以把一段聲音拆成各個頻率的強度，但對整首歌做一次 FFT，時間資訊就全部不見了。

所以 **STFT** 的做法是：
1. 把聲音切成很多段重疊的短片段（frame），例如每段 2048 個點，每次往後移 512 個點（hop length）
2. 每一段各做一次 FFT
3. 把結果依時間排起來

排起來的結果就是 **spectrogram（頻譜圖）**：橫軸是時間，縱軸是頻率，顏色深淺是那個頻率在那個時間點的強度。強度通常會再取 log 轉成 dB，比較接近人耳對大小聲的感覺。

這裡有一個取捨：**片段切越長，頻率分得越細，但時間就越模糊**，反之亦然。
例如取樣率 22050 Hz、每段 2048 點時，頻率解析度大約是 $22050 / 2048 \approx 10.8$ Hz，每段約 93 毫秒；hop length 512 點則代表每約 23 毫秒產生一個 frame。

#### mel spectrogram（梅爾頻譜圖）
人耳對低頻的變化很敏感，對高頻比較遲鈍：100 Hz 和 200 Hz 聽起來差很多，但 10000 Hz 和 10100 Hz 幾乎分不出來。
**mel 刻度**就是模仿人耳感覺的頻率刻度，常用的換算公式是：
$$m = 2595 \log_{10}\left(1 + \frac{f}{700}\right)$$

mel spectrogram 就是把一般頻譜圖的頻率軸，依照 mel 刻度重新分成幾十到一百多個頻帶（常見 80 或 128 個）：低頻分得細、高頻分得粗。這樣資料量變小，又保留了人耳在意的資訊，所以是**深度學習模型最常用的輸入**之一。

另外還有一種叫 **CQT（Constant-Q Transform）** 的頻譜，它的頻率刻度直接對齊半音，每個八度切成一樣多格，特別適合處理音高和和弦。

#### chroma（音級特徵）
前面說過一個八度有 12 個音（C、C#、D、…、B）。chroma 的想法是**不管八度，把所有 C 都加在一起、所有 C# 都加在一起……**，最後每個時間點只剩一個 12 維的向量，代表這 12 個音級各自有多強。

這樣做的好處是：
- 不管音在哪個八度、用什麼樂器演奏，結果都差不多，只保留「和聲」資訊
- 很適合拿來做**和弦辨識、調性辨識、翻唱歌曲偵測**

例如一段 C 大和弦，chroma 上 C、E、G 三格會特別亮。

用 [librosa](https://librosa.org/) 可以很快算出上面這些東西：

```python
import librosa
import numpy as np

y, sr = librosa.load('song.wav', sr=22050)        # 讀檔並重新取樣到 22050 Hz

S = librosa.stft(y, n_fft=2048, hop_length=512)   # STFT
spec_db = librosa.amplitude_to_db(np.abs(S), ref=np.max)

mel = librosa.feature.melspectrogram(y=y, sr=sr, n_fft=2048, hop_length=512, n_mels=128)
mel_db = librosa.power_to_db(mel, ref=np.max)

chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=512)  # shape: (12, frame 數)
```
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

## 常見評估指標
#### 轉譜怎麼評估：COn、COnP、COnPOff

轉譜模型輸出一串音符後，要跟標準答案（ground truth）比對，看「對了幾個音」。問題是，怎樣才算「對」？
於是有了三種由寬到嚴的標準，三種都只是在問「這個預測的音能不能跟某個正確答案配對成功」：

| 指標 | 全名 | 要對的東西 |
| --- | --- | --- |
| **COn** | Correct Onset | onset |
| **COnP** | Correct Onset & Pitch | onset + pitch |
| **COnPOff** | Correct Onset, Pitch & Offset | onset + pitch + offset |

時間和音高不可能完全一模一樣，所以每一項都有容許誤差（以下是最常用的預設值）：
- **onset**：和正確答案相差 **±50 毫秒**以內
- **pitch**：相差 **±50 cents** 以內。1 個半音 = 100 cents，所以 ±50 cents 就是「最接近的半音要對」；如果音高是 MIDI 的整數音符，等於必須完全一樣
- **offset**：相差在「**正確音長的 20%**」或「**50 毫秒**」之內，取比較大的那個。例如正確答案的音長是 2 秒，容許誤差就是 0.4 秒；音很短的話至少也有 50 毫秒

配對是**一對一**的：每個正確音符最多只能配到一個預測音符，所以同一個音預測兩次，多出來的那個算錯。

配對完之後，用 precision、recall、F1 計分：

$$
\text{Precision} = \frac{\text{配對成功的音數}}{\text{預測的音數}},\qquad
\text{Recall} = \frac{\text{配對成功的音數}}{\text{正確答案的音數}},\qquad
F_1 = \frac{2PR}{P+R}
$$

- precision 低：多猜了很多不存在的音
- recall 低：漏掉了很多該有的音

##### 舉個例子

正確答案有 3 個音，模型預測出 4 個音：

| | 音高 | onset (s) | offset (s) |
| --- | --- | --- | --- |
| 答案 1 | C4 | 0.00 | 0.50 |
| 答案 2 | E4 | 0.50 | 1.00 |
| 答案 3 | G4 | 1.00 | 2.00 |
| 預測 a | C4 | 0.02 | 0.48 |
| 預測 b | F4 | 0.53 | 1.00 |
| 預測 c | G4 | 1.04 | 1.50 |
| 預測 d | A4 | 1.60 | 1.80 |

- **a**：onset 差 20 ms、音高對、offset 差 20 ms（容許 max(50 ms, 0.5×20%) = 100 ms）→ 三種都算對
- **b**：onset 差 30 ms，但把 E4 猜成 F4 → 只有 COn 算對
- **c**：onset、音高都對，但 offset 差 500 ms（容許 max(50 ms, 2.0×20%) = 400 ms）→ COn、COnP 對，COnPOff 錯
- **d**：附近沒有任何正確答案 → 三種都錯

| 指標 | 配對成功 | Precision | Recall | F1 |
| --- | --- | --- | --- | --- |
| COn | 3（a, b, c） | 3/4 = 0.75 | 3/3 = 1.00 | 0.857 |
| COnP | 2（a, c） | 2/4 = 0.50 | 2/3 ≈ 0.667 | 0.571 |
| COnPOff | 1（a） | 1/4 = 0.25 | 1/3 ≈ 0.333 | 0.286 |

可以看到標準越嚴格分數越低。論文裡通常會三個都報：COn 看「節奏抓得準不準」，COnP 是最常被拿來比較的主要指標，COnPOff 則是最完整也最難的。

##### 用 mir_eval 計算

實際上不用自己寫，[mir_eval](https://github.com/craffel/mir_eval) 已經實作好了（音高要用 Hz，時間用秒）：

```python
import mir_eval

# intervals: shape (n, 2)，每列是 [onset, offset]；pitches: shape (n,)，單位 Hz
# COn
p, r, f = mir_eval.transcription.onset_precision_recall_f1(
    ref_intervals, est_intervals, onset_tolerance=0.05)

# COnP（offset_ratio=None 代表不看 offset）
p, r, f, _ = mir_eval.transcription.precision_recall_f1_overlap(
    ref_intervals, ref_pitches, est_intervals, est_pitches,
    onset_tolerance=0.05, pitch_tolerance=50.0, offset_ratio=None)

# COnPOff
p, r, f, _ = mir_eval.transcription.precision_recall_f1_overlap(
    ref_intervals, ref_pitches, est_intervals, est_pitches,
    onset_tolerance=0.05, pitch_tolerance=50.0, offset_ratio=0.2, offset_min_tolerance=0.05)
