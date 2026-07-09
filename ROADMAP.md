# LJT-S 公開ロードマップ

最終更新: 2026-07-10
リポジトリ: https://github.com/Ryuya-dot-com/LJT-S (GitHub Pages でホスト予定)

## 成果物(ゴール)

| # | 成果物 | 対象ユーザー | 完成の定義 |
|---|---|---|---|
| A | **Web版(公開ページ)** | 一般受験者・教員経由の生徒 | URLを開くだけで受験でき、終了時に画面へ素点+TOEIC Listening予測(準備中→実装)+CEFR参考レベルを表示。結果は自動でGoogle Sheetに保存 |
| B | **Web版(研究者モード)** | 研究者・大学院生 | timed/untimed等を設定した参加者URLを配布し、全参加者のデータがSheetに自動集約+セッションごとの要約メール受信 |
| C | **Zip配布版** | 研究者・大学院生 | HTML一式をダウンロード→展開→ダブルクリックでオフライン実施、CSV回収(デスクトップ専用) |
| D | **SLA Speech Tools 掲載** | コミュニティ | /research の Individual Tests から A へのリンク掲載 |

## 確定済みの設計判断(2026-07-02)

1. **TOEIC予測**: `data/conversion.js` のLJT-S素点レンジ表でTOEIC ListeningレンジとCEFR参考レベルを表示する。
2. **タイミング条件**: 研究者が timed / untimed を選ぶ現行方式を維持。公開ページのデフォルトは別途決定(Phase 5)。
3. **データ回収**: GAS + Google Sheet 自動保存 と メール通知を両立。公開ページの受験者データも Sheet に保存し、受験者は画面上で自分の結果を確認できる。
4. **PII**: 氏名フィールドは必須から外し、**匿名ID自動生成**を基本に。氏名入力は任意欄として残す。
5. **項目露出**: 40項目フォームの公開(正答キーのクライアント露出)をチームとして許容済み。
6. **ホスティング**: GitHub Pages(Ryuya-dot-com/LJT-S)+ sla-speech-tools.com からのリンク。iframe埋め込みはしない。
7. **音声**: WAV → モノラル 64–96kbps AAC(.m4a)へ圧縮(約10MB→1〜1.5MB)。

---

## Phase 1 — 基盤修正(データ喪失・記録の穴を塞ぐ)【最優先・全成果物の前提】

監査で確認済みの問題の修正。既存の timed/untimed ロジックと乱数化は変更しない(乱数化は500 IDシミュレーションで健全性確認済み)。

- [x] **完走後クラッシュ修正**: `completeSession` の `localStorage.removeItem`(js/app.js:623)を try/catch で保護(ストレージブロック環境での全データ喪失を防ぐ)
- [x] **試行ごとの永続化+再開**: `commitResponse` ごとに全試行行+設定+参加者IDを決定的キー(例 `ljts_partial_<participantId>`)で localStorage に保存し、再読み込み時に「前回の続きから再開しますか?」を表示
- [x] **離脱ガード**: 本試験中の `beforeunload` に確認ダイアログを追加
- [x] **CSV BOM付与**: Excel(Windows)での日本語 item_id 文字化け対策
- [x] **記録の拡充**: `audio_started` / `audio_ended` / 実測再生時間を出力行へ。`userAgent`・画面サイズ・ポインタ種別・iframe内か否かを sessionPayload へ(キーボード/タッチの層別に必須)
- [x] **参加者IDの正規化**: 大文字小文字で提示順序・キー配置が変わる問題(trim + lowercase で正規化し、生の入力値も記録)
- [x] **音声リトライの脱出口**: 同一ファイルの再生失敗N回で試行をスキップ(audio_error記録)+ `stalled` 監視のウォッチドッグ。`playing` / `timeupdate` で一時停止からの復帰も検知
- [x] **音声エラーの漏えい対策**: `abort` を再生失敗扱いせず、`audio_error` は実ファイル名を含まない汎用コードに正規化
- [x] **フォーカス/バックグラウンド対策**: 音声再生中・応答受付中の `blur` / `visibilitychange` を記録し、timed試行は無効化フラグを立てる(タイマー抑制・iframe内フォーカス喪失によるニセtimeout対策)
- [x] **beginTrialAudio の二重起動ガード**(fixation中の競合レース)
- [x] 音声再生中の早押しは破棄される仕様(listen-to-end)を維持し、指示文とREADMEに明記
- [x] **監査P0修正**: `beginTrialAudio` / `openResponseWindow` の翻訳関数シャドーイングを解消し、実ブラウザE2Eで4練習+40本試験の完走を確認

## Phase 2 — 音声パイプライン(圧縮・プリロード・モバイル対応)

- [x] **一括変換スクリプト**(ffmpeg): 44 WAV → モノラル 64–96kbps .m4a、`data/items.js` の `audio_path` / `audio_file` を更新。WAV原本はリポジトリ外(Dropbox/OSF)にマスターとして保管
- [x] **全ファイルプリロード**: 登録〜練習導入の間に44ファイルを進捗バー付きで読み込み(fetch不使用 — file://互換のため Audio 要素の `preload='auto'` で)
- [x] **単一Audio要素の再利用**: 「練習開始」タップで解錠した1要素の src を差し替える方式へ変更(iOS Safari の要素ごとautoplay制限と、タイムアウト試行直後のジェスチャー切れの両方を解決)
- [ ] 実機スモークテスト: iPhone Safari / Android Chrome / iPad(学校配備想定)

## Phase 3 — 参加者体験の刷新(日本語化・指示・結果表示)

- [x] **参加者向けUIの多言語化**(英語デフォルト+日本語トグル)。ボタンは「適切/Yes」「不適切/No」併記。研究者セットアップ画面は英語のまま
- [x] **課題説明の明確化**: 判断対象(文中の語の使われ方)を平易に説明し、適切例・不適切例を1つずつ提示するworked exampleを練習前に追加
- [x] **サウンドチェック画面**: 登録後にボタン押下でテスト音声を再生→「はっきり聞こえましたか?」確認(モバイルautoplay解錠のジェスチャーを兼ねる)
- [x] **事前開示**: 練習4問+本試験40問、所要約8–10分、timedの場合は制限時間(約2秒以内)があること、ヘッドフォン推奨、再読み込み禁止
- [x] **進捗表示**: 本試験中に「12 / 40」カウンター
- [x] **結果画面の刷新**: 素点(x/40・正答率)を即時表示。TOEIC ListeningレンジとCEFR参考レベルをLJT-S素点レンジ表から表示し、「公式スコアではなく参考推定値」の免責文言を必ず併記
- [x] タッチデバイス対応: `pointer: coarse` 検出時は指示文をボタン操作向けに切替、`.btn` に `touch-action: manipulation`
- [x] `take=1&research=1` の裏口をREADMEに文書化

## Phase 4 — データ収集基盤(GAS + Google Sheet + メール)

アーキテクチャ: チーム管理の中央GAS Webアプリ+Sheet。**研究者登録コード方式**(URLの `?rc=XXXX` → GAS内の非公開「codes」タブで研究者メールに解決)により、クライアントに宛先アドレスを一切持たせない(open relay 回避)。

- [x] **GAS `doPost`**: 全試行データ(JSON、`text/plain` でCORSプリフライト回避)をSheetへ追記。公開ページ経由は `rc=public` として同じSheetに保存(テンプレート実装済み、実デプロイ未実施)
- [x] **GAS競合対策**: `LockService` で `doPost` を保護し、trial行は一括 `setValues`、`sessions` / `trials` を別々に冪等性チェックして部分書き込みを補修可能にする。メール送信はロック外
- [x] **メール通知**: 研究者コード付きセッション完了時に要約(参加者ID・素点・タイムスタンプ)を研究者へ送信。Gmail無料枠(100通/日)を考慮し、即時/none を実装(digest は今後)
- [x] **受験者本人の結果確認**: 画面表示に加え、結果ID(セッションID)を発行し、任意入力のメールアドレスに本人宛の結果コピーを送信できるようにする(任意・未成年配慮のため既定はオフ)
- [x] **送信の堅牢化**: fire-and-forget + 失敗時の自動リトライ+**CSVダウンロードは安全網として常設**(無料枠消滅・学校フィルタ・ネットワーク断に備える)。no-corsは成功確認不可のためUI文言は「送信試行」、fetch解決後はlocalStorageキューからpayloadを削除
- [x] **研究者向けドキュメント**: コード発行手順、Sheetからの自分のデータ抽出方法(コード列でフィルタ)、GAS疎通確認手順
- [ ] **スクリーンショット付きセットアップ手引き**: 画像入り・15分想定の手順書へ拡張
- [ ] 学校ネットワーク(GIGAスクール環境)で script.google.com への到達性をパイロット確認

## Phase 5 — 公開版(同意・匿名化・公開モード)

- [x] **匿名ID自動生成**(例 `LJTS-ABCDEFGH`)を既定に。氏名は任意入力欄へ変更(CSV/Sheetでは空欄可)。学校・クラスコードも任意欄として用意
- [x] **同意・情報提供画面**(日本語、生徒にも読める平易さ): 何が記録されるか(回答・反応時間・端末情報)、どこに保存されるか(研究チームのSheet)、保持方針、任意参加の明示
- [x] **参加者向けCSV/JSONから項目メタデータを除去**: `correct_answer` / `target_word` / `base_id` / IRTパラメータは出力から外し、`item_id` / `audio_file` も中立連番へ置換。GAS送信用payloadは分析用メタデータを保持
- [x] **途中保存の項目メタデータ除去**: localStorage partial snapshot から正答・ターゲット語・元item/audio名を除去し、resume時に固定項目表から復元
- [x] **ルーティング設計**: ルートURL=公開受験モード(LexTale型)、`?research=1`=研究者セットアップ。公開モードのデフォルトタイミング条件(timed/untimed)をチームで決定
- [ ] **倫理承認**: 未成年のオンライン自己実施・Sheet保存をカバーする承認修正の要否を確認(**公開ローンチのゲート条件**)

## Phase 6 — Zip配布版

- [x] **`participant.html` を同梱**: 設定固定済みの参加者用エントリ(ダブルクリックで研究者セットアップが出る問題と、file:// URLに研究者マシンのパスが埋まる問題を解消)
- [x] `location.protocol === 'file:'` のとき「Generate participant URL」を非表示にし、説明文を表示
- [x] Zip版はオフライン・CSV回収を基本とし、ネットワークがあればGAS送信も動く(失敗しても無害)設計
- [x] **日英README同梱**: デスクトップ専用であること、実施手順、CSVの回収・取り扱い(実名を含む場合の注意)
- [x] **リリースzip生成スクリプト**
- [ ] GitHub Releases での配布(バージョンタグ)
- [x] **オフライン専用単一HTML版**: `START_HERE.html` にCSS/データ/実装を内包し、44本のM4Aだけをsidecarとして同梱。メール送信は無効化
- [x] **既存Zip互換パスの修復**: 0バイト音声とWAV混入を除去し、従来の `dist/LJT-S-online-20260701.zip` リンクも維持

## Phase 7 — リポジトリ整備・デプロイ

- [x] `Ryuya-dot-com/LJT-S` を作成し、現行オンライン版を公開
- [x] GitHub Pages 有効化(main / root)、HTTPS公開URL確定
- [ ] `LICENSE`(素材のライセンス方針: SLA Speech Tools は CC 準拠 — チームで決定)、`CITATION.cff`、OSFプロジェクトへの相互リンク
- [x] `APP_VERSION` の運用ルール(順序シードに影響するため、データ収集中はみだりに変えない)と、挙動識別用 `CODE_VERSION` を README に明記
- [x] テストページにはアナリティクスを入れない(LexTaleの轍を踏まない)

## Phase 8 — QA・パイロット

- [ ] デバイスマトリクス実機テスト: Windows Chrome/Edge(+Excel CSV開封)、macOS Safari、iPhone Safari、Android Chrome、学校配備 iPad/Chromebook
- [x] 乱数化シミュレーション(実施済みの500 ID検証)をリポジトリ内の再現スクリプトとして保存
- [ ] E2E: 模擬40人一斉受験でGAS/Sheet/メールの負荷・quota確認
- [ ] 小規模パイロット(数名の生徒/学生)→ 指示文の理解度確認 → 文言修正

## Phase 9 — SLA Speech Tools 掲載申請

- [ ] 掲載依頼: /submit のスクリーニングフォーム+Word資料を slaspeechtools@gmail.com へ(タイトル、2文サマリー、測定次元、対象L2/L1、著者、公開URL)。既存のLJTエントリ(Google Driveフォルダ)への追記として、チーム(Saito/Suzukida)に直接相談する方が早い可能性が高い
- [ ] 掲載文面: Web版URL+Zip版(GitHub Releases / Google Drive)の両方を案内

---

## マイルストーン

| マイルストーン | 含まれるPhase | ゲート条件 |
|---|---|---|
| **M1: 内部ベータ**(現行機能のまま堅牢化) | 1, 2 | 実機スモークテスト通過 |
| **M2: 研究者ベータ**(URL配布+Sheet集約が動く) | 3, 4, 6, 7 | GAS E2Eテスト通過、研究者ドキュメント完成 |
| **M3: 一般公開+掲載** | 5, 8, 9 | **倫理承認の確認**、TOEIC/CEFR換算表は実装済み |

## 外部依存(ブロッカーになり得るもの)

1. **TOEIC/CEFR換算表の最終承認**(小室先生側)— `data/conversion.js` のLJT-S素点レンジ表と免責文言を確認
2. **倫理承認の修正**(未成年のオンライン自己実施・Sheet保存)— **M3のハードゲート**
3. **SLA Speech Tools 側の掲載可否・掲載時期** — 先方委員会審査。M3と並行で申請
4. GAS/Gmail 無料枠の仕様変更 — CSVフォールバック常設で緩和済み
