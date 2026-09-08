export function validateProductForm(data) {
  const errors = {};

  // 1. Title: Required, trimmed length >= 3 characters
  const rawTitle = data?.title !== undefined && data?.title !== null ? String(data.title) : '';
  const trimmedTitle = rawTitle.trim();
  if (!trimmedTitle) {
    errors.title = 'Product name is required';
  } else if (trimmedTitle.length < 3) {
    errors.title = 'Product name must be at least 3 characters';
  }

  // 2. Category: Required
  const rawCategory = data?.category !== undefined && data?.category !== null ? String(data.category) : '';
  const trimmedCategory = rawCategory.trim();
  if (!trimmedCategory || trimmedCategory === 'all') {
    errors.category = 'Category is required';
  }

  // 3. Price: Must be a valid positive number (> 0)
  if (data?.price === '' || data?.price === null || data?.price === undefined) {
    errors.price = 'Price is required';
  } else {
    const numPrice = Number(data.price);
    if (isNaN(numPrice)) {
      errors.price = 'Price must be a valid number';
    } else if (numPrice <= 0) {
      errors.price = 'Price must be greater than 0';
    }
  }

  // 4. Stock: Must be a non-negative integer (>= 0 and Number.isInteger)
  if (data?.stock === '' || data?.stock === null || data?.stock === undefined) {
    errors.stock = 'Stock is required';
  } else {
    const numStock = Number(data.stock);
    if (isNaN(numStock)) {
      errors.stock = 'Stock must be a valid number';
    } else if (numStock < 0) {
      errors.stock = 'Stock cannot be negative';
    } else if (!Number.isInteger(numStock)) {
      errors.stock = 'Stock must be a whole number (no decimals)';
    }
  }

  // 5. Thumbnail: Must be a valid HTTP/HTTPS URL pattern
  const rawThumb = data?.thumbnail !== undefined && data?.thumbnail !== null ? String(data.thumbnail) : '';
  const trimmedThumb = rawThumb.trim();
  if (!trimmedThumb) {
    errors.thumbnail = 'Image URL is required';
  } else {
    try {
      const parsedUrl = new URL(trimmedThumb);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        errors.thumbnail = 'Image URL must start with http:// or https://';
      }
    } catch {
      errors.thumbnail = 'Please enter a valid HTTP/HTTPS URL';
    }
  }

  // 6. Cost Price: Optional, but if provided must be a valid non-negative number
  if (data?.costPrice !== undefined && data?.costPrice !== null && data?.costPrice !== '') {
    const numCost = Number(data.costPrice);
    if (isNaN(numCost)) {
      errors.costPrice = 'Cost price must be a valid number';
    } else if (numCost < 0) {
      errors.costPrice = 'Cost price cannot be negative';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
