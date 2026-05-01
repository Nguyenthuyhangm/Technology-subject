// src/components/layout/CategoryMenu.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategoryTree } from '../../service/categoryApi';
import type { Category } from '../../service/categoryApi';
export const CategoryMenu: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategoryTree();
        setCategories(data);
      } catch (error) {
        console.error("Failed to fetch categories", error);
      }
    };
    fetchCategories();
  }, []);

  return (
    <div className="category-menu group relative">
      <button className="font-semibold py-2">Danh mục sản phẩm ▾</button>
      
      {/* Dropdown Menu */}
      <div className="absolute left-0 top-full hidden group-hover:block bg-white shadow-lg border rounded-md min-w-[250px] z-50">
        <ul className="py-2">
          {categories.map((cat) => (
             <li key={cat.id} className="px-4 py-2 hover:bg-gray-100 relative group/sub">
                <Link to={`/category/${cat.slug}`} className="block w-full">
                  {cat.name}
                </Link>
                
                {/* Render danh mục con nếu có */}
                {cat.children && cat.children.length > 0 && (
                  <ul className="absolute left-full top-0 hidden group-hover/sub:block bg-white shadow-lg border rounded-md min-w-[200px]">
                    {cat.children.map((child) => (
                      <li key={child.id} className="px-4 py-2 hover:bg-gray-100">
                        <Link to={`/category/${child.slug}`} className="block w-full">
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
             </li>
          ))}
        </ul>
      </div>
    </div>
  );
};