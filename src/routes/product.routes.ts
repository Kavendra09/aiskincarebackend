import { Router } from 'express';
import {
  ProductController,
  productFilterValidators,
  productSearchValidator,
  productCategoryValidator,
  productIdValidator,
  createProductValidators,
} from '../controllers/product.controller';
import { validate } from '../middleware/validation';
import { protect } from '../middleware/auth';

const router = Router();

// Search and category routes before :id
router.get('/search', productSearchValidator, validate, ProductController.searchProducts);
router.get('/category/:category', productCategoryValidator, validate, ProductController.getProductsByCategory);

// Catalog list and detail
router.get('/', productFilterValidators, validate, ProductController.getProducts);
router.get('/:id', productIdValidator, validate, ProductController.getProductById);

// Admin/creation route
router.post('/', protect, createProductValidators, validate, ProductController.createProduct);

export default router;
