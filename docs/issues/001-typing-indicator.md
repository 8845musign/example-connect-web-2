# タイピングインジケーター機能

## 概要
ユーザーがメッセージを入力中であることをリアルタイムで他のユーザーに表示する機能を実装する。

## 背景
現在のチャットアプリケーションでは、他のユーザーがメッセージを入力しているかどうかが分からない。タイピングインジケーターを実装することで、より自然でインタラクティブなチャット体験を提供できる。

## 技術要件

### Protocol Buffers変更
```proto
// chat.proto に追加
message TypingEvent {
  string user_id = 1;
  string username = 2;
  bool is_typing = 3;
}

// ChatEventに追加
message ChatEvent {
  oneof event {
    // ... 既存のイベント
    TypingEvent typing = 6;
  }
}

// 新しいRPCメソッド
service ChatService {
  // ... 既存のメソッド
  rpc UpdateTyping(UpdateTypingRequest) returns (UpdateTypingResponse);
}

message UpdateTypingRequest {
  bool is_typing = 1;
}

message UpdateTypingResponse {
  bool success = 1;
}
```

### バックエンド実装
1. タイピング状態の管理
   - ユーザーごとのタイピング状態をメモリに保持
   - タイムアウト機能（5秒間更新がなければ自動的にfalseに）
   
2. UpdateTyping RPCの実装
   - タイピング状態の更新を受信
   - TypingEventをブロードキャスト

### フロントエンド実装
1. タイピング検出
   - MessageInputコンポーネントでのキー入力検出
   - debounce処理（300ms）で過剰な通信を防ぐ
   
2. タイピング表示
   - 「〇〇さんが入力中...」の表示
   - 複数人の場合は「〇〇さん、他1名が入力中...」

## 実装アプローチ

### Phase 1: プロトコル定義とバックエンド
1. chat.protoファイルの更新
2. `npm run generate`でコード生成
3. ChatManagerにタイピング状態管理機能を追加
4. UpdateTyping RPCメソッドの実装

### Phase 2: フロントエンド実装
1. chatClient.updateTyping()メソッドの追加
2. useChat hookでタイピングイベントのハンドリング
3. MessageInputコンポーネントでのタイピング検出
4. タイピングインジケーターUIコンポーネントの作成

### Phase 3: 最適化
1. debounce/throttle処理の調整
2. タイムアウト時間の調整
3. パフォーマンステスト

## 受け入れ基準
- [ ] ユーザーが入力を開始すると、他のユーザーに「入力中」が表示される
- [ ] 入力を停止して5秒経過すると自動的に表示が消える
- [ ] 複数ユーザーが同時に入力している場合、全員の状態が表示される
- [ ] ネットワーク負荷を考慮し、適切なdebounce処理が実装されている
- [ ] ユーザーが退室した場合、そのユーザーのタイピング状態が適切にクリアされる

## 注意事項
- プライバシーを考慮し、プライベートメッセージ機能を実装する場合は、タイピングインジケーターの表示範囲を制御する必要がある
- モバイル環境でのパフォーマンスに注意
- 大量のユーザーが同時に入力する場合のスケーラビリティを考慮

## 関連Issue
- #3 プライベートメッセージ機能（タイピングインジケーターの表示範囲制御）