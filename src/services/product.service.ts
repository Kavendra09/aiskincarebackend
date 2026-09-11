import { Product, IProduct, ProductCategory } from '../models/Product';
import { SkinType, SkinConcern } from '../models/SkinProfile';
import { ApiError } from '../utils/apiError';

export interface IProductFilterQuery {
  page?: number;
  limit?: number;
  category?: ProductCategory;
  skinType?: SkinType;
  concern?: SkinConcern;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'rating_desc' | 'newest' | 'name_asc';
}

export class ProductService {
  static async getProducts(filters: IProductFilterQuery) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { isActive: true };

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.skinType) {
      query.skinTypes = filters.skinType;
    }

    if (filters.concern) {
      query.concerns = filters.concern;
    }

    if (filters.brand) {
      query.brand = new RegExp(filters.brand, 'i');
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      query.price = {};
      if (filters.minPrice !== undefined) query.price.$gte = filters.minPrice;
      if (filters.maxPrice !== undefined) query.price.$lte = filters.maxPrice;
    }

    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { name: searchRegex },
        { brand: searchRegex },
        { description: searchRegex },
        { ingredients: searchRegex },
      ];
    }

    // Sorting
    let sortOptions: Record<string, 1 | -1> = { createdAt: -1 };
    switch (filters.sortBy) {
      case 'price_asc':
        sortOptions = { price: 1 };
        break;
      case 'price_desc':
        sortOptions = { price: -1 };
        break;
      case 'rating_desc':
        sortOptions = { rating: -1 };
        break;
      case 'name_asc':
        sortOptions = { name: 1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    const [products, total] = await Promise.all([
      Product.find(query).sort(sortOptions).skip(skip).limit(limit),
      Product.countDocuments(query),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async searchProducts(searchTerm: string, page: number = 1, limit: number = 20) {
    return this.getProducts({ search: searchTerm, page, limit });
  }

  static async getProductsByCategory(category: ProductCategory, page: number = 1, limit: number = 20) {
    return this.getProducts({ category, page, limit });
  }

  static async getProductById(productId: string) {
    const product = await Product.findById(productId);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }
    return product;
  }

  static async createProduct(productData: Partial<IProduct>) {
    return await Product.create(productData);
  }
}
