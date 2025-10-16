# 📁 Управление категориями в словаре

Система для создания, редактирования и удаления категорий с поддержкой двухуровневой вложенности.

## 🚀 Быстрый старт

### 1. Подключение PHP обработчиков

Добавьте в `functions.php` или в отдельный файл:

```php
// Подключение AJAX обработчиков для управления категориями
require_once get_template_directory() . '/system/ajax/category-management.php';
```

### 2. Использование в React компоненте

```jsx
import DictionaryCategoryManagement from '../components/DictionaryCategoryManagement';

const MyDictionaryPage = ({ dictionaryId, dictionaryName }) => {
  return (
    <div>
      <h1>{dictionaryName}</h1>
      
      {/* Управление категориями */}
      <DictionaryCategoryManagement
        dictionaryId={dictionaryId}
        dictionaryName={dictionaryName}
      />
      
      {/* Ваш обычный контент */}
    </div>
  );
};
```

## 📋 Возможности

### ✅ Создание категорий
- **Корневые категории** (1-й уровень)
- **Вложенные категории** (2-й уровень)
- **Поле order** для сортировки
- **Описание** категории

### ✏️ Редактирование
- Изменение названия
- Смена родительской категории
- Изменение порядка сортировки
- Редактирование описания

### 🗑️ Удаление
- Безопасное удаление с перемещением слов
- Автоматическое перемещение дочерних категорий в корень
- Подтверждение перед удалением

## 🎯 API

### CategoryManager

```jsx
<CategoryManager
  dictionaryId={number}           // ID словаря (обязательно)
  categories={array}              // Массив существующих категорий
  onCategoriesUpdate={function}   // Колбэк обновления списка
  showEditButton={boolean}       // Показывать кнопки редактирования
/>
```

### DictionaryCategoryManagement

```jsx
<DictionaryCategoryManagement
  dictionaryId={number}           // ID словаря (обязательно)
  dictionaryName={string}        // Название словаря
/>
```

## 🗄️ Структура базы данных

### Таблица `wp_lbp_categories`

```sql
CREATE TABLE wp_lbp_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  dictionary_id INT NOT NULL,
  category_name VARCHAR(255) NOT NULL,
  parent_id INT NULL,
  order INT DEFAULT 0,
  description TEXT NULL,
  created_at DATETIME,
  updated_at DATETIME,
  
  FOREIGN KEY (dictionary_id) REFERENCES wp_lbp_dictionaries(id),
  FOREIGN KEY (parent_id) REFERENCES wp_lbp_categories(id)
);
```

## 🔧 AJAX Endpoints

### Создание категории
```
POST /wp-admin/admin-ajax.php?action=create_category
```

**Параметры:**
- `dictionary_id` - ID словаря
- `name` - Название категории
- `parent_id` - ID родительской категории (опционально)
- `order` - Порядок сортировки
- `description` - Описание категории

### Обновление категории
```
POST /wp-admin/admin-ajax.php?action=update_category
```

**Параметры:**
- `category_id` - ID категории
- `name` - Новое название
- `parent_id` - Новый родитель
- `order` - Новый порядок
- `description` - Новое описание

### Удаление категории
```
POST /wp-admin/admin-ajax.php?action=delete_category
```

**Параметры:**
- `category_id` - ID категории

### Получение списка категорий
```
POST /wp-admin/admin-ajax.php?action=get_categories
```

**Параметры:**
- `dictionary_id` - ID словаря

## 🎨 Стилизация

Компонент использует встроенные стили, но вы можете переопределить их:

```css
.category-manager {
  /* Стили для основного контейнера */
}

.category-item {
  /* Стили для элемента категории */
}

.word-field-vertical {
  /* Стили для вертикального режима */
}
```

## 🔒 Права доступа

- **Создание/редактирование/удаление** - только для администраторов (`manage_options`)
- **Просмотр** - доступно всем пользователям
- Проверка прав: `current_user_can('manage_options')`

## 🚨 Безопасность

- ✅ **Санитизация** всех входных данных
- ✅ **Валидация** на сервере
- ✅ **Проверка прав** доступа
- ✅ **Защита от циклических зависимостей**
- ✅ **Безопасное удаление** с перемещением данных

## 📝 Примеры использования

### Простое использование

```jsx
import DictionaryCategoryManagement from '../components/DictionaryCategoryManagement';

const MyPage = () => (
  <DictionaryCategoryManagement
    dictionaryId={6}
    dictionaryName="Мой словарь"
  />
);
```

### С переключателем

```jsx
import React, { useState } from 'react';
import DictionaryCategoryManagement from '../components/DictionaryCategoryManagement';

const MyPage = ({ dictionaryId, dictionaryName }) => {
  const [showManagement, setShowManagement] = useState(false);

  return (
    <div>
      <button onClick={() => setShowManagement(!showManagement)}>
        {showManagement ? 'Скрыть' : 'Показать'} управление
      </button>
      
      {showManagement && (
        <DictionaryCategoryManagement
          dictionaryId={dictionaryId}
          dictionaryName={dictionaryName}
        />
      )}
    </div>
  );
};
```

## 🐛 Отладка

Включите логирование в консоли браузера для отладки:

```javascript
// В консоли браузера
console.log('Categories:', categories);
console.log('Dictionary ID:', dictionaryId);
```

## 📞 Поддержка

При возникновении проблем проверьте:

1. **Права доступа** - убедитесь что пользователь администратор
2. **AJAX обработчики** - подключены ли PHP файлы
3. **База данных** - существует ли таблица `wp_lbp_categories`
4. **Консоль браузера** - есть ли ошибки JavaScript
