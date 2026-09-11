import { Request, Response } from 'express';
import { param, query, body } from 'express-validator';
import { ProductService } from '../services/product.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { PRODUCT_CATEGORIES, ProductCategory } from '../models/Product';
import { SKIN_TYPES, SKIN_CONCERNS, SkinType, SkinConcern } from '../models/SkinProfile';

export const productIdValidator = [
  param('id').isMongoId().withMessage('Invalid product ID format'),
];

export const productCategoryValidator = [
  param('category')
    .isIn(PRODUCT_CATEGORIES)
    .withMessage(`Category must be one of: ${PRODUCT_CATEGORIES.join(', ')}`),
];

export const productSearchValidator = [
  query('q').trim().notEmpty().withMessage('Search query "q" is required'),
];

export const productFilterValidators = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().isIn(PRODUCT_CATEGORIES),
  query('skinType').optional().isIn(SKIN_TYPES),
  query('concern').optional().isIn(SKIN_CONCERNS),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('sortBy').optional().isIn(['price_asc', 'price_desc', 'rating_desc', 'newest', 'name_asc']),
];

export const createProductValidators = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('brand').trim().notEmpty().withMessage('Product brand is required'),
  body('category').isIn(PRODUCT_CATEGORIES).withMessage('Invalid product category'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('skinTypes').optional().isArray().withMessage('Skin types must be an array'),
  body('skinTypes.*').optional().isIn(SKIN_TYPES),
  body('concerns').optional().isArray().withMessage('Concerns must be an array'),
  body('concerns.*').optional().isIn(SKIN_CONCERNS),
];

export class ProductController {
  static getProducts = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 20,
      category: req.query.category as ProductCategory,
      skinType: req.query.skinType as SkinType,
      concern: req.query.concern as SkinConcern,
      brand: req.query.brand as string,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      search: (req.query.search as string) || (req.query.q as string),
      sortBy: req.query.sortBy as any,
    };

    const result = await ProductService.getProducts(filters);
    return ApiResponse.success(
      res,
      'Products retrieved successfully',
      result.products,
      200,
      result.pagination
    );
  });

  static searchProducts = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query.q as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const result = await ProductService.searchProducts(q, page, limit);
    return ApiResponse.success(
      res,
      `Products matching "${q}"`,
      result.products,
      200,
      result.pagination
    );
  });

  static getProductsByCategory = asyncHandler(async (req: Request, res: Response) => {
    const category = req.params.category as ProductCategory;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const result = await ProductService.getProductsByCategory(category, page, limit);
    return ApiResponse.success(
      res,
      `Products in category "${category}" retrieved successfully`,
      result.products,
      200,
      result.pagination
    );
  });

  static getProductById = asyncHandler(async (req: Request, res: Response) => {
    const product = await ProductService.getProductById(req.params.id as string);
    return ApiResponse.success(res, 'Product retrieved successfully', product, 200);
  });

  static createProduct = asyncHandler(async (req: Request, res: Response) => {
    const product = await ProductService.createProduct(req.body);
    return ApiResponse.success(res, 'Product created successfully', product, 201);
  });
}
