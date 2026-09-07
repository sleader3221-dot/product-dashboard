import { useState, useEffect } from 'react';
import { productApi } from '@/lib/api';

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productApi
      .getCategories()
      .then((data) => setCategories(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading };
}
