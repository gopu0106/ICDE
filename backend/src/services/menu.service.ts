import { pool } from '../config/database';
import { logger } from '../config/logger';

export interface MenuItem {
  id: string;
  vendorId: string;
  itemCode: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  mealType?: string;
  isAvailable: boolean;
  imageUrl?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export class MenuService {
  /**
   * Get menu items for a vendor
   */
  async getVendorMenuItems(vendorId: string, isAvailable?: boolean): Promise<MenuItem[]> {
    let query = 'SELECT * FROM menu_items WHERE vendor_id = $1';
    const params: any[] = [vendorId];
    let paramIndex = 2;

    if (isAvailable !== undefined) {
      query += ` AND is_available = $${paramIndex}`;
      params.push(isAvailable);
      paramIndex++;
    }

    query += ' ORDER BY meal_type, category, name';

    const result = await pool.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      vendorId: row.vendor_id,
      itemCode: row.item_code,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      category: row.category,
      mealType: row.meal_type,
      isAvailable: row.is_available,
      imageUrl: row.image_url,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Get menu item by ID
   */
  async getMenuItemById(menuItemId: string): Promise<MenuItem | null> {
    const result = await pool.query('SELECT * FROM menu_items WHERE id = $1', [menuItemId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      vendorId: row.vendor_id,
      itemCode: row.item_code,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      category: row.category,
      mealType: row.meal_type,
      isAvailable: row.is_available,
      imageUrl: row.image_url,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Create menu item
   */
  async createMenuItem(item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<MenuItem> {
    const result = await pool.query(
      `INSERT INTO menu_items 
       (vendor_id, item_code, name, description, price, category, meal_type, 
        is_available, image_url, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        item.vendorId,
        item.itemCode,
        item.name,
        item.description,
        item.price,
        item.category,
        item.mealType,
        item.isAvailable ?? true,
        item.imageUrl,
        JSON.stringify(item.metadata || {}),
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      vendorId: row.vendor_id,
      itemCode: row.item_code,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      category: row.category,
      mealType: row.meal_type,
      isAvailable: row.is_available,
      imageUrl: row.image_url,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Update menu item
   */
  async updateMenuItem(
    menuItemId: string,
    updates: Partial<Omit<MenuItem, 'id' | 'vendorId' | 'createdAt' | 'updatedAt'>>
  ): Promise<MenuItem> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.price !== undefined) {
      fields.push(`price = $${paramIndex++}`);
      values.push(updates.price);
    }
    if (updates.category !== undefined) {
      fields.push(`category = $${paramIndex++}`);
      values.push(updates.category);
    }
    if (updates.mealType !== undefined) {
      fields.push(`meal_type = $${paramIndex++}`);
      values.push(updates.mealType);
    }
    if (updates.isAvailable !== undefined) {
      fields.push(`is_available = $${paramIndex++}`);
      values.push(updates.isAvailable);
    }
    if (updates.imageUrl !== undefined) {
      fields.push(`image_url = $${paramIndex++}`);
      values.push(updates.imageUrl);
    }
    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(menuItemId);

    const result = await pool.query(
      `UPDATE menu_items SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Menu item not found');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      vendorId: row.vendor_id,
      itemCode: row.item_code,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      category: row.category,
      mealType: row.meal_type,
      isAvailable: row.is_available,
      imageUrl: row.image_url,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Delete menu item
   */
  async deleteMenuItem(menuItemId: string): Promise<void> {
    const result = await pool.query('DELETE FROM menu_items WHERE id = $1', [menuItemId]);

    if (result.rowCount === 0) {
      throw new Error('Menu item not found');
    }
  }

  /**
   * Get menu items by meal type
   */
  async getMenuItemsByMealType(
    vendorId: string,
    mealType: string
  ): Promise<MenuItem[]> {
    const result = await pool.query(
      'SELECT * FROM menu_items WHERE vendor_id = $1 AND meal_type = $2 AND is_available = true ORDER BY name',
      [vendorId, mealType]
    );

    return result.rows.map((row) => ({
      id: row.id,
      vendorId: row.vendor_id,
      itemCode: row.item_code,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      category: row.category,
      mealType: row.meal_type,
      isAvailable: row.is_available,
      imageUrl: row.image_url,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}

export const menuService = new MenuService();



