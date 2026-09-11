import mongoose, { Document, Model, Schema } from 'mongoose';
import { SKIN_TYPES, SkinType, SKIN_CONCERNS, SkinConcern } from './SkinProfile';

export const PRODUCT_CATEGORIES = [
  'cleanser',
  'face-wash',
  'moisturizer',
  'sunscreen',
  'serum',
  'toner',
  'exfoliator',
  'face-mask',
  'lip-care',
  'treatment',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface IProduct {
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  image: string;
  ingredients: string[];
  skinTypes: SkinType[];
  concerns: SkinConcern[];
  price: number;
  currency: string;
  purchaseUrl?: string;
  affiliateUrl?: string;
  rating?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductDocument extends IProduct, Document {}

const productSchema = new Schema<IProductDocument>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      required: [true, 'Product brand is required'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: {
        values: PRODUCT_CATEGORIES,
        message: '{VALUE} is not a valid product category',
      },
      required: [true, 'Product category is required'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    ingredients: [
      {
        type: String,
        trim: true,
      },
    ],
    skinTypes: [
      {
        type: String,
        enum: SKIN_TYPES,
        index: true,
      },
    ],
    concerns: [
      {
        type: String,
        enum: SKIN_CONCERNS,
        index: true,
      },
    ],
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
    },
    purchaseUrl: {
      type: String,
      trim: true,
    },
    affiliateUrl: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound text index for search across name, brand, description and ingredients
productSchema.index({ name: 'text', brand: 'text', description: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ skinTypes: 1, concerns: 1 });

export const Product: Model<IProductDocument> = mongoose.model<IProductDocument>(
  'Product',
  productSchema
);
