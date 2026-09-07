export function validateProductForm(data) {
  const errors = {};

  if (!data.title?.trim()) {
    errors.title = 'Product name is required';
  } else if (data.title.trim().length < 3) {
    errors.title = 'Product name must be at least 3 characters';
  }

  if (!data.category?.trim()) {
    errors.category = 'Category is required';
  }

  if (!data.price || isNaN(data.price)) {
    errors.price = 'Price must be a valid number';
  } else if (Number(data.price) <= 0) {
    errors.price = 'Price must be greater than 0';
  }

  if (data.stock === '' || data.stock === null || data.stock === undefined || isNaN(data.stock)) {
    errors.stock = 'Stock must be a valid number';
  } else if (Number(data.stock) < 0) {
    errors.stock = 'Stock cannot be negative';
  } else if (!Number.isInteger(Number(data.stock))) {
    errors.stock = 'Stock must be a whole number';
  }

  if (!data.thumbnail?.trim()) {
    errors.thumbnail = 'Image URL is required';
  } else {
    try {
      new URL(data.thumbnail);
    } catch {
      errors.thumbnail = 'Please enter a valid URL';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
