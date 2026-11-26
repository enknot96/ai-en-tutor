# ops: VPS 構築と運用の手順（下書き）

さくらの VPS（大阪・2GB・Ubuntu 24.04）に、`git push` で自動デプロイされる状態を作る手順です。
**下書きです。サーバーで実行する前に、各コマンドを読んで確認してください。**「要確認」は、実行前に公式で確かめる項目です。

## 構成

```
iPhone / PC ──HTTPS──> Nginx(80/443) ──> Next.js standalone (127.0.0.1:3000, systemd)
                                          └─ OpenAI Realtime には、ブラウザが直接つなぐ（音声は、サーバーを通らない）
GitHub Actions: build ─> rsync ─> /opt/ai-english-coach/releases/<sha> ─> current(symlink) ─> restart ─> health check
```

- 最初のデプロイでは **Postgres を入れない**（保存機能は、まだない）。
- Next.js は **ビルド済み**（`.next/standalone`、約 43MB）を送る。VPS で `pnpm install` や `pnpm build` はしない。

## 置き換える値

| 記号 | 意味 |
| --- | --- |
| `<VPS_IP>` | VPS の IPv4 アドレス |
| `coach.example.com` | 使うサブドメイン（`ops/nginx/ai-english-coach.conf` の `server_name`） |
| `admin` | 管理用ユーザー（sudo 可。自分の鍵でログイン） |
| `deploy` | CI 専用ユーザー（`systemctl restart` だけ sudo 可） |
| `coach` | アプリを動かすユーザー（ログイン不可） |

## 順序

### 1. 初期設定（I-1）
1. コントロールパネルで SSH 公開鍵を登録して契約する。**お試し期間の終了日を、`docs/ops-notes.md` に控える**。
2. 初回ログイン後、管理ユーザーを作る。

```bash
sudo adduser admin
sudo usermod -aG sudo admin
sudo install -d -m 700 -o admin -g admin /home/admin/.ssh
sudo cp ~/.ssh/authorized_keys /home/admin/.ssh/authorized_keys   # 公開鍵を引き継ぐ
sudo chown admin:admin /home/admin/.ssh/authorized_keys
```

3. **別のターミナルで** `ssh admin@<VPS_IP>` が通ることを確認してから、root とパスワードのログインを止める（締め出し防止のため、元のセッションは開いたままにする）。

```bash
sudo tee /etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
EOF
sudo sshd -t && sudo systemctl reload ssh
```

4. 更新と時刻。

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y unattended-upgrades
sudo timedatectl set-timezone Asia/Tokyo
```

完了条件：鍵だけで SSH でき、パスワードでは入れない。

### 2. ファイアウォールと swap（I-2）
**`ufw` を有効にする前に、必ず 22 番を許可する。**

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo apt install -y fail2ban
```

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf
sudo sysctl --system
free -m && df -h
```

- コントロールパネル側にも、パケットフィルタがあれば同様に設定する（要確認）。
- `free -m` の結果を、`docs/ops-notes.md` に記録する。

### 3. Node.js、ユーザー、ディレクトリ、systemd（I-4）
Node は **CI と同じメジャー（24）**にそろえる。

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x -o nodesource_setup.sh
less nodesource_setup.sh        # 中身を読んでから実行する（要確認：NodeSource の公式手順）
sudo -E bash nodesource_setup.sh
sudo apt install -y nodejs
node --version
```

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo useradd --system --shell /usr/sbin/nologin coach
sudo install -d -o deploy -g deploy /opt/ai-english-coach /opt/ai-english-coach/releases
```

環境変数のファイル（値は自分で入れる。**Git に入れない**）。

```bash
sudo install -m 640 -o root -g coach /dev/null /etc/ai-english-coach.env
sudoedit /etc/ai-english-coach.env      # 項目は ops/ai-english-coach.env.example を見る
```

systemd のユニット。

```bash
sudo cp ops/systemd/ai-english-coach.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ai-english-coach   # 起動は、最初のデプロイの後
```

`deploy` が、再起動だけ、パスワードなしでできるようにする。

```bash
sudo visudo -f /etc/sudoers.d/ai-english-coach
# 中身（1行）: deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart ai-english-coach
```

### 4. Nginx（I-3）
```bash
sudo apt install -y nginx
sudo cp ops/nginx/proxy-common.conf /etc/nginx/snippets/proxy-common.conf
sudo cp ops/nginx/ai-english-coach.conf /etc/nginx/sites-available/ai-english-coach
sudoedit /etc/nginx/sites-available/ai-english-coach     # server_name を自分のサブドメインにする
sudo ln -s /etc/nginx/sites-available/ai-english-coach /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 5. ドメインと HTTPS（I-6）
1. DNS で、サブドメインの **A レコード**を `<VPS_IP>` に向ける（TTL は短め）。反映に時間がかかるので、**早めに設定する**。
2. Certbot は、公式の案内どおり **snap** で入れる。

```bash
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/local/bin/certbot
sudo certbot --nginx
sudo certbot renew --dry-run
```

**注意**：本番（`NODE_ENV=production`）では、ログインの Cookie が `Secure` になる。**HTTPS が使えるまで、ログインは成功しない**。HTTP の IP アドレスでは、`/api/health` の確認までにする。

### 6. 外からの安全確認（I-7）
別のネットワーク（スマホの回線など）から、開いているポートが 22、80、443 だけであることを確認する。`:3000` に、外から繋がらないことも確認する。

### 7. 自動デプロイ（I-8）
1. **デプロイ専用の鍵**を、自分の PC で作る（パスフレーズなし。CI 用）。

```bash
ssh-keygen -t ed25519 -f ~/.ssh/ai-coach-deploy -C github-actions-deploy -N ""
```

2. 公開鍵を、VPS の `deploy` ユーザーの `authorized_keys` に登録する。
3. GitHub の Secrets に、3 つを登録する（秘密鍵は、**このリポジトリに置かない**）。

| Secret | 中身 |
| --- | --- |
| `SSH_PRIVATE_KEY` | `~/.ssh/ai-coach-deploy`（秘密鍵）の中身 |
| `SSH_KNOWN_HOSTS` | `ssh-keyscan -t ed25519 <VPS_IP>` の出力（**フィンガープリントを、コントロールパネルのものと照合**する） |
| `SSH_HOST` | `<VPS_IP>` |

4. `.github/workflows/deploy.yml` は、`main` への push と、手動実行（Actions 画面の「Run workflow」）で動く。**最初は、手動実行で試す**。
5. 失敗したときは、ワークフローが、自動で前のリリースに戻す（初回は、戻る先がない）。

## 記録（Git に入れない）

実際の IP アドレス、ドメイン、メモリの実測値、お試し期間の終了日は、**このファイルに書かない**。公開リポジトリに出さないため、`docs/ops-notes.md`（`.gitignore` 済み）に書く。

構築直後に記録する項目：`free -m`（アイドル時と会話中）、`df -h`、お試し期間の終了日、IP とドメイン、ポートの確認結果。

## 日常の確認

```bash
free -m
df -h
systemctl status ai-english-coach nginx
journalctl -u ai-english-coach -n 100
curl -fsS https://coach.example.com/api/health
```

## 手動での切り戻し

```bash
cd /opt/ai-english-coach
ls -1dt releases/*                              # 古いリリースを確認
ln -sfn releases/<前のsha> current
sudo systemctl restart ai-english-coach
```
