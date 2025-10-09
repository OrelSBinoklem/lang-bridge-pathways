import React, { useEffect, useRef, useState } from "react";

const WordsMatrix = ({ 
  dictionaryId,
  dictionaryWords = [],
  loadingDictionaryWords = false,
  userWordsData = {},
  loadingUserData = false
}) => {
  const canvasRef = useRef(null);
  const squaresRef = useRef([]); // Храним квадратики в useRef
  const [hoveredWord, setHoveredWord] = useState(null); // Состояние для подсказки
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 }); // Позиция подсказки

  // Функция для получения данных пользователя для конкретного слова
  const getUserWordData = (wordId) => {
    return userWordsData[wordId] || null;
  };

  // Функция для проверки, изучено ли слово
  const isWordLearned = (wordId) => {
    const userData = getUserWordData(wordId);
    if(userData) {
      console.log(userData)
    }

    return userData ? 
      (userData.correct_attempts >= 2 && userData.correct_attempts_revert >= 2) : 
      false;
  };

  // Обновление размеров и рисование
  useEffect(() => {
    // Функция для инициализации canvas с повторными попытками
    const initializeCanvas = () => {
      if (!canvasRef.current) {
        setTimeout(initializeCanvas, 50);
        return;
      }

      const canvas = canvasRef.current;

      const updateCanvasSize = () => {
        if (!canvas) return;
        
        const parent = canvas.parentElement;

        if (parent) {
          canvas.width = parent.offsetWidth;
          canvas.height = parent.offsetWidth * 0.5; // Пример пропорции
        }
      };

      const drawMatrix = () => {
        if (!canvas) return;
        
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
          
          // Проверяем статус изучения слова
          const isLearned = isWordLearned(wordObj.id);

          // Сохраняем координаты квадратика
          squares.push({
            x,
            y,
            size,
            wordObj: {
              ...wordObj,
              is_learned: isLearned
            },
          });

         // Используем новые цвета
         ctx.fillStyle = isLearned ? "#32cd32" : "darkgray";
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

      // Инициализация
      updateCanvasSize();
      if (dictionaryWords.length > 0) {
        drawMatrix();
      }

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    };

    // Запускаем инициализацию
    const cleanup = initializeCanvas();
    
    return cleanup;
  }, [dictionaryWords, userWordsData]);

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

  if (loadingDictionaryWords) {
    return <div>Загрузка матрицы слов...</div>;
  }

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