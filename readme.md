# 点対称連結ポリオミノ同士の引き算

+ 図形A: ピンク色のポリオミノ（手動で描画するポリオミノ）
+ 図形B: 水色のポリオミノ（探索により見つかった点対称連結ポリオミノ）

あなたは図形Aを描きます。
図形全体が点対称連結ポリオミノになるような図形Bを探索するプログラムです。

## 探索手順
1. 全体(図形A+図形B)の中心点を濃い点線で示した長方形内の1箇所に決め打ち。
1. 図形Bの中心点位置を決め打ち。
1. それぞれの中心点での点対称操作を交互に繰り返し、図形Bのエリアを増やす。
1. 全体(図形A+図形B)と図形Bがそれぞれ連結点対称になっていれば、その時の中心点を記録する。
1. 上記を1. 2.を全探索する形で繰り返す。3