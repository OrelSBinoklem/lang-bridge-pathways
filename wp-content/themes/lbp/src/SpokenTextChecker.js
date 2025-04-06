const {GoogleStrategy} = require('./voice_recognition/GoogleStrategy');
const {WhisperStrategy} = require('./voice_recognition/WhisperStrategy');
const {GoogleCloudStrategy} = require('./voice_recognition/GoogleCloudStrategy');
import { diffChars } from 'diff';

class SpokenTextChecker {
  #text;
  #lang;
  #strategy;
  #progressCallback;
  constructor(text, lang, strategy, openaiApiKey, progressCallback) {
    const socketUrl = 'ws://localhost:3000';

    this.#text = text;
    this.#lang = lang;
    this.#strategy = strategy === 'google' ? new GoogleStrategy(lang) : strategy === 'google-cloud' ? new GoogleCloudStrategy(lang, socketUrl) : new WhisperStrategy(lang, openaiApiKey);
    this.#progressCallback = progressCallback;
  }

  async checkRun() {
    return await new Promise((resolve) => {
      this.#strategy.start((recognizedText) => {
        this.#progressCallback(recognizedText);

        let isCompleted = this.compareWithThreshold(recognizedText, this.#text);

        console.log(isCompleted);

        if(isCompleted) {
          this.#strategy.stop();
          resolve(true);
        }

        if (recognizedText.length > this.#text.length * 2) {
          this.#strategy.stop();
          resolve(false);
        }
      });
    });


  }

  compareWithThreshold(recognizedText, referenceText, threshold = 0.8) {
    const diffs = diffChars(referenceText.toLowerCase(), recognizedText.toLowerCase());
    let totalLength = referenceText.length;
    let changes = 0;

    // Подсчет изменений (вставки, удаления, замены)
    diffs.forEach(part => {
      if (part.added || part.removed) {
        changes += part.value.length; // Количество измененных символов
      }
    });

    // Вычисляем процент изменений
    //console.log(changes, totalLength);
    const similarity = 1 - (changes / totalLength);

    // Проверка, превышает ли процент схожести порог
    return similarity >= threshold;
  }
}

export {SpokenTextChecker}