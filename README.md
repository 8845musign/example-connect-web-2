# Connect RPC Chat Application

Connect RPC v2の双方向ストリーミング機能を使用したリアルタイムチャットアプリケーション

## 技術スタック

- **Backend**: Node.js, TypeScript, Connect RPC v2
- **Frontend**: React 18, React Router v7, TypeScript, Vite
- **Protocol**: Protocol Buffers v3, Buf

## 必要な環境

- Node.js v18以上
- npm v8以上

## セットアップ

```bash
# 1. 依存関係のインストール
npm run install:all

# 2. Protocol Buffersからコード生成
npm run generate

# 3. 開発サーバーの起動
npm run dev
```

開発サーバーが起動したら、ブラウザで http://localhost:5173 にアクセスしてください。

## プロジェクト構成

```
connect-web-2/
├── proto/              # Protocol Buffers定義
│   └── chat/v1/       # チャットサービス定義
├── backend/            # Node.jsバックエンド
│   ├── src/
│   │   ├── server.ts   # HTTPサーバー
│   │   ├── services/   # サービス実装
│   │   └── gen/        # 生成されたコード
│   └── package.json
├── frontend/           # Reactフロントエンド  
│   ├── src/
│   │   ├── routes/     # React Routerページ
│   │   ├── components/ # UIコンポーネント
│   │   ├── hooks/      # カスタムフック
│   │   ├── services/   # APIクライアント
│   │   └── gen/        # 生成されたコード
│   └── package.json
├── scripts/            # 開発用スクリプト
├── docs/              # ドキュメント
├── buf.yaml           # Buf設定
├── buf.gen.yaml       # コード生成設定
└── package.json       # ルートパッケージ
```

## 主な機能

- リアルタイムメッセージング
- ユーザー入退室通知
- オンラインユーザー一覧表示
- 双方向ストリーミング通信

## 開発コマンド

```bash
# 全体の開発サーバー起動
npm run dev

# コード生成（.protoファイル変更時）
npm run generate

# 依存関係のインストール
npm run install:all
```

## トラブルシューティング

### ポートが使用中の場合

- バックエンド: 8080ポート
- フロントエンド: 5173ポート

これらのポートが他のアプリケーションで使用されていないか確認してください。

### コード生成エラー

`npm run generate`でエラーが発生した場合：

1. Buf CLIがインストールされているか確認
2. proto/chat/v1/chat.protoファイルが存在するか確認
3. buf.yamlとbuf.gen.yamlが正しく設定されているか確認