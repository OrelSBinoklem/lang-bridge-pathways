// useDictionary.js
import { useState, useEffect } from 'react';
import axios from 'axios';

const useDictionary = (dictionaryId) => {
  const [dictionary, setDictionary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDictionary = async () => {
      try {
        setLoading(true);
        const formData = new FormData();
        formData.append('action', 'get_dictionary');
        formData.append('dictionary_id', dictionaryId);

        const response = await axios.post(window.myajax.url, formData);

        if (response.data.success) {
          setDictionary(response.data.data);
          setError(null);
        } else {
          throw new Error(response.data.data?.message || 'Ошибка получения словаря');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (dictionaryId) {
      fetchDictionary();
    }
  }, [dictionaryId]);

  return { dictionary, loading, error };
};

export default useDictionary;
