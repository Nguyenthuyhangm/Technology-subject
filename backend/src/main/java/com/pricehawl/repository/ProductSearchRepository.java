package com.pricehawl.repository;

import com.pricehawl.document.ProductDocument;
import org.springframework.data.elasticsearch.annotations.Query;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductSearchRepository
        extends ElasticsearchRepository<ProductDocument, String> {

    @Query("""
    {
      "multi_match": {
        "query": "?0",
        "fields": ["name", "nameNormalize", "categoryName", "brandName"],
        "fuzziness": "AUTO",
        "operator": "or",
        "type": "best_fields"
      }
    }
    """)
    List<ProductDocument> search(String keyword);
}