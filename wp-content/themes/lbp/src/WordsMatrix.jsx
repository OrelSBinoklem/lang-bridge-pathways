import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

const WordsMatrix = ({ dictionaryId }) => {
  const canvasRef = useRef(null);
  const squaresRef = useRef([]); // Храним квадратики в useRef
  const [dictionaryWords, setDictionaryWords] = useState([]);
  const [hoveredWord, setHoveredWord] = useState(null); // Состояние для подсказки
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 }); // Позиция подсказки

  // Загрузка данных через AJAX
  useEffect(() => {
    const fetchWords = async () => {
      try {
        const formData = new FormData();
        formData.append("action", "get_dictionary_words");
        formData.append("dictionary_id", dictionaryId);

        const response = await axios.post(window.myajax.url, formData);

        if (response.data.success) {
          setDictionaryWords(response.data.data);
        } else {
          console.error("Ошибка получения слов:", response.data);
        }
      } catch (error) {
        console.error("Ошибка AJAX-запроса:", error);
      }
    };

    fetchWords();
  }, [dictionaryId]);

  // Обновление размеров и рисование
  useEffect(() => {
    const updateCanvasSize = () => {
      const canvas = canvasRef.current;
      const parent = canvas.parentElement;

      if (parent) {
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetWidth * 0.5; // Пример пропорции
      }
    };

    const drawMatrix = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const sizeWithGap = 8; // Общий размер с отступом
      const size = 7; // Размер квадрата
      const cols = Math.floor(canvas.width / sizeWithGap);

      // Очистка canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const squares = []; // Локальный массив для сохранения квадратиков

      dictionaryWords.forEach((wordObj, index) => {
        const x = (index % cols) * sizeWithGap;
        const y = Math.floor(index / cols) * sizeWithGap;

        // Сохраняем координаты квадратика
        squares.push({
          x,
          y,
          size,
          wordObj,
        });

        // Используем новые цвета
        ctx.fillStyle = wordObj.is_learned ? "lawngreen" : "darkgray";
        ctx.fillRect(x, y, size, size);

        /*ctx.strokeStyle = "black";
        ctx.strokeRect(x, y, size, size);*/
      });

      squaresRef.current = squares; // Сохраняем квадраты в ref
    };

    const handleResize = () => {
      updateCanvasSize();
      drawMatrix();
    };

    updateCanvasSize();
    if (dictionaryWords.length > 0) {
      drawMatrix();
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [dictionaryWords]);

  // Обработчик наведения мыши
  const handleMouseMove = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const hoveredSquare = squaresRef.current.find(
      (square) =>
        mouseX >= square.x &&
        mouseX < square.x + square.size &&
        mouseY >= square.y &&
        mouseY < square.y + square.size
    );

    if (hoveredSquare) {
      setHoveredWord(hoveredSquare.wordObj);
      setTooltipPosition({ x: mouseX + 10, y: mouseY + 10 });
    } else {
      setHoveredWord(null);
    }
  };

  return (
    <div className={'words-matrix'} style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        width={600}
        height={400}
      />
      {hoveredWord && (
        <div
          style={{
            position: "absolute",
            top: `${tooltipPosition.y}px`,
            left: `${tooltipPosition.x}px`,
            backgroundColor: "white",
            border: "1px solid black",
            padding: "5px",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <div className={'words-matrix__word'}>{hoveredWord.word}</div>
          {(hoveredWord.translation_1 && hoveredWord.translation_1 !== '0') && <div className={'words-matrix__translate'}>{hoveredWord.translation_1}</div>}
          {(hoveredWord.translation_2 && hoveredWord.translation_2 !== '0') && <div className={'words-matrix__translate'}>{hoveredWord.translation_2}</div>}
          {(hoveredWord.translation_3 && hoveredWord.translation_3 !== '0') && <div className={'words-matrix__translate'}>{hoveredWord.translation_3}</div>}
        </div>
      )}
    </div>
  );
};

export default WordsMatrix;