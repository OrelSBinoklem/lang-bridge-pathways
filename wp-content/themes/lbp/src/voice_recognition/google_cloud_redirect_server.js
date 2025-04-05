// server.js
const http = require('http');
const express = require('express');
const { SpeechClient } = require('@google-cloud/speech');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Функция для проверки JWT-токена через WP
async function verifyWpToken(token) {
  try {
    const response = await fetch('https://lbp.loc/wp-json/jwt-auth/v1/token/validate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.ok;
  } catch (error) {
    console.error('Ошибка проверки токена:', error);
    return false;
  }
}

// Инициализация клиента Google Cloud Speech-to-Text
const speechClient = new SpeechClient({
  // Замените на путь к вашему сервисному аккаунту ключа
  keyFilename: './latvieshu-reco-efbf06fcdbfd.json'
});

// Конфигурация для потокового распознавания с interimResults
const requestConfig = {
  config: {
    encoding: 'WEBM_OPUS',       // Формат аудио, отправляемого с клиента (audio/webm)
    sampleRateHertz: 16000,       // Частота дискретизации — должна совпадать с настройками клиента
    languageCode: 'lv-LV',        // Например: латышский ('lv-LV'); можно изменить на 'ru-RU', 'en-US' и т.д.
    enableAutomaticPunctuation: true,
    // Свойство singleUtterance не используется, чтобы не сбрасывать контекст между чанками
    singleUtterance: true
  },
  interimResults: true,           // Возвращать промежуточные результаты
};

wss.on('connection', async (ws, req) => {
  // Извлекаем JWT-токен из URL (?token=...)
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  /* Если нужна проверка:
  if (!token) {
    ws.close(1008, 'Требуется токен');
    return;
  }
  const isValid = await verifyWpToken(token);
  if (!isValid) {
    ws.close(1008, 'Неверный токен');
    return;
  }
  */
  console.log('Клиент авторизован.');

  // Переменные для хранения контекста распознавания для данного соединения
  let finalTranscript = '';
  let interimTranscript = '';

  // Создаем потоковое распознавание через Google Cloud Speech-to-Text API
  const recognizeStream = speechClient
    .streamingRecognize(requestConfig)
    .on('error', (error) => {
      console.error('Google Cloud Speech ошибка:', error);
    })
    .on('data', (data) => {
      console.log(data)
      if (data.results && data.results.length > 0) {
        data.results.forEach((result) => {
          const transcript = result.alternatives[0].transcript;
          if (result.isFinal) {
            finalTranscript += transcript + ' ';
            interimTranscript = '';
          } else {
            interimTranscript = transcript;
          }
        });
        // Объединяем окончательные и промежуточные результаты
        const combinedTranscript = finalTranscript + '<i>' + interimTranscript + '</i>';
        ws.send(combinedTranscript);
      }
    });

  // Получаем аудиочанки от клиента и передаем их в потоковое распознавание
  ws.on('message', (message) => {
    if (recognizeStream) {
      recognizeStream.write(message);
    }
  });

  ws.on('close', () => {
    console.log('Клиент отключился.');
    if (recognizeStream) {
      recognizeStream.end();
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
