package com.pricehawl.document;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;

@Data
@Document(indexName = "products")
public class ProductDocument {

    @Id
    private String id;

    private String name;
    private String categoryName;
    private String brandName;
    private String description;
    private String imageUrl;
}