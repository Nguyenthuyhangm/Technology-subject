package com.pricehawl.mapper;

import com.pricehawl.document.ProductDocument;
import com.pricehawl.entity.Product;
import org.springframework.stereotype.Component;

@Component
public class ProductDocumentMapper {

    public ProductDocument toDocument(Product product) {
        if (product == null) return null;

        ProductDocument doc = new ProductDocument();

        doc.setId(product.getId().toString());
        doc.setName(product.getName());

        // 🔥 thêm
        doc.setDescription(product.getDescription());
        doc.setImageUrl(product.getImageUrl());

        if (product.getCategory() != null) {
            doc.setCategoryName(product.getCategory().getName());
        }

        if (product.getBrand() != null) {
            doc.setBrandName(product.getBrand().getName());
        }

        return doc;
    }
}