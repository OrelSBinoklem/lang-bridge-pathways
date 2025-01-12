import { MicVAD } from '@ricky0123/vad-web';

class WhisperStrategy {
  #lang;
  #endpointUrl;
  #mediaRecorder = null;
  #vadInstance = null;

  #audioChunks = []; // Все накопленные чанки аудио
  #silenceDuration = 2000; // Максимальная длительность тишины
  #silenceStartTime = null; // Время начала тишины
  #silenceCount = 0; // Счётчик тишины (попыток)
  #maxAttempts = 3; // Максимальное количество попыток

  isListening = false;
  #isSending = false;

  constructor(lang = 'en', endpointUrl = '/wp-json/whisper/v1/upload') {
    this.#lang = lang;
    this.#endpointUrl = endpointUrl;
  }

  init() {
    console.log('WhisperStrategy init. Endpoint:', this.#endpointUrl);
  }

  async start(callback) {
    if (this.isListening) {
      console.warn('Уже запущено');
      return;
    }
    this.isListening = true;
    this.#silenceCount = 0;

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      console.error('Не удалось получить доступ к микрофону:', error);
      this.isListening = false;
      return;
    }

    this.#audioChunks = [];
    this.#mediaRecorder = new MediaRecorder(stream);

    // Сохраняем все чанки в общий массив
    this.#mediaRecorder.ondataavailable = (e) => {
      //console.log('e', e);
      if (e.data.size > 0) {
        this.#audioChunks.push(e.data);
      }
    };

    this.#mediaRecorder.start(100);

    this.#vadInstance = await MicVAD.new({
      onSpeechStart: () => {
        this.#silenceStartTime = null;
        console.log('VAD: Voice start');
      },
      onSpeechEnd: () => {
        console.log('VAD: Voice stop');

        this.#isSending = true;
        this.#silenceCount += 1;
        console.log(`Тишина #${this.#silenceCount}`);

        // Отправляем все накопленные данные
        this.sendAllAudio(callback).then(() => {
          this.#isSending = false;

          // Проверяем количество попыток
          if (this.#silenceCount >= this.#maxAttempts) {
            console.log('Достигнуто максимальное количество попыток. Останавливаем.');
            this.stop();
          }
        });

        if (!this.#silenceStartTime) {
          this.#silenceStartTime = Date.now();
        }
      },
      onFrameProcessed: (probabilities) => {
        const isVoice = probabilities.isSpeech > 0.5;

        if (!isVoice) {
          //console.log(this.#silenceStartTime, Date.now() - this.#silenceStartTime, this.#silenceDuration);
          if (
            this.#silenceStartTime &&
            Date.now() - this.#silenceStartTime > this.#silenceDuration
          ) {
            if(this.#isSending) {
              this.stop();
            } else {
              this.#isSending = true;
              this.sendAllAudio(callback).then(() => {
                this.#isSending = false;

                // Проверяем количество попыток
                if (this.#silenceCount >= this.#maxAttempts) {
                  console.log('Достигнуто максимальное количество попыток. Останавливаем.');
                  this.stop();
                }
              });
            }
          }
        }
      },
    });

    this.#vadInstance.start();
    console.log('WhisperStrategy started recording + VAD');
  }

  stop() {
    if (!this.isListening) return;

    if (this.#vadInstance) {
      this.#vadInstance.pause();
      this.#vadInstance = null;
    }
    if (this.#mediaRecorder && this.#mediaRecorder.state === 'recording') {
      this.#mediaRecorder.stop();
    }

    // Останавливаем все треки в потоке
    if (this.#mediaRecorder && this.#mediaRecorder.stream) {
      const tracks = this.#mediaRecorder.stream.getTracks();
      tracks.forEach(track => track.stop());
    }

    console.log('WhisperStrategy: manual stop called.');
    this.isListening = false;
  }

  /**
   * Отправляет все накопленные данные на сервер.
   */
  async sendAllAudio(callback) {
    console.log('sendAllAudio');
    if (this.#audioChunks.length === 0) return;

    const blob = new Blob(this.#audioChunks, { type: 'audio/wav' });

    try {
      const recognizedText = await this.sendToServer(blob);
      if (callback && typeof callback === 'function') {
        callback(recognizedText);
      }
    } catch (err) {
      console.error('Ошибка отправки на сервер:', err);
      if (callback && typeof callback === 'function') {
        callback('');
      }
    }
  }

  async sendToServer(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'chunk.wav');
    formData.append('language', this.#lang);

    const response = await fetch(this.#endpointUrl, {
      method: 'POST',
      body: formData,
    });

    console.log('response', response);

    if (!response.ok) {
      throw new Error(`WP server error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.recognizedText || '';
  }
}

export { WhisperStrategy };
