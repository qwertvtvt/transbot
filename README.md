# transbot

LINEのメッセージをDiscordチャンネルへ転送するBotです。

クラスLINEなど、普段見に行くのが面倒なLINEグループの連絡を、Discord Webhook経由で指定チャンネルへ流すために作っています。

## これで何が起きる？

LINEグループに投稿されたテキスト、画像、動画がDiscordの指定チャンネルに転送されます。

Discordでは、Webhookの投稿者名とアイコンをLINEプロフィールに合わせて表示します。そのため、Discordに参加していない人のLINE投稿も、LINE上の名前とアイコンに近い見た目で流れます。

このBotを入れたLINEグループのメッセージは、基本的にすべて転送対象になります。転送したくないグループにはBotを入れないでください。

本番のグループで使う前に、LINEの投稿がDiscordへ転送されることを参加者へ周知してください。

## 基本仕様

- LINE Messaging APIのWebhookを受け取ります。
- LINEのテキストメッセージをDiscordへ転送します。
- LINEの画像・動画を取得して`uploads/`に保存し、公開URLをDiscordへ転送します。
- 保存した画像・動画はDBに記録し、アップロードから30日経ったものを毎日削除します。
- Discord上の投稿者名は、LINEの表示名を使います。
- Discord上の投稿者アイコンは、LINEのプロフィール画像を使います。
- LINEプロフィールを取得できない場合、投稿者名は`Guest`になります。
- Discord転送時のメンションは無効化しています。
- スタンプなど、未対応のメッセージ種別は現在転送しません。
- LINEからDiscordへの一方向転送です。DiscordからLINEへの返信や、編集・削除の同期はしません。
- グループごとの転送ON/OFF設定はありません。Botが参加しているグループを転送対象として扱います。

## 構成

```txt
main.js              ExpressサーバーとWebhook処理
line.js              LINE APIクライアント
discord.js           Discord Webhookクライアント
knex.js              KnexのDB接続
knexfile.js          Knexの設定
config.example.json  設定ファイルの例
db/                  SQLite DB置き場
endpoints/           追加のExpressルート置き場
middleware/          ミドルウェア置き場
uploads/             LINEから取得した画像・動画の保存先
migrations/          DBマイグレーション
```

## セットアップ

依存パッケージをインストールします。

```bash
npm install
```

`config.example.json`を参考に、ローカル用の`config.json`を作ります。

```bash
cp config.example.json config.json
```

`config.json`には秘密情報を入れるため、Git管理しません。

DBを作成します。

```bash
npx knex migrate:latest
```

## 設定

`config.json`または環境変数で設定できます。

| 項目 | 環境変数 | 説明 |
| --- | --- | --- |
| `token` | `LINE_CHANNEL_ACCESS_TOKEN` | LINEのチャネルアクセストークン |
| `discordWebhookUrl` | `DISCORD_WEBHOOK_URL` | 転送先DiscordチャンネルのWebhook URL |
| `publicBaseUrl` | `PUBLIC_BASE_URL` | `uploads/`を外部から見るための公開URL |
| `authorId` | `LINE_ADMIN_USER_ID` | 起動通知を送るLINEユーザーID。空なら通知しません |
| `port` | `PORT` | Expressサーバーのポート |

例:

```json
{
    "token": "",
    "environment": "development",
    "basepath": "",
    "publicBaseUrl": "https://example.com/transfer",
    "discordWebhookUrl": "",
    "version": "LINE Transfer Bot v1.0.0",
    "port": 4000,
    "authorId": ""
}
```

## 起動

```bash
node main.js
```

起動後、LINE DevelopersのWebhook URLに以下のようなURLを設定します。

```txt
https://example.com/webhook
```

このアプリをサブパス配下で公開している場合は、環境に合わせてWebhook URLを設定してください。

## 運用前チェック

- LINEグループの参加者に、投稿がDiscordへ転送されることを伝える。
- 転送したくないLINEグループにBotが入っていないことを確認する。
- `publicBaseUrl`から`/uploads/...`の画像・動画へアクセスできることを確認する。
- Discord Webhook URLやLINEトークンをGitHubへ載せない。
- テスト用グループでテキスト、画像、動画を1回ずつ送って確認する。

## 画像・動画の公開URL

画像・動画はLINEから取得したあと、`uploads/`に保存されます。

Expressでは以下のパスで静的配信します。

```txt
/uploads
```

Discordへ送るURLは次の形です。

```txt
{publicBaseUrl}/uploads/{messageId}.{ext}
```

そのため、`publicBaseUrl`は外部からアクセスできるURLにしてください。

## 画像・動画の自動削除

画像・動画を保存すると、ファイル名と保存日時をSQLiteに記録します。

毎日0時に、保存から30日以上経ったファイルを`uploads/`から削除し、DBの記録も削除します。

DBファイルは`db/uploads.db`です。実行時データなのでGit管理しません。

## FAQ

### LINEで送った人はDiscordでは誰として表示される？

Discord Webhookの投稿者名とアイコンを、LINEのプロフィール情報から生成します。

そのため、Discord上では「Discordアカウント」ではなく「LINEの表示名・LINEのアイコン」っぽく見えます。

### Discordに入っていない人のLINEメッセージも転送される？

はい。LINEグループにBotが参加していて、そのメッセージをWebhookで受け取れる場合は、Discordに参加していない人のメッセージも転送されます。

本番のグループで使う前に、転送されることを参加者へ周知してください。

### 友だち追加していない人の名前やアイコンは取れる？

グループメンバーのプロフィール取得を試します。取得できない場合は、名前を`Guest`として扱います。

### スタンプは転送される？

現時点では未対応です。スタンプが送られてもBotは壊れませんが、Discordへは転送しません。

### LINEの画像がDiscordで読めないことがある？

LINEの画像URLをそのまま転送しているわけではなく、Botが一度画像・動画を取得して`uploads/`に保存し、その公開URLをDiscordへ送っています。

画像が表示できない場合は、`publicBaseUrl`、リバースプロキシ、`/uploads`の静的配信設定を確認してください。

## 注意

- `config.json`や`.env`には秘密情報が入るため、公開しないでください。
- Discord Webhook URLは知っている人なら投稿できるため、漏れたら再発行してください。
- LINEのチャネルアクセストークンが漏れた場合も、LINE Developersから再発行してください。
