'use client';

import Modal from '@/components/ui/Modal';
import ProductForm from './ProductForm';

/**
 * Accessible Product Modal Dialog (Add / Edit Product)
 * Wraps Modal and ProductForm to provide a cohesive dialog experience:
 * - Locks body scroll when active
 * - Accessible Escape key dismiss & backdrop click
 * - Inline form validation with clean error feedback
 */
export default function ProductModal({
  isOpen,
  onClose,
  product = null,
  categories = [],
  onSubmit,
}) {
  const isEditing = Boolean(product);
  const title = isEditing ? 'Edit Product' : 'Add New Product';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <ProductForm
        product={product}
        categories={categories}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}
