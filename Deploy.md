# Cloudflare Pages へのデプロイ手順

## 1. 準備
- GitHubリポジトリにソースコードをプッシュしておきます。

## 2. Cloudflare ダッシュボードでの操作
1. Cloudflareにログインし、「Workers & Pages」を選択。
2. 「Create application」＞「Pages」＞「Connect to Git」を選択。
3. 対象のリポジトリを選択。
4. **Build settings** を以下のように設定：
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. 「Save and Deploy」をクリック。

## 3. 環境上の注意
- Peer.jsはデフォルトで公衆サーバーを利用します。商用や大規模利用の場合は、独自のPeerServerを構築し、`p2p.js`のオプションを変更してください。
- FirefoxでICEエラーが出る場合、多くは対称型NATやセキュリティ設定に起因します。本コードでは接続試行のタイムアウト処理を入れ、接続性を高めています。
