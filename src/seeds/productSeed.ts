import mongoose from 'mongoose';
import { Product, IProduct } from '../models/Product';
import { connectDB, disconnectDB } from '../config/database';
import { logger } from '../utils/logger';

export const sampleProducts: Partial<IProduct>[] = [
  {
    name: 'Hydrating Facial Cleanser',
    brand: 'CeraVe',
    category: 'cleanser',
    description: 'Gentle, non-foaming lotion cleanser with 3 essential ceramides and hyaluronic acid to cleanse without disrupting the skin barrier.',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
    ingredients: ['Ceramides 1, 3, 6-II', 'Hyaluronic Acid', 'Glycerin', 'Water'],
    skinTypes: ['dry', 'normal', 'sensitive'],
    concerns: ['dryness', 'redness'],
    price: 15.99,
    currency: 'USD',
    purchaseUrl: 'https://www.cerave.com/skincare/cleansers/hydrating-facial-cleanser',
    rating: 4.8,
    isActive: true,
  },
  {
    name: 'Effaclar Purifying Foaming Gel',
    brand: 'La Roche-Posay',
    category: 'face-wash',
    description: 'Zinc PCA formulated foaming cleanser that gently purifies oily skin and controls excess sebum without over-drying.',
    image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=600&q=80',
    ingredients: ['Thermal Spring Water', 'Zinc PCA', 'Sodium Laureth Sulfate'],
    skinTypes: ['oily', 'combination'],
    concerns: ['acne', 'pimples', 'large-pores'],
    price: 19.99,
    currency: 'USD',
    purchaseUrl: 'https://www.laroche-posay.us/our-products/face/face-wash/effaclar-gel-facial-wash-for-oily-skin-3337872411083.html',
    rating: 4.7,
    isActive: true,
  },
  {
    name: 'Skin Perfecting 2% BHA Liquid Exfoliant',
    brand: "Paula's Choice",
    category: 'exfoliator',
    description: 'Cult-favorite leave-on exfoliant with salicylic acid that unclogs pores, smooths wrinkles, and evens out skin tone.',
    image: 'https://images.unsplash.com/photo-1608248597359-bb0d43703ee4?auto=format&fit=crop&w=600&q=80',
    ingredients: ['Salicylic Acid 2%', 'Green Tea Extract', 'Methylpropanediol'],
    skinTypes: ['oily', 'combination', 'normal'],
    concerns: ['blackheads', 'whiteheads', 'large-pores', 'uneven-skin-tone', 'acne'],
    price: 35.0,
    currency: 'USD',
    purchaseUrl: 'https://www.paulaschoice.com/skin-perfecting-2pct-bha-liquid-exfoliant/201.html',
    rating: 4.9,
    isActive: true,
  },
  {
    name: 'Niacinamide 10% + Zinc 1%',
    brand: 'The Ordinary',
    category: 'serum',
    description: 'High-strength vitamin and mineral blemish formula that reduces the appearance of skin blemishes, congestion, and sebum activity.',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80',
    ingredients: ['Niacinamide 10%', 'Zinc PCA 1%', 'Tamarindus Indica Seed Gum'],
    skinTypes: ['oily', 'combination', 'normal', 'dry', 'sensitive'],
    concerns: ['acne', 'pigmentation', 'dark-spots', 'large-pores', 'dull-skin'],
    price: 6.5,
    currency: 'USD',
    purchaseUrl: 'https://theordinary.com/en-us/niacinamide-10-zinc-1-serum-100436.html',
    rating: 4.6,
    isActive: true,
  },
  {
    name: 'Advanced Snail 96 Mucin Power Essence',
    brand: 'COSRX',
    category: 'serum',
    description: 'Enriched with 96% snail secretion filtrate to deeply hydrate, soothe damaged skin, and boost natural skin elasticity.',
    image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=600&q=80',
    ingredients: ['Snail Secretion Filtrate 96%', 'Sodium Hyaluronate', 'Panthenol', 'Allantoin'],
    skinTypes: ['dry', 'combination', 'normal', 'sensitive', 'oily'],
    concerns: ['dryness', 'dull-skin', 'redness', 'fine-lines'],
    price: 25.0,
    currency: 'USD',
    purchaseUrl: 'https://www.cosrx.com/products/advanced-snail-96-mucin-power-essence',
    rating: 4.8,
    isActive: true,
  },
  {
    name: 'Relief Sun : Rice + Probiotics SPF50+ PA++++',
    brand: 'Beauty of Joseon',
    category: 'sunscreen',
    description: 'Organic sunscreen with a lightweight and quick-absorbing creamy formula. Contains 30% rice extract and grain fermented probiotics.',
    image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=600&q=80',
    ingredients: ['Rice Extract 30%', 'Grain Fermented Probiotics', 'Niacinamide'],
    skinTypes: ['dry', 'combination', 'normal', 'sensitive', 'oily'],
    concerns: ['sun-tan', 'pigmentation', 'dark-spots', 'redness'],
    price: 18.0,
    currency: 'USD',
    purchaseUrl: 'https://beautyofjoseon.com/products/relief-sun-rice-probiotics',
    rating: 4.9,
    isActive: true,
  },
  {
    name: 'Hydro Boost Water Gel',
    brand: 'Neutrogena',
    category: 'moisturizer',
    description: 'Oil-free gel moisturizer that instantly quenches dry skin and keeps it smooth, supple, and hydrated day after day.',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
    ingredients: ['Hyaluronic Acid', 'Dimethicone', 'Glycerin'],
    skinTypes: ['oily', 'combination', 'normal'],
    concerns: ['dryness', 'dull-skin'],
    price: 23.49,
    currency: 'USD',
    purchaseUrl: 'https://www.neutrogena.com/products/skincare/neutrogena-hydro-boost-water-gel-with-hyaluronic-acid-for-dry-skin/6811047.html',
    rating: 4.6,
    isActive: true,
  },
  {
    name: 'Discoloration Correcting Serum',
    brand: 'Good Molecules',
    category: 'serum',
    description: 'Formulated with advanced tranexamic acid and niacinamide to improve the appearance of age spots, acne scars, and hyperpigmentation.',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80',
    ingredients: ['Tranexamic Acid Mesylate 3%', 'Niacinamide 4%', 'Glycerin'],
    skinTypes: ['oily', 'dry', 'combination', 'normal', 'sensitive'],
    concerns: ['dark-spots', 'pigmentation', 'uneven-skin-tone', 'sun-tan'],
    price: 12.0,
    currency: 'USD',
    purchaseUrl: 'https://www.goodmolecules.com/products/discoloration-correcting-serum',
    rating: 4.7,
    isActive: true,
  },
  {
    name: 'Lip Sleeping Mask - Berry',
    brand: 'Laneige',
    category: 'lip-care',
    description: 'Leave-on lip mask enriched with Vitamin C and Berry Fruit Complex that delivers intense moisture and antioxidants while you sleep.',
    image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=600&q=80',
    ingredients: ['Berry Fruit Complex', 'Vitamin C', 'Murumuru Seed Butter', 'Shea Butter'],
    skinTypes: ['dry', 'normal', 'combination', 'oily', 'sensitive'],
    concerns: ['dryness', 'dull-skin'],
    price: 24.0,
    currency: 'USD',
    purchaseUrl: 'https://us.laneige.com/products/lip-sleeping-mask',
    rating: 4.9,
    isActive: true,
  },
  {
    name: 'Madagascar Centella Ampoule',
    brand: 'Skin1004',
    category: 'treatment',
    description: '100% pure Centella Asiatica extract from Madagascar to instantly calm sensitive, irritated, and acne-prone skin.',
    image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=600&q=80',
    ingredients: ['Centella Asiatica Extract 100%'],
    skinTypes: ['sensitive', 'dry', 'oily', 'combination', 'normal'],
    concerns: ['redness', 'acne', 'pimples'],
    price: 16.5,
    currency: 'USD',
    purchaseUrl: 'https://skin1004.com/products/skin1004-madagascar-centella-ampoule',
    rating: 4.8,
    isActive: true,
  },
];

export const seedProducts = async () => {
  try {
    logger.info('Starting product seed...');
    await Product.deleteMany({});
    const created = await Product.insertMany(sampleProducts);
    logger.info(`Successfully seeded ${created.length} products!`);
    return created;
  } catch (error: any) {
    logger.error('Error seeding products:', error);
    throw error;
  }
};

// If run directly from terminal
if (require.main === module) {
  (async () => {
    await connectDB();
    await seedProducts();
    await disconnectDB();
    process.exit(0);
  })();
}
