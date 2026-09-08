'use client';

import { useState, useEffect } from 'react';
import { productApi } from '@/lib/api';

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    productApi
      .getCategories()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(() => {
        // Fallback already handled gracefully by productApi.getCategories
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { categories, loading };
}
