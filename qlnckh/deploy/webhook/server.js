/**
 * GitHub Webhook Server cho Auto-Deploy
 *
 * Chức năng:
 * - Nhận POST request từ GitHub webhook
 * - Xác thực signature để đảm bảo request từ GitHub
 * - Chạy script deploy khi có push vào branch main
 *
 * Biến môi trường:
 * - WEBHOOK_SECRET: Secret key để xác thực (phải khớp với GitHub)
 * - WEBHOOK_PORT: Port lắng nghe (mặc định 9000)
 * - DEPLOY_SCRIPT: Đường dẫn đến script deploy
 */

const http = require('http');
const crypto = require('crypto');
const { exec, spawn } = require('child_process');
const fs = require('fs');

// Cấu hình
const PORT = process.env.WEBHOOK_PORT || 9000;
const SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret-change-me';
const DEPLOY_SCRIPT = process.env.DEPLOY_SCRIPT || '/app/auto-deploy.sh';
const LOG_FILE = '/app/logs/webhook.log';

// Đảm bảo thư mục logs tồn tại
const logDir = '/app/logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Ghi log với timestamp
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);

  // Ghi vào file log
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

/**
 * Xác thực GitHub signature
 * GitHub gửi header X-Hub-Signature-256 chứa HMAC-SHA256 của payload
 */
function verifySignature(payload, signature) {
  if (!signature) {
    log('ERROR: Không có signature trong request');
    return false;
  }

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex');

  // So sánh an toàn để tránh timing attack
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (e) {
    log(`ERROR: Lỗi khi xác thực signature: ${e.message}`);
    return false;
  }
}

/**
 * Chạy script deploy
 */
function runDeploy(eventData) {
  log(`Bắt đầu deploy cho commit: ${eventData.after?.substring(0, 7) || 'unknown'}`);
  log(`Pusher: ${eventData.pusher?.name || 'unknown'}`);
  log(`Message: ${eventData.head_commit?.message || 'unknown'}`);

  // Spawn process để chạy deploy script
  const deployProcess = spawn('bash', [DEPLOY_SCRIPT], {
    cwd: '/app',
    env: { ...process.env, GITHUB_EVENT: JSON.stringify(eventData) }
  });

  deployProcess.stdout.on('data', (data) => {
    log(`[DEPLOY] ${data.toString().trim()}`);
  });

  deployProcess.stderr.on('data', (data) => {
    log(`[DEPLOY ERROR] ${data.toString().trim()}`);
  });

  deployProcess.on('close', (code) => {
    if (code === 0) {
      log(`Deploy hoàn tất thành công!`);
    } else {
      log(`Deploy thất bại với exit code: ${code}`);
    }
  });

  deployProcess.on('error', (err) => {
    log(`ERROR: Không thể chạy deploy script: ${err.message}`);
  });
}

/**
 * Xử lý HTTP request
 */
function handleRequest(req, res) {
  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Chỉ chấp nhận POST request đến /webhook
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';

  req.on('data', (chunk) => {
    body += chunk.toString();

    // Giới hạn kích thước payload (1MB)
    if (body.length > 1024 * 1024) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Payload too large' }));
      req.destroy();
    }
  });

  req.on('end', () => {
    const signature = req.headers['x-hub-signature-256'];
    const event = req.headers['x-github-event'];
    const deliveryId = req.headers['x-github-delivery'];

    log(`Nhận webhook: event=${event}, delivery=${deliveryId}`);

    // Xác thực signature
    if (!verifySignature(body, signature)) {
      log('ERROR: Signature không hợp lệ - có thể là request giả mạo!');
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid signature' }));
      return;
    }

    // Parse payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      log(`ERROR: Không thể parse JSON payload: ${e.message}`);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    // Chỉ xử lý push event vào branch main
    if (event === 'push') {
      const branch = payload.ref?.replace('refs/heads/', '');

      if (branch === 'main' || branch === 'master') {
        log(`Push vào branch ${branch} - bắt đầu deploy...`);

        // Phản hồi ngay cho GitHub (không chờ deploy xong)
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          message: 'Deploy started',
          branch: branch,
          commit: payload.after?.substring(0, 7)
        }));

        // Chạy deploy trong background
        runDeploy(payload);
      } else {
        log(`Push vào branch ${branch} - bỏ qua (chỉ deploy cho main/master)`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Ignored - not main branch' }));
      }
    } else if (event === 'ping') {
      // GitHub gửi ping event khi tạo webhook mới
      log('Nhận ping từ GitHub - webhook đã được cấu hình thành công!');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Pong! Webhook configured successfully.' }));
    } else {
      log(`Event ${event} không được xử lý`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: `Event ${event} ignored` }));
    }
  });

  req.on('error', (err) => {
    log(`ERROR: Request error: ${err.message}`);
  });
}

// Tạo HTTP server
const server = http.createServer(handleRequest);

// Xử lý lỗi server
server.on('error', (err) => {
  log(`ERROR: Server error: ${err.message}`);
  process.exit(1);
});

// Khởi động server
server.listen(PORT, '0.0.0.0', () => {
  log(`===========================================`);
  log(`Webhook server đang chạy trên port ${PORT}`);
  log(`Endpoint: POST /webhook`);
  log(`Health check: GET /health`);
  log(`===========================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('Nhận SIGTERM - đang tắt server...');
  server.close(() => {
    log('Server đã tắt');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log('Nhận SIGINT - đang tắt server...');
  server.close(() => {
    log('Server đã tắt');
    process.exit(0);
  });
});
