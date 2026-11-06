---
title: "網站架設記錄：線上混音平台"
date: 2026-11-06
tags: []
summary: "簡單介紹一下我最近做的混音平台"
---
在大一的時候我因緣際會下加入了嘻研社，並且在那邊學到了一些基礎的混音知識
其實那時候我就一直很想玩玩看混音，但又不想花錢買 FL studio，一方面也是不知道自己有沒有時間
就這樣一直被我放置在那邊直到現在，我才想起來，剛好有時間就請claude幫我把想法implement了
只能說claude code真的太強大了，我的要求丟給他他就變出來這個網頁了
![image](media/1793953010750-image.png)
基本上這個網頁常見功能都有，首先最基本的音軌編輯、打譜都是可以做的
![image](media/1793953825399-image.png)
![image](media/1793953928009-image.png)
當然也能複製、剪裁片段
此外我有套一個樂器、人聲分離的model可以用，不過目前還在實驗就是了，畢竟算力不是免費的qwq，如果有人有免費算力server給我用我也很樂意 :rofl:

再來就是常用的混音工具～
EQ, Compression, Volume balance, panning, Reverb&Delay 都有做
![image](media/1793954239638-image.png)
也有一些內建的參數可以給你快速調整


## 技術細節

接下來稍微講一下這東西背後是怎麼做的，有興趣的可以看看～

### 整體架構
前端完全是 vanilla JS，沒有用任何框架，也沒有 build step，直接丟 HTML + JS + CSS 就能跑
所有的聲音處理都是在瀏覽器裡面用 **Web Audio API** 做的，所以混音本身完全不需要後端
後端只負責儲存跟音源分離而已

一開始後端是用 Node.js + Express 寫的，但問題是這樣我電腦就要一直開著==
所以後來就改成 **Cloudflare Workers**

另外因為 API 是公開的網址，為了避免路人亂上傳檔案（或是花我的錢跑 AI），有加一個簡單的存取金鑰
沒金鑰的人還是可以正常混音、打譜、匯出，只是不能存到伺服器上

### 每一軌的訊號鏈
每一個音軌在 Web Audio 裡面大概長這樣：

```
音源 → EQ (7 段) → Compressor → Panner → 音量 ─┬→ Master (Limiter → 總音量) → 輸出
                                              ├→ Reverb send → pre-delay → Convolver
                                              └→ Delay send → Delay ⇄ feedback
```

- **EQ**：用 7 個 `BiquadFilterNode` 串起來，分別是 High-pass、Low shelf、三段 Peaking（250 / 1k / 4k）、High shelf、Low-pass
  上面那個曲線圖可以直接拖點來調頻率跟增益，滾輪可以改 Q 值
- **Compression**：用 `DynamicsCompressorNode`，threshold、ratio、attack、release、knee 都可以調，旁邊還會顯示即時的 gain reduction
- **Panning**：`StereoPannerNode`，數值框可以直接打 L30 / C / R30 這種格式
- **Reverb**：用 `ConvolverNode`，不過我沒有去找真實空間錄的 impulse response，而是直接用程式生一段指數衰減的白噪音當 IR
  ```js
  // 在 decay 秒時衰減到 -60 dB
  const env = Math.exp((-6.9 * t) / decay) * Math.min(1, t / 0.004);
  d[i] = (Math.random() * 2 - 1) * env;
  ```
  效果意外的還不錯，而且衰減時間可以隨便調
- **Delay**：`DelayNode` 加一個 feedback 迴路，可以跟 BPM 同步（例如 1/8 附點），也可以直接用毫秒
- Reverb 跟 Delay 都是用 **send** 的方式接，比較像真的混音台的用法，而不是每軌各自插一個效果器

### 自動混音
這個是我覺得蠻好玩的部分
每一軌可以選「角色」（人聲、大鼓、貝斯、吉他、鍵盤……），再選一個曲風（流行、嘻哈、搖滾、EDM、抒情、Podcast）
程式就會依照「曲風 × 角色」的模板去設定 EQ、壓縮、殘響、延遲

音量的部分會先算每一軌的 RMS 響度，再跟模板裡這個角色的目標響度比較，差多少就補多少：
```js
return clamp(tpl.level - (rms + tr.clipGainDb), -40, 12);
```
聲像則是會把同一個角色的多個音軌自動左右散開，例如兩把吉他就會一左一右
當然這只是一個起點，最後還是要自己用耳朵聽慢慢調 XD

### 打譜跟樂器音軌
非音檔的音軌就是樂器音軌，每個 bar 可以點兩下打開 piano roll 來打譜
音符是用「拍」來存的（起點、長度、音高、力度），所以改 BPM 的時候整首會自己跟著變

播放的部分不能一次把所有音符排進去，不然歌一長就會卡
所以用了常見的 **look-ahead scheduler**：每 40ms 檢查一次，把接下來 0.3 秒內要響的音符先排好，這樣時間準又不會吃太多效能

內建樂器全部都是用 Web Audio 即時合成的
- 鋼琴、風琴、弦樂、合成器之類的是減法合成（振盪器 + 濾波器 + 包絡）
- 吉他是用 **Karplus-Strong** 演算法（一段噪音丟進有衰減的 delay loop，就會變成撥弦的聲音，蠻神奇的）
- 鼓組也都是合成的，音高對應 General MIDI 的鼓組編號

不過說實話合成的鋼琴真的很難聽 :sweat_smile:
所以後來又加了 **sampler**，可以上傳自己的音色
- 只要上傳幾個音的樣本，其他音高會找最接近的樣本，用 `playbackRate` 去變調
- 樣本的根音可以從檔名判斷（例如 `Piano C4.wav`），檔名沒寫的話會用自相關（autocorrelation）自動偵測音高
- 前面的靜音也會自動切掉，不然按下去會有延遲感
- 鼓組的話就是一個 pad 對一個樣本

### 剪輯
音檔軌跟樂器軌都可以選取、複製、剪下、貼上，同類型的音軌之間也可以互相貼
音檔的剪下是「留白」而不是把後面往前推（non-ripple），這樣才不會把整首對好的拍子弄亂
也有 undo / redo，原理是每次編輯前存一個快照
因為 AudioBuffer 在這裡被當成 immutable，快照只要存參照就好，不用每次都複製一大塊音訊

### 錄音跟匯出
- 錄音用 `MediaRecorder`，會依照瀏覽器回報的 latency 做補償，不然錄進來的聲音會跟拍子對不齊
- 匯出 WAV 是用 `OfflineAudioContext` 把整首用一樣的訊號鏈重新 render 一次，所以會比即時播放快很多，最後再自己把 PCM 編成 WAV 檔
- 混音參數可以存成 JSON 檔下載，之後再上傳回來就能接著做

### 音源分離
音源分離用的是 Meta 的 **HTDemucs**，可以把一首歌拆成人聲、鼓、貝斯、其他
問題是這東西要 PyTorch + GPU，Cloudflare Workers 根本跑不動
所以目前是丟給 [Replicate](https://replicate.com) 上的雲端 GPU 跑，流程大概是：
1. Worker 幫音檔產生一個有 HMAC 簽名、有時效的下載連結，丟給 Replicate
2. 前端每隔幾秒去問 Worker 進度，Worker 再去問 Replicate（Workers 沒辦法常駐在背景，所以只能靠 polling 推進）
3. 跑完之後 Worker 把分好的 stem 存回 R2，自動變成新的音軌

但就跟我說的一樣算力不是免費的，Replicate 用多少付多少，所以現在去用應該是沒有辦法跑得
本機版的後端其實也可以直接用自己的顯卡跑，只是這樣電腦又要一直開著了

總之，接下來我應該也會陸陸續續的調整內容跟在這上面研究混音~
之後再來慢慢學習，我也會跟大家分享心得

網址：https://online-audio-mixer.panda7122.workers.dev/
source code: https://github.com/Panda7122/online_audio_mixer.git
