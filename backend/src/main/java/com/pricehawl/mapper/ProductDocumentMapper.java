package com.pricehawl.mapper;

import com.pricehawl.document.ProductDocument;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.util.VietnameseNormalizer;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;

@Component
public class ProductDocumentMapper {

    public ProductDocument toDocument(Product product) {

        if (product == null) {
            return null;
        }

        ProductDocument doc = new ProductDocument();

        doc.setId(product.getId().toString());

        doc.setName(product.getName());

        doc.setNameNormalize(VietnameseNormalizer.normalize(product.getName()));

        doc.setDescription(product.getDescription());

        doc.setImageUrl(product.getImageUrl());

        if (product.getCategory() != null) {
            doc.setCategoryName(product.getCategory().getName());
        }

        if (product.getBrand() != null) {
            doc.setBrandName(product.getBrand().getName());
        }

        /**
         * ===== FIND BEST LISTING =====
         */
        List<ProductListing> listings = product.getListings();

        if (listings != null && !listings.isEmpty()) {

            ProductListing best = listings.stream()

                    .filter(l -> l.getCurrentPrice() != null)

                    .min(Comparator.comparing(ProductListing::getCurrentPrice))

                    .orElse(null);

            if (best != null) {

                doc.setBestPrice(best.getCurrentPrice());

                doc.setOriginalPrice(best.getOriginalPrice());

                doc.setBestPlatform(best.getPlatformName());

                doc.setInStock(best.getInStock());

                doc.setIsFlashSale(best.getIsFlashSale());

                doc.setPromotionLabel(best.getPromotionLabel());

                if (best.getDiscountPct() != null) {
                    doc.setDiscountPct(
                            best.getDiscountPct().intValue()
                    );
                }
            }
        }

        /**
         * Optional search score default
         */
        doc.setScore(0.0);

        return doc;
    }
}